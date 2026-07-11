import Habit from '../habits/habit.model.js';
import User from '../users/user.model.js';
import { sendStreakReminderEmail } from '../mail/mail.service.js';
import config from '../../../config.js';
import { isCompletedForPeriod, isPreviousPeriod, previousPeriodMarker, isDueToday } from '../habits/habit.service.js';
import {
    hasPremiumAccess,
    STREAK_REPAIR_WINDOW_DAYS,
} from '../../config/plans.js';

export const STREAK_FREEZE_ERROR_CODES = {
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    HABIT_NOT_FOUND: 'HABIT_NOT_FOUND',
    NOT_AT_RISK: 'NOT_AT_RISK',
    NO_SHIELDS: 'NO_SHIELDS',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STREAK_REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;

/* Returns a copy of the date set to local midnight. */
function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}

/* Formats a date as a YYYY-MM-DD key. */
function toDateKey(date) {
    const value = new Date(date);
    return [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, '0'),
        String(value.getDate()).padStart(2, '0'),
    ].join('-');
}

/* Returns the whole-day difference between two dates. */
function daysBetween(a, b) {
    return Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS);
}

/* Returns the end-of-day deadline at the end of the streak-repair grace window. */
function graceDeadline(now) {
    const deadline = startOfDay(now);
    deadline.setDate(deadline.getDate() + STREAK_REPAIR_WINDOW_DAYS);
    deadline.setHours(23, 59, 59, 999);
    return deadline;
}

/* Returns the last moment (23:59:59.999) of yesterday. */
function endOfYesterday(now) {
    const value = startOfDay(now);
    value.setDate(value.getDate() - 1);
    value.setHours(23, 59, 59, 999);
    return value;
}

/* Returns whether the user has email notifications and the given preference both enabled. */
function canSendNotificationEmail(user, preferenceKey) {
    const preferences = user?.notificationPreferences ?? {};

    return preferences.emailEnabled === true && preferences[preferenceKey] === true;
}

/* Returns whether a reminder was already sent for the user's current repair deadline. */
function hasReminderAlreadyBeenSent(user) {
    const sentFor = user.streakReminderEmailLastSentFor;
    const deadline = user.streakRepairDeadline;

    return sentFor && deadline && sentFor.getTime() === deadline.getTime();
}

/* Formats a repair deadline as a human-readable date/time for reminder emails. */
function formatReminderDeadline(deadline) {
    return new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(deadline);
}
/* Builds an Error carrying a streak-freeze error code. */
function streakFreezeError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

/* Returns whether a habit has an active streak that is due but not yet completed for the current period. */
function isHabitStreakAtRisk(habit) {
    if ((habit.streakCount ?? 0) <= 0) return false;
    return !isCompletedForPeriod(habit) && !isPreviousPeriod(habit, habit.lastCompletedAt);
}

/* Returns whether the user's overall streak has lapsed (a full day missed). */
function isOverallStreakMissed(user, now) {
    if ((user.streak ?? 0) <= 0) return false;
    return !user.streakLastDay || daysBetween(now, user.streakLastDay) >= 2;
}

/* Returns whether the user still has a habit due today that is neither completed nor covered by the previous period. */
async function hasUnmetDueHabit(userId) {
    const habits = await Habit.find({ ownerId: userId, deletedAt: null, source: { $ne: 'challenge' } })
        .select('frequency lastCompletedAt customDays');
    return habits.some((habit) =>
        isDueToday(habit)
        && !isCompletedForPeriod(habit)
        && !isPreviousPeriod(habit, habit.lastCompletedAt));
}

/* Marks each at-risk habit as completed for the previous period so its streak survives, returning how many were bridged. */
async function bridgeAtRiskHabits(userId, now) {
    const habits = await Habit.find({ ownerId: userId, streakCount: { $gt: 0 } });
    let bridged = 0;
    for (const habit of habits) {
        if (isHabitStreakAtRisk(habit)) {
            habit.lastCompletedAt = previousPeriodMarker(habit, now);
            habit.streakRepairDeadline = null;
            await habit.save();
            bridged += 1;
        }
    }
    return bridged;
}

/* Grants one streak shield to each premium/admin user once per calendar month. */
export async function grantMonthlyShields(now = new Date()) {
    const users = await User.find({
        isDeleted: false,
        $or: [{ isPremium: true }, { role: 'admin' }],
    }).select('role isPremium streakShields streakShieldsLastGrantedAt');

    let granted = 0;
    for (const user of users) {
        if (!hasPremiumAccess(user)) continue;

        const last = user.streakShieldsLastGrantedAt;
        const alreadyThisMonth = last
            && last.getFullYear() === now.getFullYear()
            && last.getMonth() === now.getMonth();
        if (alreadyThisMonth) continue;

        user.streakShields = (user.streakShields ?? 0) + 1;
        granted += 1;
        user.streakShieldsLastGrantedAt = now;
        await user.save();
    }

    return { granted };
}

/* Daily job: opens grace windows, auto-spends shields, rescues rest days, and breaks lapsed habit and overall streaks. */
export async function runDailyStreakMaintenance(now = new Date()) {
    const habits = await Habit.find({ streakCount: { $gt: 0 } });

    let habitsOpened = 0;
    let habitsBroken = 0;
    for (const habit of habits) {
        if (!isHabitStreakAtRisk(habit)) {
            if (habit.streakRepairDeadline) {
                habit.streakRepairDeadline = null;
                await habit.save();
            }
            continue;
        }

        if (!habit.streakRepairDeadline) {
            habit.streakRepairDeadline = graceDeadline(now);
            await habit.save();
            habitsOpened += 1;
        } else if (now > habit.streakRepairDeadline) {
            habit.streakCount = 0;
            habit.streakRepairDeadline = null;
            await habit.save();
            habitsBroken += 1;
        }
    }

    const users = await User.find({ streak: { $gt: 0 } })
        .select('streak streakLastDay streakRepairDeadline streakShields streakShieldAutoUsedAt');

    let overallOpened = 0;
    let overallBroken = 0;
    let overallAutoShielded = 0;
    let overallRestDaysRescued = 0;
    for (const user of users) {
        if (!isOverallStreakMissed(user, now)) {
            if (user.streakRepairDeadline) {
                user.streakRepairDeadline = null;
                await user.save();
            }
            continue;
        }

        if (!(await hasUnmetDueHabit(user._id))) {
            user.streakLastDay = endOfYesterday(now);
            user.streakRepairDeadline = null;
            await user.save();
            overallRestDaysRescued += 1;
            continue;
        }

        const autoSpent = await User.findOneAndUpdate(
            { _id: user._id, streakShields: { $gt: 0 } },
            {
                $inc: { streakShields: -1 },
                $set: { streakLastDay: endOfYesterday(now), streakRepairDeadline: null, streakShieldAutoUsedAt: now },
                $addToSet: { streakShieldUsedDays: toDateKey(endOfYesterday(now)) },
            },
        );
        if (autoSpent) {
            await bridgeAtRiskHabits(user._id, now);
            overallAutoShielded += 1;
            continue;
        }

        if (!user.streakRepairDeadline) {
            user.streakRepairDeadline = graceDeadline(now);
            await user.save();
            overallOpened += 1;
        } else if (now > user.streakRepairDeadline) {
            user.streak = 0;
            user.streakRepairDeadline = null;
            await user.save();
            overallBroken += 1;
        }
    }

    return { habitsOpened, habitsBroken, overallOpened, overallBroken, overallAutoShielded, overallRestDaysRescued };
}

/* Emails users whose streak-repair deadline is approaching, at most once per deadline. */
export async function sendStreakRepairReminders(now = new Date()) {
    const reminderWindowEnd = new Date(now.getTime() + STREAK_REMINDER_WINDOW_MS);
    const users = await User.find({
        isDeleted: false,
        streak: { $gt: 0 },
        streakRepairDeadline: { $gt: now, $lte: reminderWindowEnd },
    }).select('email streak streakRepairDeadline notificationPreferences streakReminderEmailLastSentFor');

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
        if (!canSendNotificationEmail(user, 'streakReminders') || hasReminderAlreadyBeenSent(user)) {
            skipped += 1;
            continue;
        }

        try {
            await sendStreakReminderEmail(user.email, {
                streak: user.streak ?? 0,
                deadline: formatReminderDeadline(user.streakRepairDeadline),
                appUrl: config.frontendBaseUrl,
            });

            user.streakReminderEmailLastSentFor = user.streakRepairDeadline;
            await user.save();
            sent += 1;
        } catch (error) {
            failed += 1;
            console.error('Failed to send streak reminder email:', error);
        }
    }

    return { sent, skipped, failed };
}
/* Spends a shield to rescue an at-risk habit streak (and the overall streak too if it was also missed). */
export async function applyFreezeToHabit(userId, habitId, now = new Date()) {
    const [user, habit] = await Promise.all([
        User.findById(userId).select('streak streakLastDay streakShields streakRepairDeadline'),
        Habit.findOne({ _id: habitId, ownerId: userId }),
    ]);

    if (!user) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.USER_NOT_FOUND);
    if (!habit) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.HABIT_NOT_FOUND);
    if (!isHabitStreakAtRisk(habit)) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.NOT_AT_RISK);

    const shieldUpdate = isOverallStreakMissed(user, now)
        ? {
            $inc: { streakShields: -1 },
            $set: { streakLastDay: endOfYesterday(now), streakRepairDeadline: null },
            $addToSet: { streakShieldUsedDays: toDateKey(endOfYesterday(now)) },
        }
        : { $inc: { streakShields: -1 } };

    const spent = await User.findOneAndUpdate(
        { _id: userId, streakShields: { $gt: 0 } },
        shieldUpdate,
        { returnDocument: 'after' },
    );

    if (!spent) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.NO_SHIELDS);

    await bridgeAtRiskHabits(userId, now);
    const reloadedHabit = await Habit.findById(habit._id);

    return { streakShields: spent.streakShields, habit: reloadedHabit };
}

/* Spends a shield to rescue the user's missed overall streak. */
export async function applyFreezeToOverall(userId, now = new Date()) {
    const user = await User.findById(userId)
        .select('streak streakLastDay streakShields streakRepairDeadline');

    if (!user) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.USER_NOT_FOUND);
    if (!isOverallStreakMissed(user, now)) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.NOT_AT_RISK);

    const spent = await User.findOneAndUpdate(
        { _id: userId, streakShields: { $gt: 0 } },
        {
            $inc: { streakShields: -1 },
            $set: { streakLastDay: endOfYesterday(now), streakRepairDeadline: null },
            $addToSet: { streakShieldUsedDays: toDateKey(endOfYesterday(now)) },
        },
        { returnDocument: 'after' },
    );

    if (!spent) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.NO_SHIELDS);

    await bridgeAtRiskHabits(userId, now);

    return { streakShields: spent.streakShields, streak: spent.streak };
}


import Habit from '../habits/habit.model.js';
import User from '../users/user.model.js';
import { sendStreakReminderEmail } from '../mail/mail.service.js';
import config from '../../../config.js';
import { isCompletedForPeriod, isPreviousPeriod, previousPeriodMarker, isDueToday } from '../habits/habit.service.js';
import {
    hasPremiumAccess,
    MAX_STREAK_SHIELDS,
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

function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}

function daysBetween(a, b) {
    return Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS);
}

function graceDeadline(now) {
    const deadline = startOfDay(now);
    deadline.setDate(deadline.getDate() + STREAK_REPAIR_WINDOW_DAYS);
    deadline.setHours(23, 59, 59, 999);
    return deadline;
}

function endOfYesterday(now) {
    const value = startOfDay(now);
    value.setDate(value.getDate() - 1);
    value.setHours(23, 59, 59, 999);
    return value;
}

function canSendNotificationEmail(user, preferenceKey) {
    const preferences = user?.notificationPreferences ?? {};

    return preferences.emailEnabled === true && preferences[preferenceKey] === true;
}

function hasReminderAlreadyBeenSent(user) {
    const sentFor = user.streakReminderEmailLastSentFor;
    const deadline = user.streakRepairDeadline;

    return sentFor && deadline && sentFor.getTime() === deadline.getTime();
}

function formatReminderDeadline(deadline) {
    return new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(deadline);
}
function streakFreezeError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

function isHabitStreakAtRisk(habit) {
    if ((habit.streakCount ?? 0) <= 0) return false;
    return !isCompletedForPeriod(habit) && !isPreviousPeriod(habit, habit.lastCompletedAt);
}

function isOverallStreakMissed(user, now) {
    if ((user.streak ?? 0) <= 0) return false;
    return !user.streakLastDay || daysBetween(now, user.streakLastDay) >= 2;
}

async function hasUnmetDueHabit(userId) {
    const habits = await Habit.find({ ownerId: userId, deletedAt: null, source: { $ne: 'challenge' } })
        .select('frequency lastCompletedAt customDays');
    return habits.some((habit) =>
        isDueToday(habit)
        && !isCompletedForPeriod(habit)
        && !isPreviousPeriod(habit, habit.lastCompletedAt));
}

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

        if ((user.streakShields ?? 0) < MAX_STREAK_SHIELDS) {
            user.streakShields = (user.streakShields ?? 0) + 1;
            granted += 1;
        }
        user.streakShieldsLastGrantedAt = now;
        await user.save();
    }

    return { granted };
}

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

        if ((user.streakShields ?? 0) > 0) {
            user.streakShields -= 1;
            user.streakLastDay = endOfYesterday(now);
            user.streakRepairDeadline = null;
            user.streakShieldAutoUsedAt = now;
            await user.save();
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
export async function applyFreezeToHabit(userId, habitId, now = new Date()) {
    const [user, habit] = await Promise.all([
        User.findById(userId).select('streak streakLastDay streakShields streakRepairDeadline'),
        Habit.findOne({ _id: habitId, ownerId: userId }),
    ]);

    if (!user) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.USER_NOT_FOUND);
    if (!habit) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.HABIT_NOT_FOUND);
    if (!isHabitStreakAtRisk(habit)) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.NOT_AT_RISK);
    if ((user.streakShields ?? 0) <= 0) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.NO_SHIELDS);

    user.streakShields -= 1;
    if (isOverallStreakMissed(user, now)) {
        user.streakLastDay = endOfYesterday(now);
        user.streakRepairDeadline = null;
    }
    await user.save();

    await bridgeAtRiskHabits(user._id, now);
    const reloadedHabit = await Habit.findById(habit._id);

    return { streakShields: user.streakShields, habit: reloadedHabit };
}

export async function applyFreezeToOverall(userId, now = new Date()) {
    const user = await User.findById(userId)
        .select('streak streakLastDay streakShields streakRepairDeadline');

    if (!user) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.USER_NOT_FOUND);
    if (!isOverallStreakMissed(user, now)) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.NOT_AT_RISK);
    if ((user.streakShields ?? 0) <= 0) throw streakFreezeError(STREAK_FREEZE_ERROR_CODES.NO_SHIELDS);

    user.streakShields -= 1;
    user.streakLastDay = endOfYesterday(now);
    user.streakRepairDeadline = null;
    await user.save();

    await bridgeAtRiskHabits(user._id, now);

    return { streakShields: user.streakShields, streak: user.streak };
}


import Habit from '../habits/habit.model.js';
import User from '../users/user.model.js';
import {
    hasPremiumAccess,
    MAX_STREAK_SHIELDS,
    STREAK_REPAIR_WINDOW_DAYS,
} from '../../config/plans.js';

// Streak Freeze ("shields") — account-wide protection for Daily habit streaks.
// Owning a shield = it auto-protects (Duolingo-style); the daily cron consumes
// one when a day was missed. With no shield, a repair window opens so the user
// can still buy a shield within a couple of days to save the streak.


const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function daysBetween(a, b) {
    return Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS);
}

// A Daily habit's streak "missed" when it is alive but the last completion was before yesterday — i.e. at least one full day was skipped.
function isDailyHabitMissed(habit, now) {
    if (habit.frequency !== 'Daily') return false;
    if (!habit.lastCompletedAt || (habit.streakCount ?? 0) <= 0) return false;
    return daysBetween(now, habit.lastCompletedAt) >= 2;
}

// Bridge a habit so the next check-in continues the streak: pretend it was kept "yesterday". The count is preserved (a freeze protects, it does not increment).
function bridgeHabit(habit, now) {
    const yesterday = startOfDay(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    habit.lastCompletedAt = yesterday;
}

// Consume one shield to protect/repair the given missed habits for a user.
async function consumeShield(user, missedHabits, now) {
    if ((user.streakShields ?? 0) <= 0) return false;

    user.streakShields -= 1;
    user.streakRepairDeadline = null;
    await user.save();

    for (const habit of missedHabits) {
        bridgeHabit(habit, now);
        await habit.save();
    }
    return true;
}

/**
 * Monthly grant: give each premium user one shield (idempotent per month, capped
 * at MAX_STREAK_SHIELDS). Called by the monthly cron.
 */
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

        // Mark as granted for the month either way; only add if below the cap.
        if ((user.streakShields ?? 0) < MAX_STREAK_SHIELDS) {
            user.streakShields = (user.streakShields ?? 0) + 1;
            granted += 1;
        }
        user.streakShieldsLastGrantedAt = now;
        await user.save();
    }

    return { granted };
}

/**
 * Daily maintenance: for each user with missed Daily streaks —
 *  - has a shield  → consume it (freeze the day, keep the streak),
 *  - no shield, no open window → open a repair window,
 *  - window expired without repair → break the streaks.
 * Idempotent via per-habit state. Called by the daily cron.
 */
export async function runDailyStreakMaintenance(now = new Date()) {
    const habits = await Habit.find({ frequency: 'Daily', streakCount: { $gt: 0 } });

    const missedByUser = new Map();
    for (const habit of habits) {
        if (!isDailyHabitMissed(habit, now)) continue;
        const key = habit.ownerId.toString();
        if (!missedByUser.has(key)) missedByUser.set(key, []);
        missedByUser.get(key).push(habit);
    }

    let frozen = 0;
    let opened = 0;
    let broken = 0;

    for (const [userId, missedHabits] of missedByUser) {
        const user = await User.findById(userId).select('streakShields streakRepairDeadline');
        if (!user) continue;

        if ((user.streakShields ?? 0) > 0) {
            await consumeShield(user, missedHabits, now);
            frozen += 1;
        } else if (!user.streakRepairDeadline) {
            const deadline = startOfDay(now);
            deadline.setDate(deadline.getDate() + STREAK_REPAIR_WINDOW_DAYS);
            deadline.setHours(23, 59, 59, 999);
            user.streakRepairDeadline = deadline;
            await user.save();
            opened += 1;
        } else if (now > user.streakRepairDeadline) {
            for (const habit of missedHabits) {
                habit.streakCount = 0;
                await habit.save();
            }
            user.streakRepairDeadline = null;
            await user.save();
            broken += 1;
        }
        // else: window still open, no shield yet → leave pending for the user to repair.
    }

    return { frozen, opened, broken };
}

/**
 * Repair flow: when a user gains a shield (e.g. shop purchase) while a repair
 * window is open, immediately consume it to restore their missed Daily streaks.
 * Returns true if a repair happened. Safe to call anytime.
 */
export async function repairStreaksWithShield(userId, now = new Date()) {
    const user = await User.findById(userId).select('streakShields streakRepairDeadline');
    if (!user) return false;
    if (!user.streakRepairDeadline || now > user.streakRepairDeadline) return false;
    if ((user.streakShields ?? 0) <= 0) return false;

    const habits = await Habit.find({ ownerId: userId, frequency: 'Daily', streakCount: { $gt: 0 } });
    const missed = habits.filter((habit) => isDailyHabitMissed(habit, now));

    if (!missed.length) {
        user.streakRepairDeadline = null;
        await user.save();
        return false;
    }

    return consumeShield(user, missed, now);
}

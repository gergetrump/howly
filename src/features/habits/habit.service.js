import Habit from './habit.model.js';
import { ApiError } from '../../errors/ApiError.js';
import { moderateText } from '../../moderation/moderation.service.js';
import {
    createMilestonePostForHabit,
    enrichMilestonePost,
} from '../milestones/milestone.service.js';
import { recordProgressForHabit } from '../challenges/challenge.service.js';
import {
    recordHabitCheckIn,
    removeHabitCheckInForCurrentPeriod,
} from '../analytics/analytics.service.js';
import User from '../users/user.model.js';
import { PLAN_KEYS, getPlanForUser } from '../../config/plans.js';
import { applyHabitBoostReward, revertHabitBoostReward } from '../boosts/habitBoost.service.js';
import HabitBoost from '../boosts/habitBoost.model.js';
import { toTaxonomyDto } from '../taxonomy/taxonomy.schema.js';
import {
    copyTaxonomyToHabit,
    clearTaxonomyFields,
    scheduleTaxonomyForHabit,
} from '../taxonomy/taxonomy.service.js';

const ACTIVE_HABIT_FILTER = { deletedAt: null };

function withActiveHabitFilter(query) {
    return { ...query, ...ACTIVE_HABIT_FILTER };
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Returns true if `date` falls on today's calendar day (local time).
 */
function isToday(date) {
    if (!date) return false;
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );
}

/**
 * Returns true if `date` falls on yesterday's calendar day.
 */
function isYesterday(date) {
    if (!date) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate()
    );
}

/**
 * Checks if a date falls within the current calendar period based on habit frequency.
 */
export function isCompletedForPeriod(habit) {
    const date = habit.lastCompletedAt;
    if (!date) return false;
    const now = new Date();
    const frequency = habit.frequency;
    
    if (frequency === 'Weekly') {
        const day = now.getDay() || 7; // 1-7 (Mon-Sun)
        const monday = new Date(now);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(monday.getDate() - day + 1);
        return date >= monday;
    }
    
    if (frequency === 'Monthly') {
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    
    // Custom specific days acts exactly like Daily (must be completed today)
    return isToday(date);
}

export function isDueToday(habit) {
    if (habit.frequency === 'Custom' && habit.customDays && habit.customDays.length > 0) {
        const currentDay = new Date().getDay() || 7; // 1-7 (Mon-Sun)
        return habit.customDays.includes(currentDay);
    }
    return true;
}

function getPreviousScheduledDate(customDays) {
    const now = new Date();
    const currentDay = now.getDay() || 7; // 1-7
    
    if (!customDays || customDays.length === 0) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    }

    let previousDay = -1;
    let fromLastWeek = false;

    const smallerDays = customDays.filter(d => d < currentDay);
    if (smallerDays.length > 0) {
        previousDay = Math.max(...smallerDays);
    } else {
        previousDay = Math.max(...customDays);
        fromLastWeek = true;
    }

    let daysAgo = fromLastWeek ? currentDay + (7 - previousDay) : currentDay - previousDay;
    const prevDate = new Date(now);
    prevDate.setDate(prevDate.getDate() - daysAgo);
    return prevDate;
}

/**
 * Checks if a date falls strictly in the PREVIOUS calendar period for streak calculation.
 */
export function isPreviousPeriod(habit, date) {
    if (!date) return false;
    const now = new Date();
    const frequency = habit.frequency;
    
    if (frequency === 'Weekly') {
        const day = now.getDay() || 7;
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setHours(23, 59, 59, 999);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - day);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setHours(0, 0, 0, 0);
        lastWeekStart.setDate(lastWeekStart.getDate() - 6);
        return date >= lastWeekStart && date <= lastWeekEnd;
    }
    
    if (frequency === 'Monthly') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth();
    }

    if (frequency === 'Custom' && habit.customDays && habit.customDays.length > 0) {
        const prevDate = getPreviousScheduledDate(habit.customDays);
        return date.getFullYear() === prevDate.getFullYear() &&
               date.getMonth() === prevDate.getMonth() &&
               date.getDate() === prevDate.getDate();
    }

    return isYesterday(date);
}

export function previousPeriodMarker(habit, now = new Date()) {
    const frequency = habit.frequency;

    if (frequency === 'Weekly') {
        const marker = new Date(now);
        marker.setDate(marker.getDate() - (now.getDay() || 7));
        marker.setHours(12, 0, 0, 0);
        return marker;
    }

    if (frequency === 'Monthly') {
        return new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0, 0);
    }

    if (frequency === 'Custom' && habit.customDays && habit.customDays.length > 0) {
        const marker = getPreviousScheduledDate(habit.customDays);
        marker.setHours(12, 0, 0, 0);
        return marker;
    }

    const marker = new Date(now);
    marker.setDate(marker.getDate() - 1);
    marker.setHours(12, 0, 0, 0);
    return marker;
}

/**
 * Maps a Mongoose Habit document to a DTO.
 */
function toHabitDto(habit) {
    return {
        id: habit._id.toString(),
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        frequency: habit.frequency,
        customDays: habit.customDays || [],
        category: habit.category ?? null,
        taxonomy: toTaxonomyDto(habit.taxonomy),
        source: habit.source ?? 'manual',
        challengeId: habit.challengeId ? habit.challengeId.toString() : null,
        streakCount: habit.streakCount,
        streakRepairDeadline: habit.streakRepairDeadline ?? null,
        isCompletedToday: isCompletedForPeriod(habit),
        createdAt: habit.createdAt.toISOString(),
    };
}

async function populateActiveBoosts(userId, dtos) {
    if (!dtos || dtos.length === 0) return dtos;
    const habitIds = dtos.map(d => d.id);
    const activeBoosts = await HabitBoost.find({
        user: userId,
        habit: { $in: habitIds },
        completedAt: null
    });
    const boostsByHabitId = {};
    activeBoosts.forEach(boost => {
        boostsByHabitId[boost.habit.toString()] = {
            id: boost._id.toString(),
            assetKey: boost.assetKey,
            bonusCoins: boost.bonusCoins,
            remainingCompletions: boost.remainingCompletions,
        };
    });
    dtos.forEach(dto => {
        dto.activeBoost = boostsByHabitId[dto.id] || null;
    });
    return dtos;
}

async function assertCanCreateHabits(userId, requestedHabitCount = 1) {
    const user = await User.findOne({ _id: userId, isDeleted: false })
        .select('role isPremium')
        .lean();

    if (!user) {
        throw ApiError.notFound('User not found.');
    }

    const plan = getPlanForUser(user);
    const currentHabitCount = await Habit.countDocuments(withActiveHabitFilter({
        ownerId: userId,
        source: { $ne: 'challenge' },
    }));
    const nextHabitCount = currentHabitCount + requestedHabitCount;

    if (nextHabitCount <= plan.limits.maxHabits) {
        return;
    }

    const premiumHabitLimit = getPlanForUser({ isPremium: true }).limits.maxHabits;
    const message = plan.key === PLAN_KEYS.PREMIUM
        ? `Premium plan can create up to ${plan.limits.maxHabits} habits.`
        : `Free plan can create up to ${plan.limits.maxHabits} habits. Upgrade to premium for up to ${premiumHabitLimit} habits.`;

    throw new ApiError(403, 'HABIT_LIMIT_REACHED', message);
}

// ─── Service Functions ──────────────────────────────────────────────

/**
 * List all habits for a user, paginated.
 */
export async function getHabitsForUser(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const [habits, total] = await Promise.all([
        Habit.find(withActiveHabitFilter({ ownerId: userId, source: { $ne: 'challenge' } }))
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Habit.countDocuments(withActiveHabitFilter({ ownerId: userId, source: { $ne: 'challenge' } })),
    ]);

    const dtos = habits.map(toHabitDto);
    await populateActiveBoosts(userId, dtos);

    return {
        data: dtos,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

/**
 * Get a single habit by ID.
 */
export async function getHabitById(habitId, userId) {
    const habit = await Habit.findOne(withActiveHabitFilter({ _id: habitId, ownerId: userId }));

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    const dto = toHabitDto(habit);
    const [populated] = await populateActiveBoosts(userId, [dto]);
    return populated;
}

const WRITABLE_HABIT_FIELDS = ['title', 'description', 'icon', 'frequency', 'customDays'];

function pickWritableHabitFields(data = {}) {
    const payload = {};
    for (const field of WRITABLE_HABIT_FIELDS) {
        if (data[field] !== undefined) {
            payload[field] = data[field];
        }
    }
    return payload;
}

async function assertHabitTextClean(text) {
    const moderation = await moderateText(text);
    if (moderation.flagged) {
        throw new ApiError(400, 'HABIT_MODERATION_BLOCKED', 'Please choose a habit name without harmful or inappropriate content.');
    }
}

function validateHabitFields({ frequency, customDays }) {
    if (frequency === 'Custom' && !(Array.isArray(customDays) && customDays.length > 0)) {
        throw new ApiError(400, 'INVALID_HABIT', 'Custom habits need at least one weekday.');
    }
    if (Array.isArray(customDays) && customDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
        throw new ApiError(400, 'INVALID_HABIT', 'Weekdays must be whole numbers between 1 and 7.');
    }
}

/**
 * Create a single habit.
 */
export async function createHabit(userId, data) {
    await assertCanCreateHabits(userId);

    await assertHabitTextClean([data.title, data.description].filter(Boolean).join(' '));
    validateHabitFields(data);

    const habit = await Habit.create({ ...pickWritableHabitFields(data), ownerId: userId });
    await revokeOverallStreakIfIncomplete(userId);
    scheduleTaxonomyForHabit(habit._id);

    const dto = toHabitDto(habit);
    const [populated] = await populateActiveBoosts(userId, [dto]);
    return populated;
}

/**
 * Bulk-create habits from an array of template objects (onboarding).
 */
export async function createHabitsFromTemplates(userId, templates) {
    if (!Array.isArray(templates) || templates.length === 0) {
        throw new ApiError(400, 'INVALID_TEMPLATES', 'templates must be a non-empty array.');
    }

    await assertCanCreateHabits(userId, templates.length);

    await assertHabitTextClean(
        templates.map((t) => [t.title, t.description].filter(Boolean).join(' ')).join('\n'),
    );

    const docs = templates.map((t) => ({
        title: t.title,
        description: typeof t.description === 'string' ? t.description.trim().slice(0, 1000) : '',
        icon: t.icon ?? '🎯',
        frequency: t.frequency,
        customDays: t.customDays || [],
        ownerId: userId,
        source: 'onboarding',
        templateKey: t.templateKey ?? null,
    }));

    const habits = await Habit.insertMany(docs);
    await revokeOverallStreakIfIncomplete(userId);

    for (const habit of habits) {
        scheduleTaxonomyForHabit(habit._id);
    }

    return habits.map(toHabitDto);
}

/**
 * Partially update a habit. Enforces ownership.
 */
export async function updateHabit(habitId, userId, data) {
    const habit = await Habit.findOne(withActiveHabitFilter({ _id: habitId, ownerId: userId }));

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    if (data.title !== undefined || data.description !== undefined) {
        await assertHabitTextClean([data.title, data.description].filter(Boolean).join(' '));
    }

    const shouldReassignTaxonomy = (
        (data.title !== undefined && data.title !== habit.title)
        || (data.description !== undefined && data.description !== habit.description)
    );

    const dueSetChanged = (
        (data.frequency !== undefined && data.frequency !== habit.frequency)
        || data.customDays !== undefined
    );

    Object.assign(habit, pickWritableHabitFields(data));

    if (shouldReassignTaxonomy) {
        clearTaxonomyFields(habit);
    }

    await habit.save();

    if (dueSetChanged) {
        await revokeOverallStreakIfIncomplete(userId);
    }

    if (shouldReassignTaxonomy) {
        scheduleTaxonomyForHabit(habit._id);
    }

    const dto = toHabitDto(habit);
    const [populated] = await populateActiveBoosts(userId, [dto]);
    return populated;
}

/**
 * Delete a habit. Enforces ownership.
 */
export async function deleteHabit(habitId, userId) {
    const habit = await Habit.findOneAndUpdate(
        withActiveHabitFilter({ _id: habitId, ownerId: userId }),
        { $set: { deletedAt: new Date() } },
        { returnDocument: 'after' },
    );

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    await HabitBoost.deleteMany({ habit: habitId });
}

/**
 * Mark a habit as completed for today (check-in).
 * Handles streak calculation based on the habit's frequency.
 */
export async function completeHabit(habitId, userId) {
    const habit = await Habit.findOne(withActiveHabitFilter({ _id: habitId, ownerId: userId }));

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    if (isCompletedForPeriod(habit)) {
        throw ApiError.badRequest('Habit already completed for this period.');
    }

    if (habit.source === 'challenge') {
        habit.lastCompletedAt = new Date();
        habit.streakRepairDeadline = null;
        await habit.save();
        await recordHabitCheckIn({ userId, habit, completedAt: habit.lastCompletedAt });
        await recordProgressForHabit({ userId, habitId: habit._id });
        const boostReward = await applyHabitBoostReward({ userId, habit });

        const dto = toHabitDto(habit);
        const [populated] = await populateActiveBoosts(userId, [dto]);

        return {
            habit: populated,
            milestonePost: null,
            boostReward,
        };
    }

    // ── Streak calculation ──
    const last = habit.lastCompletedAt;
    
    // If completed in the immediately previous period, streak continues. Otherwise, resets to 1.
    if (isPreviousPeriod(habit, last)) {
        habit.streakCount += 1;
    } else {
        habit.streakCount = 1;
    }

    habit.lastCompletedAt = new Date();
    habit.streakRepairDeadline = null;
    await habit.save();
    await recordHabitCheckIn({ userId, habit, completedAt: habit.lastCompletedAt });
    const { milestonePost } = await createMilestonePostForHabit(habit);
    const enrichedMilestonePost = milestonePost
        ? await enrichMilestonePost(milestonePost)
        : null;
    await recordProgressForHabit({ userId, habitId: habit._id });
    const boostReward = await applyHabitBoostReward({ userId, habit });
    await creditOverallStreak(userId);

    const dto = toHabitDto(habit);
    const [populated] = await populateActiveBoosts(userId, [dto]);

    return {
        habit: populated,
        milestonePost: enrichedMilestonePost,
        boostReward,
    };
}

/**
 * Un-complete a habit for today.
 * Reverts the streak count and lastCompletedAt.
 */
export async function uncompleteHabit(habitId, userId) {
    const habit = await Habit.findOne(withActiveHabitFilter({ _id: habitId, ownerId: userId }));

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    if (!isCompletedForPeriod(habit)) {
        throw ApiError.badRequest('Habit not completed for this period.');
    }

    if (habit.source === 'challenge') {
        const uncompletedAt = habit.lastCompletedAt || new Date();
        await removeHabitCheckInForCurrentPeriod({ userId, habit });
        habit.lastCompletedAt = null;
        await habit.save();
        await recordProgressForHabit({ userId, habitId: habit._id, days: -1 });
        const boostReverted = await revertHabitBoostReward({ userId, habit, uncompletedAt });

        const dto = toHabitDto(habit);
        const [populated] = await populateActiveBoosts(userId, [dto]);
        return {
            habit: populated,
            boostReverted,
        };
    }

    // Revert streak
    habit.streakCount = Math.max(0, habit.streakCount - 1);

    const uncompletedAt = habit.lastCompletedAt || new Date();
    await removeHabitCheckInForCurrentPeriod({ userId, habit });
    habit.lastCompletedAt = habit.streakCount > 0 ? previousPeriodMarker(habit) : null;

    await habit.save();
    await revokeOverallStreakIfIncomplete(userId);
    const boostReverted = await revertHabitBoostReward({ userId, habit, uncompletedAt });

    const dto = toHabitDto(habit);
    const [populated] = await populateActiveBoosts(userId, [dto]);
    return {
        habit: populated,
        boostReverted,
    };
}


function toDateKey(date) {
    const value = new Date(date);
    return [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, '0'),
        String(value.getDate()).padStart(2, '0'),
    ].join('-');
}

async function creditOverallStreak(userId) {
    const user = await User.findById(userId).select('streak streakLastDay streakRepairDeadline');
    if (!user) return null;

    // Already credited today → nothing to do (but make sure today is in the calendar log,
    // covering streaks credited before the log existed).
    if (user.streakLastDay && isToday(user.streakLastDay)) {
        await User.updateOne(
            { _id: userId },
            {
                $addToSet: { streakPerfectDays: toDateKey(user.streakLastDay) },
                $max: { bestStreak: user.streak },
            },
        );
        return { streak: user.streak, creditedToday: true };
    }

    // Challenge habits are excluded
    const habits = await Habit.find(withActiveHabitFilter({ ownerId: userId, source: { $ne: 'challenge' } }))
        .select('frequency lastCompletedAt customDays');
    const dueToday = habits.filter(isDueToday);

    // A complete day = every habit due today is done (and there is at least one).
    if (dueToday.length === 0 || !dueToday.every((habit) => isCompletedForPeriod(habit))) {
        return { streak: user.streak, creditedToday: false };
    }

    // Continue the streak if yesterday was kept, otherwise start a fresh one.
    if (user.streakLastDay && isYesterday(user.streakLastDay)) {
        user.streak += 1;
    } else {
        user.streak = 1;
    }
    user.streakLastDay = new Date();
    user.streakRepairDeadline = null;
    await user.save();

    // Forward-only log for the streak calendar: mark today as a perfect day, and bump the all-time best.
    await User.updateOne(
        { _id: userId },
        {
            $addToSet: { streakPerfectDays: toDateKey(user.streakLastDay) },
            $max: { bestStreak: user.streak },
        },
    );

    return { streak: user.streak, creditedToday: true };
}

async function revokeOverallStreakIfIncomplete(userId) {
    const user = await User.findById(userId).select('streak streakLastDay');
    if (!user) return null;

    if (!user.streakLastDay || !isToday(user.streakLastDay)) {
        return { streak: user.streak, revoked: false };
    }

    const habits = await Habit.find(withActiveHabitFilter({ ownerId: userId, source: { $ne: 'challenge' } }))
        .select('frequency lastCompletedAt customDays');
    const dueToday = habits.filter(isDueToday);

    if (dueToday.length > 0 && dueToday.every((habit) => isCompletedForPeriod(habit))) {
        return { streak: user.streak, revoked: false };
    }

    user.streak = Math.max(0, user.streak - 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    user.streakLastDay = yesterday;
    await user.save();

    // Today is no longer a perfect day → drop it from the streak-calendar log.
    await User.updateOne(
        { _id: userId },
        { $pull: { streakPerfectDays: toDateKey(new Date()) } },
    );

    return { streak: user.streak, revoked: true };
}

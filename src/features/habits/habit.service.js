import Habit from './habit.model.js';
import { ApiError } from '../../errors/ApiError.js';
import { createMilestonePostForHabit } from '../milestones/milestone.service.js';

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
function isCompletedForPeriod(habit) {
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
function isPreviousPeriod(habit, date) {
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

/**
 * Maps a Mongoose Habit document to a DTO.
 */
function toHabitDto(habit) {
    return {
        id: habit._id.toString(),
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        type: habit.type,
        target: habit.target ?? null,
        unit: habit.unit ?? null,
        frequency: habit.frequency,
        customDays: habit.customDays || [],
        category: habit.category ?? null,
        streakCount: habit.streakCount,
        isCompletedToday: isCompletedForPeriod(habit),
        createdAt: habit.createdAt.toISOString(),
    };
}

function toMilestoneDto(milestonePost) {
    if (!milestonePost) {
        return null;
    }

    return {
        id: milestonePost._id.toString(),
        habitTitle: milestonePost.habitTitle,
        streakDays: milestonePost.streakDays,
        visibleUntil: milestonePost.visibleUntil,
    };
}

// ─── Service Functions ──────────────────────────────────────────────

/**
 * List all habits for a user, paginated.
 */
export async function getHabitsForUser(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const [habits, total] = await Promise.all([
        Habit.find({ ownerId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Habit.countDocuments({ ownerId: userId }),
    ]);

    return {
        data: habits.map(toHabitDto),
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
    const habit = await Habit.findOne({ _id: habitId, ownerId: userId });

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    return toHabitDto(habit);
}

/**
 * Create a single habit.
 */
export async function createHabit(userId, data) {
    const habit = await Habit.create({ ...data, ownerId: userId });
    return toHabitDto(habit);
}

/**
 * Bulk-create habits from an array of template objects (onboarding).
 */
export async function createHabitsFromTemplates(userId, templates) {
    const docs = templates.map((t) => ({
        title: t.title,
        icon: t.icon ?? '🎯',
        frequency: t.frequency,
        customDays: t.customDays || [],
        category: t.category,
        ownerId: userId,
    }));

    const habits = await Habit.insertMany(docs);
    return habits.map(toHabitDto);
}

/**
 * Partially update a habit. Enforces ownership.
 */
export async function updateHabit(habitId, userId, data) {
    const habit = await Habit.findOne({ _id: habitId, ownerId: userId });

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    // Apply only the provided fields (PATCH semantics)
    Object.assign(habit, data);
    await habit.save();

    return toHabitDto(habit);
}

/**
 * Delete a habit. Enforces ownership.
 */
export async function deleteHabit(habitId, userId) {
    const habit = await Habit.findOneAndDelete({ _id: habitId, ownerId: userId });

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }
}

/**
 * Mark a habit as completed for today (check-in).
 * Handles streak calculation based on the habit's frequency.
 */
export async function completeHabit(habitId, userId) {
    const habit = await Habit.findOne({ _id: habitId, ownerId: userId });

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    if (isCompletedForPeriod(habit)) {
        throw ApiError.badRequest('Habit already completed for this period.');
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
    await habit.save();
    const { milestonePost } = await createMilestonePostForHabit(habit);

    return {
        habit: toHabitDto(habit),
        milestonePost: toMilestoneDto(milestonePost),
    };
}

/**
 * Un-complete a habit for today.
 * Reverts the streak count and lastCompletedAt.
 */
export async function uncompleteHabit(habitId, userId) {
    const habit = await Habit.findOne({ _id: habitId, ownerId: userId });

    if (!habit) {
        throw ApiError.notFound('Habit not found.');
    }

    if (!isCompletedForPeriod(habit)) {
        throw ApiError.badRequest('Habit not completed for this period.');
    }

    // Revert streak
    habit.streakCount = Math.max(0, habit.streakCount - 1);
    
    // Approximate previous completion date to yesterday so streak can continue tomorrow
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    habit.lastCompletedAt = habit.streakCount > 0 ? yesterday : null;

    await habit.save();

    return toHabitDto(habit);
}

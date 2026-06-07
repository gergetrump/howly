import Habit from './habit.model.js';
import { ApiError } from '../../errors/ApiError.js';

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
 * Returns true if `date` is within the last `days` calendar days.
 */
function isWithinDays(date, days) {
    if (!date) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return date >= cutoff;
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
        category: habit.category ?? null,
        streakCount: habit.streakCount,
        isCompletedToday: isToday(habit.lastCompletedAt),
        createdAt: habit.createdAt.toISOString(),
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

    if (isToday(habit.lastCompletedAt)) {
        throw ApiError.badRequest('Habit already completed today.');
    }

    // ── Streak calculation ──
    const last = habit.lastCompletedAt;

    switch (habit.frequency) {
        case 'Daily':
            habit.streakCount = isYesterday(last) ? habit.streakCount + 1 : 1;
            break;
        case 'Weekly':
            habit.streakCount = isWithinDays(last, 7) ? habit.streakCount + 1 : 1;
            break;
        case 'Monthly':
            habit.streakCount = isWithinDays(last, 30) ? habit.streakCount + 1 : 1;
            break;
        case 'Custom':
        default:
            habit.streakCount = isWithinDays(last, 30) ? habit.streakCount + 1 : 1;
            break;
    }

    habit.lastCompletedAt = new Date();
    await habit.save();

    return toHabitDto(habit);
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

    if (!isToday(habit.lastCompletedAt)) {
        throw ApiError.badRequest('Habit not completed today.');
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

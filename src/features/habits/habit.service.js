import Habit from './habit.model.js';

export async function createHabit({ title, type, done, userId }) {
    return Habit.create({
        title,
        type,
        ...(done !== undefined ? { done } : {}),
        user: userId,
    });
}

export async function listHabits({ userId } = {}) {
    const filter = {};

    if (userId) {
        filter.user = userId;
    }

    return Habit.find(filter).sort({ createdAt: -1 });
}

export async function getHabitById(habitId) {
    return Habit.findById(habitId);
}

export async function updateHabit(habitId, updates) {
    return Habit.findByIdAndUpdate(habitId, updates, {
        new: true,
        runValidators: true,
    });
}

export async function deleteHabit(habitId) {
    return Habit.findByIdAndDelete(habitId);
}

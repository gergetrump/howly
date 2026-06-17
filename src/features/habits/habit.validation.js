import mongoose from 'mongoose';

const HABIT_TYPES = new Set(['boolean', 'numeric']);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export function validateCreateHabitInput(body = {}) {
    const title = isNonEmptyString(body.title) ? body.title.trim() : '';
    const type = isNonEmptyString(body.type) ? body.type.trim() : '';
    const done = typeof body.done === 'boolean' ? body.done : undefined;
    const userId = body.userId;
    const errors = [];

    if (!title) {
        errors.push('title is required');
    } else if (title.length > 100) {
        errors.push('title must be 100 characters or less');
    }

    if (!HABIT_TYPES.has(type)) {
        errors.push('type must be one of: boolean, numeric');
    }

    if (!isValidObjectId(userId)) {
        errors.push('userId must be a valid ObjectId');
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return {
        value: {
            title,
            type,
            userId,
            ...(done !== undefined ? { done } : {}),
        },
    };
}

export function validateUpdateHabitInput(body = {}) {
    const updates = {};
    const errors = [];

    if (body.title !== undefined) {
        if (!isNonEmptyString(body.title)) {
            errors.push('title must be a non-empty string');
        } else if (body.title.trim().length > 100) {
            errors.push('title must be 100 characters or less');
        } else {
            updates.title = body.title.trim();
        }
    }

    if (body.type !== undefined) {
        if (!isNonEmptyString(body.type) || !HABIT_TYPES.has(body.type.trim())) {
            errors.push('type must be one of: boolean, numeric');
        } else {
            updates.type = body.type.trim();
        }
    }

    if (body.done !== undefined) {
        if (typeof body.done !== 'boolean') {
            errors.push('done must be a boolean');
        } else {
            updates.done = body.done;
        }
    }

    if (body.streak !== undefined) {
        if (typeof body.streak !== 'number' || body.streak < 0) {
            errors.push('streak must be a non-negative number');
        } else {
            updates.streak = body.streak;
        }
    }

    if (Object.keys(updates).length === 0 && errors.length === 0) {
        errors.push('no valid fields provided');
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value: updates };
}

export function validateListHabitsInput(query = {}) {
    const userId = query.userId;

    if (userId === undefined) {
        return { value: {} };
    }

    if (!isValidObjectId(userId)) {
        return { error: 'userId must be a valid ObjectId' };
    }

    return { value: { userId } };
}

export function validateHabitId(id) {
    if (!isValidObjectId(id)) {
        return { error: 'habitId must be a valid ObjectId' };
    }

    return { value: id };
}

export function validateSuggestInput(body = {}) {
    const goal = isNonEmptyString(body.goal) ? body.goal.trim() : '';

    if (!goal) {
        return { error: 'goal is required' };
    }

    if (goal.length > 200) {
        return { error: 'goal must be 200 characters or less' };
    }

    return { value: { goal } };
}

import mongoose from 'mongoose';

// Lightweight validation helpers for user routes.
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// Validate user id params coming from the request
export function validateUserId(id) {
    if (!isNonEmptyString(id)) {
        return { error: 'userId is required' };
    }

    if (!isValidObjectId(id)) {
        return { error: 'userId must be a valid ObjectId' };
    }

    return { value: id.trim() };
}

export function validateSearchUsersInput(query = {}) {
    const searchQuery = isNonEmptyString(query.query) ? query.query.trim() : '';
    const errors = [];

    if (!searchQuery) {
        errors.push('query is required');
    } else if (searchQuery.length < 2) {
        errors.push('query must be at least 2 characters');
    } else if (searchQuery.length > 30) {
        errors.push('query must be 30 characters or less');
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value: { query: searchQuery } };
}

// Validate and sanitize allowed user profile updates
export function validateUpdateUserInput(body = {}) {
    const updates = {};
    const errors = [];

    if (body.firstName !== undefined) {
        if (!isNonEmptyString(body.firstName)) {
            errors.push('firstName must be a non-empty string');
        } else if (body.firstName.trim().length > 50) {
            errors.push('firstName must be 50 characters or less');
        } else {
            updates.firstName = body.firstName.trim();
        }
    }

    if (body.lastName !== undefined) {
        if (!isNonEmptyString(body.lastName)) {
            errors.push('lastName must be a non-empty string');
        } else if (body.lastName.trim().length > 50) {
            errors.push('lastName must be 50 characters or less');
        } else {
            updates.lastName = body.lastName.trim();
        }
    }
    if (body.username !== undefined) {
        if (!isNonEmptyString(body.username)) {
            errors.push('username must be a non-empty string');
        } else if (body.username.trim().length < 3 || body.username.trim().length > 30) {
            errors.push('username must be between 3 and 30 characters');
        } else {
            updates.username = body.username.trim();
        }
    }

    if (body.email !== undefined) {
        if (!isNonEmptyString(body.email)) {
            errors.push('email must be a non-empty string');
        } else if (body.email.trim().length > 254) {
            errors.push('email must be 254 characters or less');
        } else if (!EMAIL_REGEX.test(body.email.trim())) {
            errors.push('email must be a valid email address');
        } else {
            updates.email = body.email.trim().toLowerCase();
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

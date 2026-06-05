import mongoose from 'mongoose';
import { CHALLENGE_FREQUENCIES, CHALLENGE_STATUS, CHALLENGE_VISIBILITIES } from './challenge.model.js';

const CHALLENGE_FREQUENCY_SET = new Set(CHALLENGE_FREQUENCIES);
const CHALLENGE_STATUS_SET = new Set(CHALLENGE_STATUS);
const CHALLENGE_VISIBILITY_SET = new Set(CHALLENGE_VISIBILITIES);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

function toOptionalString(value, fieldName, maxLength, errors, updates) {
    if (value === undefined) {
        return;
    }

    if (value === null || value === '') {
        updates[fieldName] = '';
        return;
    }

    if (!isNonEmptyString(value)) {
        errors.push(`${fieldName} must be a string`);
        return;
    }

    const trimmed = value.trim();

    if (trimmed.length > maxLength) {
        errors.push(`${fieldName} must be ${maxLength} characters or less`);
        return;
    }

    updates[fieldName] = trimmed;
}

function toPositiveInteger(value, fieldName, min, max, errors, updates) {
    if (!Number.isInteger(value) || value < min || value > max) {
        errors.push(`${fieldName} must be an integer between ${min} and ${max}`);
        return;
    }

    updates[fieldName] = value;
}

function toNonNegativeNumber(value, fieldName, errors, updates) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        errors.push(`${fieldName} must be a non-negative number`);
        return;
    }

    updates[fieldName] = value;
}

function toDate(value, fieldName, errors, updates) {
    if (value === undefined) {
        return;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        errors.push(`${fieldName} must be a valid date`);
        return;
    }

    updates[fieldName] = date;
}

export function validateCreateChallengeInput(body = {}) {
    const errors = [];
    const value = {};
    const title = isNonEmptyString(body.title) ? body.title.trim() : '';
    const habitTitle = isNonEmptyString(body.habitTitle) ? body.habitTitle.trim() : '';
    const frequency = isNonEmptyString(body.frequency) ? body.frequency.trim() : '';

    if (!title) {
        errors.push('title is required');
    } else if (title.length > 100) {
        errors.push('title must be 100 characters or less');
    } else {
        value.title = title;
    }

    if (!habitTitle) {
        errors.push('habitTitle is required');
    } else if (habitTitle.length > 100) {
        errors.push('habitTitle must be 100 characters or less');
    } else {
        value.habitTitle = habitTitle;
    }

    toOptionalString(body.description, 'description', 200, errors, value);
    toNonNegativeNumber(body.coinReward, 'coinReward', errors, value);

    if (!CHALLENGE_FREQUENCY_SET.has(frequency)) {
        errors.push(`frequency must be one of: ${CHALLENGE_FREQUENCIES.join(', ')}`);
    } else {
        value.frequency = frequency;
    }

    toPositiveInteger(body.durationDays, 'durationDays', 1, 365, errors, value);
    toDate(body.startsAt, 'startsAt', errors, value);

    if (body.status !== undefined) {
        const status = isNonEmptyString(body.status) ? body.status.trim() : '';

        if (!CHALLENGE_STATUS_SET.has(status)) {
            errors.push(`status must be one of: ${CHALLENGE_STATUS.join(', ')}`);
        } else {
            value.status = status;
        }
    }

    if (body.visibility !== undefined) {
        const visibility = isNonEmptyString(body.visibility) ? body.visibility.trim() : '';

        if (!CHALLENGE_VISIBILITY_SET.has(visibility)) {
            errors.push(`visibility must be one of: ${CHALLENGE_VISIBILITIES.join(', ')}`);
        } else {
            value.visibility = visibility;
        }
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value };
}

export function validateUpdateChallengeInput(body = {}) {
    const errors = [];
    const updates = {};

    if (body.title !== undefined) {
        if (!isNonEmptyString(body.title)) {
            errors.push('title must be a non-empty string');
        } else if (body.title.trim().length > 100) {
            errors.push('title must be 100 characters or less');
        } else {
            updates.title = body.title.trim();
        }
    }

    if (body.habitTitle !== undefined) {
        if (!isNonEmptyString(body.habitTitle)) {
            errors.push('habitTitle must be a non-empty string');
        } else if (body.habitTitle.trim().length > 100) {
            errors.push('habitTitle must be 100 characters or less');
        } else {
            updates.habitTitle = body.habitTitle.trim();
        }
    }

    toOptionalString(body.description, 'description', 200, errors, updates);

    if (body.coinReward !== undefined) {
        toNonNegativeNumber(body.coinReward, 'coinReward', errors, updates);
    }

    if (body.frequency !== undefined) {
        const frequency = isNonEmptyString(body.frequency) ? body.frequency.trim() : '';

        if (!CHALLENGE_FREQUENCY_SET.has(frequency)) {
            errors.push(`frequency must be one of: ${CHALLENGE_FREQUENCIES.join(', ')}`);
        } else {
            updates.frequency = frequency;
        }
    }

    if (body.durationDays !== undefined) {
        toPositiveInteger(body.durationDays, 'durationDays', 1, 365, errors, updates);
    }

    toDate(body.startsAt, 'startsAt', errors, updates);

    if (body.status !== undefined) {
        const status = isNonEmptyString(body.status) ? body.status.trim() : '';

        if (!CHALLENGE_STATUS_SET.has(status)) {
            errors.push(`status must be one of: ${CHALLENGE_STATUS.join(', ')}`);
        } else {
            updates.status = status;
        }
    }

    if (body.visibility !== undefined) {
        const visibility = isNonEmptyString(body.visibility) ? body.visibility.trim() : '';

        if (!CHALLENGE_VISIBILITY_SET.has(visibility)) {
            errors.push(`visibility must be one of: ${CHALLENGE_VISIBILITIES.join(', ')}`);
        } else {
            updates.visibility = visibility;
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

export function validateListChallengesInput(query = {}) {
    const value = {};
    const errors = [];

    if (query.status !== undefined) {
        if (!CHALLENGE_STATUS_SET.has(query.status)) {
            errors.push(`status must be one of: ${CHALLENGE_STATUS.join(', ')}`);
        } else {
            value.status = query.status;
        }
    }

    if (query.createdBy !== undefined) {
        if (!isValidObjectId(query.createdBy)) {
            errors.push('createdBy must be a valid ObjectId');
        } else {
            value.createdBy = query.createdBy;
        }
    }

    if (query.mine !== undefined) {
        value.mine = query.mine === 'true' || query.mine === true;
    }

    if (query.visibility !== undefined) {
        if (!CHALLENGE_VISIBILITY_SET.has(query.visibility)) {
            errors.push(`visibility must be one of: ${CHALLENGE_VISIBILITIES.join(', ')}`);
        } else {
            value.visibility = query.visibility;
        }
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value };
}

export function validateChallengeId(id) {
    if (!isValidObjectId(id)) {
        return { error: 'challengeId must be a valid ObjectId' };
    }

    return { value: id };
}

export function validateRecordProgressInput(body = {}) {
    const days = body.days === undefined ? 1 : body.days;
    const value = {};
    const errors = [];

    toPositiveInteger(days, 'days', 1, 365, errors, value);

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value };
}

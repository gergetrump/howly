import mongoose from 'mongoose';
import { validateOffsetPagination } from '../../utils/pagination.js';
import { isValidTaxonomyCategoryKey } from '../taxonomy/taxonomyCategories.js';
import {
    CHALLENGE_FREQUENCIES,
    CHALLENGE_STATUS,
    CHALLENGE_VISIBILITIES,
    MAX_CHALLENGE_DURATION_DAYS,
} from './challenge.model.js';

const CHALLENGE_FREQUENCY_SET = new Set(CHALLENGE_FREQUENCIES);
const CHALLENGE_STATUS_SET = new Set(CHALLENGE_STATUS);
const CHALLENGE_VISIBILITY_SET = new Set(CHALLENGE_VISIBILITIES);
const CHALLENGE_SCOPES = ['active', 'friends', 'public', 'past'];
const CHALLENGE_SCOPE_SET = new Set(CHALLENGE_SCOPES);
const CHALLENGE_SORTS = ['recommended', 'createdAt', 'endsAt'];
const CHALLENGE_SORT_SET = new Set(CHALLENGE_SORTS);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const HABIT_TEMPLATE_FREQUENCIES = ['Daily', 'Weekly', 'Monthly'];
const HABIT_TEMPLATE_FREQUENCY_SET = new Set(HABIT_TEMPLATE_FREQUENCIES);

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

function validateHabitTemplate(input, errors) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        errors.push('habitTemplate is required');
        return null;
    }

    const template = {};
    const title = isNonEmptyString(input.title) ? input.title.trim() : '';

    if (!title) {
        errors.push('habitTemplate.title is required');
    } else if (title.length > 100) {
        errors.push('habitTemplate.title must be 100 characters or less');
    } else {
        template.title = title;
    }

    if (input.description !== undefined) {
        if (typeof input.description !== 'string') {
            errors.push('habitTemplate.description must be a string');
        } else if (input.description.length > 1000) {
            errors.push('habitTemplate.description must be 1000 characters or less');
        } else {
            template.description = input.description.trim();
        }
    }

    if (input.icon !== undefined) {
        if (typeof input.icon !== 'string') {
            errors.push('habitTemplate.icon must be a string');
        } else {
            template.icon = input.icon.trim() || 'C';
        }
    }

    const type = input.type ?? 'boolean';
    if (!['boolean', 'numeric'].includes(type)) {
        errors.push('habitTemplate.type must be one of: boolean, numeric');
    } else {
        template.type = type;
    }

    if (input.target !== undefined && input.target !== null && input.target !== '') {
        const target = Number(input.target);

        if (!Number.isFinite(target) || target < 1) {
            errors.push('habitTemplate.target must be a positive number');
        } else {
            template.target = target;
        }
    }

    if (input.unit !== undefined) {
        if (typeof input.unit !== 'string') {
            errors.push('habitTemplate.unit must be a string');
        } else if (input.unit.length > 50) {
            errors.push('habitTemplate.unit must be 50 characters or less');
        } else {
            template.unit = input.unit.trim();
        }
    }

    if (!HABIT_TEMPLATE_FREQUENCY_SET.has(input.frequency)) {
        errors.push(`habitTemplate.frequency must be one of: ${HABIT_TEMPLATE_FREQUENCIES.join(', ')}`);
    } else {
        template.frequency = input.frequency;
    }

    if (input.customDays !== undefined) {
        if (!Array.isArray(input.customDays)) {
            errors.push('habitTemplate.customDays must be an array');
        } else if (!input.customDays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)) {
            errors.push('habitTemplate.customDays must contain weekday numbers between 1 and 7');
        } else {
            template.customDays = input.customDays;
        }
    }

    if (input.category !== undefined) {
        if (typeof input.category !== 'string') {
            errors.push('habitTemplate.category must be a string');
        } else {
            template.category = input.category.trim() || 'Challenge';
        }
    }

    return template;
}

export function validateCreateChallengeInput(body = {}) {
    const errors = [];
    const value = {};
    const title = isNonEmptyString(body.title) ? body.title.trim() : '';
    const habitTemplate = validateHabitTemplate(body.habitTemplate, errors);
    const frequency = isNonEmptyString(body.frequency)
        ? body.frequency.trim()
        : habitTemplate?.frequency?.toLowerCase() ?? '';

    if (!title) {
        errors.push('title is required');
    } else if (title.length > 100) {
        errors.push('title must be 100 characters or less');
    } else {
        value.title = title;
    }

    if (habitTemplate) {
        value.habitTemplate = habitTemplate;
    }

    toOptionalString(body.description, 'description', 200, errors, value);

    if (body.coinReward !== undefined) {
        errors.push('coinReward is calculated from durationDays and cannot be set manually');
    }

    if (!CHALLENGE_FREQUENCY_SET.has(frequency)) {
        errors.push(`frequency must be one of: ${CHALLENGE_FREQUENCIES.join(', ')}`);
    } else {
        value.frequency = frequency;
    }

    toPositiveInteger(body.durationDays, 'durationDays', 1, MAX_CHALLENGE_DURATION_DAYS, errors, value);
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

    if (body.habitTemplate !== undefined) {
        const habitTemplate = validateHabitTemplate(body.habitTemplate, errors);

        if (habitTemplate) {
            updates.habitTemplate = habitTemplate;
        }
    }

    toOptionalString(body.description, 'description', 200, errors, updates);

    if (body.coinReward !== undefined) {
        errors.push('coinReward is calculated from durationDays and cannot be updated manually');
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
        toPositiveInteger(body.durationDays, 'durationDays', 1, MAX_CHALLENGE_DURATION_DAYS, errors, updates);
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
    const { error: paginationError, value: pagination } = validateOffsetPagination(query, {
        defaultLimit: 20,
        maxLimit: 50,
    });

    if (paginationError) {
        errors.push(paginationError);
    } else if (pagination) {
        value.pagination = pagination;
    }

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

    if (query.scope !== undefined) {
        if (!CHALLENGE_SCOPE_SET.has(query.scope)) {
            errors.push(`scope must be one of: ${CHALLENGE_SCOPES.join(', ')}`);
        } else {
            value.scope = query.scope;
        }
    }

    if (query.sort !== undefined) {
        if (!CHALLENGE_SORT_SET.has(query.sort)) {
            errors.push(`sort must be one of: ${CHALLENGE_SORTS.join(', ')}`);
        } else {
            value.sort = query.sort;
        }
    }

    if (query.categoryKey !== undefined) {
        if (typeof query.categoryKey !== 'string' || !query.categoryKey.trim()) {
            errors.push('categoryKey must be a non-empty string');
        } else if (!isValidTaxonomyCategoryKey(query.categoryKey.trim())) {
            errors.push('categoryKey must be a valid taxonomy category');
        } else {
            value.categoryKey = query.categoryKey.trim();
        }
    }

    const paginationResult = validateOffsetPagination(query, {
        defaultLimit: 20,
        maxLimit: 50,
    });

    if (paginationResult.error) {
        errors.push(paginationResult.error);
    } else if (paginationResult.value) {
        value.pagination = paginationResult.value;
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

export function validateChallengeInvitationId(id) {
    if (!isValidObjectId(id)) {
        return { error: 'invitationId must be a valid ObjectId' };
    }

    return { value: id };
}

export function validateCreateInvitationInput(body = {}) {
    const inviteeId = body.inviteeId;

    if (!isValidObjectId(inviteeId)) {
        return { error: 'inviteeId must be a valid ObjectId' };
    }

    return { value: { inviteeId } };
}

export function validateJoinChallengeInput() {
    return { value: {} };
}

export function validateAcceptInvitationInput() {
    return { value: {} };
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

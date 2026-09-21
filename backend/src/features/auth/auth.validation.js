// Validation helpers for auth request payloads.
import { validateDisplayNameValue, validateUsernameValue } from '../../utils/accountInputValidation.js';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

// Validate register payload for local auth.
export function validateRegisterInput(body = {}) {
    const errors = [];
    const usernameResult = validateUsernameValue(body.username);
    const email = isNonEmptyString(body.email) ? body.email.trim().toLowerCase() : '';
    const firstNameResult = validateDisplayNameValue(body.firstName, 'firstName');
    const lastNameResult = validateDisplayNameValue(body.lastName, 'lastName');
    const password = typeof body.password === 'string' ? body.password : '';

    if (usernameResult.error) {
        errors.push(usernameResult.error);
    }

    if (!email) {
        errors.push('email is required');
    } else if (!isValidEmail(email)) {
        errors.push('email must be a valid email address');
    }

    if (firstNameResult.error) {
        errors.push(firstNameResult.error);
    }

    if (lastNameResult.error) {
        errors.push(lastNameResult.error);
    }

    if (!password) {
        errors.push('password is required');
    } else if (password.length < 8) {
        errors.push('password must be at least 8 characters');
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return {
        value: {
            username: usernameResult.value,
            email,
            firstName: firstNameResult.value,
            lastName: lastNameResult.value,
            password,
        },
    };
}

// Validate login payload for local auth.
export function validateLoginInput(body = {}) {
    const errors = [];
    const identifier = isNonEmptyString(body.identifier)
        ? body.identifier.trim()
        : isNonEmptyString(body.email)
            ? body.email.trim()
            : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!identifier) {
        errors.push('email or username is required');
    } else if (identifier.length > 254) {
        errors.push('email or username is too long');
    }

    if (!password) {
        errors.push('password is required');
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value: { identifier, password } };
}

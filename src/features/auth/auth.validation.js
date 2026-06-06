// Validation helpers for auth request payloads.
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

// Validate register payload for local auth.
export function validateRegisterInput(body = {}) {
    const errors = [];
    const username = isNonEmptyString(body.username) ? body.username.trim() : '';
    const email = isNonEmptyString(body.email) ? body.email.trim().toLowerCase() : '';
    const firstName = isNonEmptyString(body.firstName) ? body.firstName.trim() : '';
    const lastName = isNonEmptyString(body.lastName) ? body.lastName.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username) {
        errors.push('username is required');
    } else if (username.length < 3 || username.length > 30) {
        errors.push('username must be between 3 and 30 characters');
    }
    if (!email) {
        errors.push('email is required');
    } else if (!isValidEmail(email)) {
        errors.push('email must be a valid email address');
    }

    if (!firstName) {
        errors.push('firstName is required');
    } else if (firstName.length > 50) {
        errors.push('firstName must be 50 characters or less');
    }

    if (!lastName) {
        errors.push('lastName is required');
    } else if (lastName.length > 50) {
        errors.push('lastName must be 50 characters or less');
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
            username,
            email,
            firstName,
            lastName,
            password,
        },
    };
}

// Validate login payload for local auth.
export function validateLoginInput(body = {}) {
    const errors = [];
    const email = isNonEmptyString(body.email) ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email) {
        errors.push('email is required');
    } else if (!isValidEmail(email)) {
        errors.push('email must be a valid email address');
    }

    if (!password) {
        errors.push('password is required');
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value: { email, password } };
}

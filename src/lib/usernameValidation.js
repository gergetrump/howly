const USERNAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const RESERVED_USERNAMES = new Set([
    'admin',
    'administrator',
    'api',
    'howly',
    'moderator',
    'root',
    'support',
    'system',
]);

/* Normalizes a username via Unicode  and trims surrounding whitespace. */
export function normalizeUsername(value) {
    return typeof value === 'string' ? value.normalize('NFKC').trim() : '';
}

// Returns a user-facing error message, or '' when the format is fine.
export function validateUsernameFormat(value) {
    const username = normalizeUsername(value);

    if (!username) {
        return 'Username is required.';
    }

    if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
        return 'Username must be between 3 and 30 characters.';
    }

    if (!USERNAME_PATTERN.test(username)) {
        return 'Username may only contain letters, numbers, dots, underscores, or hyphens.';
    }

    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
        return 'Username is reserved.';
    }

    return '';
}

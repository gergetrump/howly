// Client-side username *format* checks for instant signup feedback.
//
// The profanity/blocklist check lives ONLY on the server (POST /auth/check-username)
// so the word list is never shipped to the browser. These format rules mirror the
// non-sensitive parts of the backend (src/utils/accountInputValidation.js) purely so
// obvious typos get flagged with zero latency and without a network round-trip.
//
// A '' result here does NOT mean the username is allowed — the server still has the
// final say (blocklist + uniqueness). This is a UX shortcut, not the security boundary.

const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;
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
        return 'Username may only contain letters, numbers, underscores, or hyphens.';
    }

    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
        return 'Username is reserved.';
    }

    return '';
}

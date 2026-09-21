const LEET_MAP = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '9': 'g',
    '@': 'a',
    '$': 's',
    '!': 'i',
    '|': 'i',
};

const BLOCKED_USERNAME_TERMS = [
    'nigger',
    'nigga',
    'faggot',
    'retard',
    'kike',
    'chink',
    'gook',
    'tranny',
    'wetback',
    'fuck',
    'shit',
    'bitch',
    'cunt',
    'whore',
    'slut',
    'asshole',
    'pussy',
    'sexy',
    'nazi',
    'hitler',
    'kkk',
];

/* Normalizes a string for matching: lowercases it, reverses common leetspeak substitutions, and strips non-letters. */
function normalizeForMatch(value) {
    const lowered = String(value ?? '').toLowerCase();
    const unleeted = lowered.replace(/./g, (character) => LEET_MAP[character] ?? character);
    return unleeted.replace(/[^a-z]/g, '');
}

/* Returns the first blocked/offensive term detected in a username, or null if it is clean. */
export function findBlockedUsernameTerm(value) {
    const normalized = normalizeForMatch(value);

    if (!normalized) {
        return null;
    }

    return BLOCKED_USERNAME_TERMS.find((term) => normalized.includes(term)) ?? null;
}

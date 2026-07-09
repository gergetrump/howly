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
    'nazi',
    'hitler',
    'kkk',
];

function normalizeForMatch(value) {
    const lowered = String(value ?? '').toLowerCase();
    const unleeted = lowered.replace(/./g, (character) => LEET_MAP[character] ?? character);
    return unleeted.replace(/[^a-z]/g, '');
}

export function findBlockedUsernameTerm(value) {
    const normalized = normalizeForMatch(value);

    if (!normalized) {
        return null;
    }

    return BLOCKED_USERNAME_TERMS.find((term) => normalized.includes(term)) ?? null;
}

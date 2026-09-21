export const PENDING_COMPANION_INTENT_KEY = 'howly:pendingCompanionIntent';

export function buildTrendCompanionIntent(item, periodInRange) {
    const label = item.label?.trim() || item.canonicalHabitKey || 'this habit';

    const suggestGoal = [
        `Start a ${label} habit.`,
        item.categoryLabel ? `Area: ${item.categoryLabel}.` : '',
        periodInRange ? `Trending ${periodInRange}.` : 'Trending on Howly.',
        'Suggest 3 small, specific habits.',
    ].filter(Boolean).join(' ').slice(0, 200);

    return {
        displayGoal: `I want to do ${label}`,
        suggestGoal,
        canonicalHabitKey: item.canonicalHabitKey ?? null,
        categoryLabel: item.categoryLabel ?? null,
    };
}

export function isValidCompanionIntent(intent) {
    return Boolean(intent?.displayGoal && intent?.suggestGoal);
}

export function storePendingCompanionIntent(intent) {
    if (!isValidCompanionIntent(intent)) {
        return;
    }

    sessionStorage.setItem(PENDING_COMPANION_INTENT_KEY, JSON.stringify(intent));
}

export function readPendingCompanionIntent() {
    const raw = sessionStorage.getItem(PENDING_COMPANION_INTENT_KEY);
    if (!raw) {
        return null;
    }

    try {
        const intent = JSON.parse(raw);
        return isValidCompanionIntent(intent) ? intent : null;
    } catch {
        return null;
    }
}

export function clearPendingCompanionIntent() {
    sessionStorage.removeItem(PENDING_COMPANION_INTENT_KEY);
}

export function consumePendingCompanionIntent() {
    const intent = readPendingCompanionIntent();
    if (intent) {
        clearPendingCompanionIntent();
    }
    return intent;
}

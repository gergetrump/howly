export const PLAN_KEYS = Object.freeze({
    FREE: 'free',
    PREMIUM: 'premium',
});

export const PLANS = Object.freeze({
    [PLAN_KEYS.FREE]: Object.freeze({
        key: PLAN_KEYS.FREE,
        label: 'Free',
        limits: Object.freeze({
            maxHabits: 4,
            maxActiveChallenges: 2,
            maxActiveCreatedChallenges: 0,
        }),
        permissions: Object.freeze({
            canCreateChallenges: false,
            canBuyPremiumItems: false,
        }),
        monthlyBenefits: Object.freeze({
            coins: 0,
            streakShields: 0,
        }),
    }),
    [PLAN_KEYS.PREMIUM]: Object.freeze({
        key: PLAN_KEYS.PREMIUM,
        label: 'Premium',
        limits: Object.freeze({
            maxHabits: 20,
            maxActiveChallenges: 8,
            maxActiveCreatedChallenges: 3,
        }),
        permissions: Object.freeze({
            canCreateChallenges: true,
            canBuyPremiumItems: true,
        }),
        monthlyBenefits: Object.freeze({
            coins: 300,
            streakShields: 1,
        }),
        billing: Object.freeze({
            priceInCents: 499,
            currency: 'eur',
        }),
    }),
});

// Maximum streak shields a user can stockpile (caps monthly grants + purchases).
export const MAX_STREAK_SHIELDS = 3;

// Grace window (days) to repair a streak after a missed day with no shield.
export const STREAK_REPAIR_WINDOW_DAYS = 2;

export function hasPremiumAccess(user) {
    return user?.role === 'admin' || user?.isPremium === true;
}

export function getPlanKeyForUser(user) {
    return hasPremiumAccess(user) ? PLAN_KEYS.PREMIUM : PLAN_KEYS.FREE;
}

export function getPlanForUser(user) {
    return PLANS[getPlanKeyForUser(user)];
}

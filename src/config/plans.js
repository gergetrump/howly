export const PLAN_KEYS = Object.freeze({
    FREE: 'free',
    PREMIUM: 'premium',
});

export const PLANS = Object.freeze({
    [PLAN_KEYS.FREE]: Object.freeze({
        key: PLAN_KEYS.FREE,
        label: 'Free',
        limits: Object.freeze({
            maxHabits: 2,
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
            maxHabits: 6,
            maxActiveChallenges: 5,
            maxActiveCreatedChallenges: 1,
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

export function hasPremiumAccess(user) {
    return user?.role === 'admin' || user?.isPremium === true;
}

export function getPlanKeyForUser(user) {
    return hasPremiumAccess(user) ? PLAN_KEYS.PREMIUM : PLAN_KEYS.FREE;
}

export function getPlanForUser(user) {
    return PLANS[getPlanKeyForUser(user)];
}

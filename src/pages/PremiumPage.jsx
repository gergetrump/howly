import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Coins, Crown, Loader2, Shield, Sparkles, X } from 'lucide-react';

import { Page, PageSection, Heading } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/authContext';
import { createCheckoutSession, createManagePremiumSession } from '@/services/paymentService';
import { getCurrentUserPlan } from '@/services/userService';

const FALLBACK_FREE_PLAN = {
    label: 'Free',
    limits: {
        maxHabits: 2,
        maxActiveChallenges: 2,
        maxActiveCreatedChallenges: 0,
    },
    permissions: {
        canCreateChallenges: false,
        canBuyPremiumItems: false,
    },
    monthlyBenefits: {
        coins: 0,
        streakShields: 0,
    },
};

const FALLBACK_PREMIUM_PLAN = {
    label: 'Premium',
    limits: {
        maxHabits: 6,
        maxActiveChallenges: 5,
        maxActiveCreatedChallenges: 1,
    },
    permissions: {
        canCreateChallenges: true,
        canBuyPremiumItems: true,
    },
    monthlyBenefits: {
        coins: 300,
        streakShields: 1,
    },
    billing: {
        priceInCents: 499,
        currency: 'eur',
    },
};

function formatPrice(plan) {
    const billing = plan?.billing;

    if (!billing?.priceInCents || !billing?.currency) {
        return '€4.99';
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: billing.currency.toUpperCase(),
    }).format(billing.priceInCents / 100);
}

function yesNo(value) {
    return value ? 'Included' : 'Not included';
}

function buildHighlights(plan) {
    return [
        {
            icon: Crown,
            title: `Create up to ${plan.limits?.maxHabits ?? 6} habits`,
            text: 'Track more routines without pruning your current habit list.',
        },
        {
            icon: Sparkles,
            title: 'Create your own challenges',
            text: `Join up to ${plan.limits?.maxActiveChallenges ?? 5} active challenges and host one of your own.`,
        },
        {
            icon: Coins,
            title: `${plan.monthlyBenefits?.coins ?? 300} moon coins every month`,
            text: 'Use bonus coins for accessories and shop items.',
        },
        {
            icon: Shield,
            title: `${plan.monthlyBenefits?.streakShields ?? 1} streak shield every month`,
            text: 'A little protection for the days life gets loud.',
        },
    ];
}

function FeatureRow({ label, freeValue, premiumValue }) {
    return (
        <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr] items-center gap-3 border-b border-theme-text/10 px-4 py-3 text-sm last:border-b-0">
            <span className="font-medium text-theme-text">{label}</span>
            <span className="text-theme-text-soft">{freeValue}</span>
            <span className="font-semibold text-theme-gold">{premiumValue}</span>
        </div>
    );
}

export function PremiumPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [planInfo, setPlanInfo] = useState(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [isStartingCheckout, setIsStartingCheckout] = useState(false);
    const [isManagingPremium, setIsManagingPremium] = useState(false);
    const [error, setError] = useState('');

    const freePlan = planInfo?.plans?.free ?? FALLBACK_FREE_PLAN;
    const premiumPlan = planInfo?.plans?.premium ?? FALLBACK_PREMIUM_PLAN;
    const isPremium = user?.isPremium === true || user?.role === 'admin' || planInfo?.currentPlanKey === 'premium';
    const redirectMessage = location.state?.message;
    const returnTo = location.state?.returnTo;
    const premiumHighlights = useMemo(() => buildHighlights(premiumPlan), [premiumPlan]);

    useEffect(() => {
        let isCurrent = true;

        getCurrentUserPlan()
            .then((response) => {
                if (isCurrent) {
                    setPlanInfo(response);
                }
            })
            .catch((planError) => {
                console.error('Failed to load premium plan:', planError);
                if (isCurrent) {
                    setError('Premium details could not be loaded. The checkout is still available.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoadingPlan(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    async function handleStartCheckout() {
        try {
            setError('');
            setIsStartingCheckout(true);

            const response = await createCheckoutSession();

            if (!response?.url) {
                throw new Error('Checkout session did not include a URL');
            }

            window.location.href = response.url;
        } catch (checkoutError) {
            setError(checkoutError.message || 'Could not start Premium checkout.');
            setIsStartingCheckout(false);
        }
    }

    async function handleManagePremium() {
        try {
            setError('');
            setIsManagingPremium(true);

            const response = await createManagePremiumSession();

            if (!response?.url) {
                throw new Error('Manage premium session did not include a URL');
            }

            window.location.href = response.url;
        } catch (manageError) {
            setError(manageError.message || 'Could not open Premium management.');
            setIsManagingPremium(false);
        }
    }

    return (
        <Page theme="forest">
            <Heading
                title="Howly Premium"
                subtitle="More room for habits, challenges, coins, and shop rewards."
                streakDays={user?.streak ?? 0}
            />

            <PageSection width="lg" align="center">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-2xl border border-theme-text/10 bg-theme-surface/80 p-6 shadow-2xl">
                        <div className="flex flex-col gap-5">
                            {redirectMessage ? (
                                <p className="rounded-xl border border-amber-200/30 bg-amber-300/10 px-4 py-3 text-sm text-theme-gold">
                                    {redirectMessage}
                                </p>
                            ) : null}

                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-300 text-slate-950">
                                        <Crown className="size-7" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold uppercase tracking-wide text-theme-gold">
                                            Premium
                                        </p>
                                        <h2 className="text-3xl font-bold text-theme-text">
                                            Unlock the full Howly plan
                                        </h2>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm leading-6 text-theme-text-soft">
                                    Premium removes the free limits that slow down bigger routines and gives you monthly rewards for the shop.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {premiumHighlights.map(({ icon: Icon, title, text }) => (
                                    <div key={title} className="rounded-xl border border-theme-text/10 bg-theme-text/5 p-4">
                                        <Icon className="size-6 text-theme-gold" aria-hidden="true" />
                                        <h3 className="mt-3 font-semibold text-theme-text">{title}</h3>
                                        <p className="mt-1 text-sm leading-5 text-theme-text-muted">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <aside className="rounded-2xl border border-amber-200/30 bg-amber-300/10 p-6 text-theme-text shadow-2xl">
                        <p className="text-sm font-semibold uppercase tracking-wide text-theme-gold">
                            Monthly plan
                        </p>
                        <div className="mt-4 flex items-end gap-2">
                            <span className="text-5xl font-black">{formatPrice(premiumPlan)}</span>
                            <span className="pb-2 text-sm text-theme-gold">/ month</span>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-amber-50/90">
                            Cancel anytime. Premium stays active until the end of the paid billing period.
                        </p>

                        {error ? (
                            <p className="mt-4 rounded-xl border border-theme-danger/30 bg-red-500/20 px-4 py-3 text-sm text-theme-danger">
                                {error}
                            </p>
                        ) : null}

                        {isPremium ? (
                            <Button
                                type="button"
                                onClick={handleManagePremium}
                                disabled={isManagingPremium}
                                className="mt-6 h-12 w-full bg-white text-slate-950 hover:bg-theme-invert/85"
                            >
                                {isManagingPremium ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                                Manage Premium
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleStartCheckout}
                                disabled={isStartingCheckout}
                                className="mt-6 h-12 w-full bg-amber-300 text-slate-950 hover:bg-amber-200"
                            >
                                {isStartingCheckout ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                                Upgrade to Premium
                            </Button>
                        )}

                        {returnTo ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(returnTo)}
                                className="mt-3 h-12 w-full border-theme-text/20 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
                            >
                                Go back
                            </Button>
                        ) : null}
                    </aside>
                </div>
            </PageSection>

            <PageSection
                width="lg"
                align="center"
                title="Free vs Premium"
                description={isLoadingPlan ? 'Loading plan details...' : 'Premium values come from the backend plan configuration.'}
            >
                <div className="overflow-hidden rounded-2xl border border-theme-text/10 bg-theme-surface/80 text-theme-text shadow-xl">
                    <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr] gap-3 bg-theme-text/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-theme-text-soft">
                        <span>Feature</span>
                        <span>{freePlan.label ?? 'Free'}</span>
                        <span>{premiumPlan.label ?? 'Premium'}</span>
                    </div>
                    <FeatureRow
                        label="Habits"
                        freeValue={`${freePlan.limits?.maxHabits ?? 2}`}
                        premiumValue={`${premiumPlan.limits?.maxHabits ?? 6}`}
                    />
                    <FeatureRow
                        label="Active challenges"
                        freeValue={`${freePlan.limits?.maxActiveChallenges ?? 2}`}
                        premiumValue={`${premiumPlan.limits?.maxActiveChallenges ?? 5}`}
                    />
                    <FeatureRow
                        label="Create challenges"
                        freeValue={yesNo(freePlan.permissions?.canCreateChallenges)}
                        premiumValue={yesNo(premiumPlan.permissions?.canCreateChallenges)}
                    />
                    <FeatureRow
                        label="Premium shop items"
                        freeValue={yesNo(freePlan.permissions?.canBuyPremiumItems)}
                        premiumValue={yesNo(premiumPlan.permissions?.canBuyPremiumItems)}
                    />
                    <FeatureRow
                        label="Monthly moon coins"
                        freeValue={`${freePlan.monthlyBenefits?.coins ?? 0}`}
                        premiumValue={`${premiumPlan.monthlyBenefits?.coins ?? 300}`}
                    />
                    <FeatureRow
                        label="Monthly streak shields"
                        freeValue={`${freePlan.monthlyBenefits?.streakShields ?? 0}`}
                        premiumValue={`${premiumPlan.monthlyBenefits?.streakShields ?? 1}`}
                    />
                </div>
            </PageSection>

            <PageSection width="lg" align="center">
                <div className="rounded-2xl border border-theme-text/10 bg-theme-text/5 p-5 text-sm text-theme-text-soft">
                    <div className="flex items-start gap-3">
                        {isPremium ? (
                            <Check className="mt-0.5 size-5 shrink-0 text-theme-success" aria-hidden="true" />
                        ) : (
                            <X className="mt-0.5 size-5 shrink-0 text-theme-text-muted" aria-hidden="true" />
                        )}
                        <p>
                            {isPremium
                                ? 'Premium is active on your account. You can manage billing from this page.'
                                : 'Checkout is handled securely by Stripe. After payment, Howly confirms the session and refreshes your Premium status.'}
                        </p>
                    </div>
                </div>
            </PageSection>
        </Page>
    );
}

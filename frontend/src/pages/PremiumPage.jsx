import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Check, Coins, Crown, Loader2, MessageCircle, Shield, Sparkles } from 'lucide-react';

import { Page, PageSection, Heading } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { createCheckoutSession, createManagePremiumSession } from '@/services/paymentService';
import { getCurrentUserPlan } from '@/services/userService';

const FALLBACK_FREE_PLAN = {
    label: 'Free',
    limits: {
        maxHabits: 4,
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
        maxHabits: 20,
        maxActiveChallenges: 8,
        maxActiveCreatedChallenges: 3,
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
    const maxActiveCreatedChallenges = plan.limits?.maxActiveCreatedChallenges ?? FALLBACK_PREMIUM_PLAN.limits.maxActiveCreatedChallenges;
    const hostedChallengesText = maxActiveCreatedChallenges === 1
        ? 'host one of your own'
        : `host up to ${maxActiveCreatedChallenges} of your own`;

    return [
        {
            icon: Crown,
            title: `Create up to ${plan.limits?.maxHabits ?? FALLBACK_PREMIUM_PLAN.limits.maxHabits} habits`,
            text: 'Track more routines without pruning your current habit list.',
        },
        {
            icon: Sparkles,
            title: 'Create your own challenges',
            text: `Join up to ${plan.limits?.maxActiveChallenges ?? FALLBACK_PREMIUM_PLAN.limits.maxActiveChallenges} active challenges and ${hostedChallengesText}.`,
        },
        {
            icon: Coins,
            title: `${plan.monthlyBenefits?.coins ?? FALLBACK_PREMIUM_PLAN.monthlyBenefits.coins} moon coins every month`,
            text: 'Use bonus coins for accessories and shop items.',
        },
        {
            icon: Shield,
            title: `${plan.monthlyBenefits?.streakShields ?? FALLBACK_PREMIUM_PLAN.monthlyBenefits.streakShields} streak shield every month`,
            text: 'A little protection for the days life gets loud.',
        },
    ];
}

const PREMIUM_INSIGHT_CARDS = [
    {
        icon: BarChart3,
        title: 'Analytics & Trends',
        text: 'Track habit completion, challenge progress, timing patterns, and community trends.',
        to: '/analytics',
    },
    {
        icon: MessageCircle,
        title: 'AI habit ideas',
        text: 'Chat with your companion for personalized habit suggestions when you need fresh routine ideas.',
        to: '/dashboard',
    },
];

function PremiumBenefitCard({ icon: Icon, title, text, to, isPremium, onOpen }) {
    const isClickable = Boolean(to && isPremium);
    const CardWrapper = isClickable ? 'button' : 'div';

    return (
        <CardWrapper
            type={isClickable ? 'button' : undefined}
            onClick={isClickable ? () => onOpen(to) : undefined}
            className={`rounded-xl border border-theme-text/10 bg-theme-text/5 p-4 text-left ${isClickable ? 'transition hover:border-theme-gold/30 hover:bg-theme-gold/5' : ''}`}
        >
            <Icon className="size-6 text-theme-gold" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-theme-text">{title}</h3>
            <p className="mt-1 text-sm leading-5 text-theme-text-muted">{text}</p>
            {isClickable ? (
                <p className="mt-3 text-sm font-semibold text-theme-gold">Open {title}</p>
            ) : null}
        </CardWrapper>
    );
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
    const premiumHighlights = useMemo(
        () => [...buildHighlights(premiumPlan), ...PREMIUM_INSIGHT_CARDS],
        [premiumPlan],
    );

    useEffect(() => {
        let isCurrent = true;

        getCurrentUserPlan()
            .then((response) => {
                if (isCurrent) {
                    setPlanInfo(response);
                }
            })
            .catch((planError) => {
                console.warn('Failed to load premium plan. Using fallback plan details:', planError);
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

            <PageSection width="full" align="center" className="max-w-6xl">
                <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,0.42fr)] xl:gap-8">
                    <section className="rounded-2xl border border-theme-text/10 bg-theme-surface p-6 shadow-2xl">
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
                                    Premium removes the free limits that slow down bigger routines, unlocks deeper progress insights, and gives you monthly rewards for the shop.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {premiumHighlights.map(({ icon, title, text, to }) => (
                                    <PremiumBenefitCard
                                        key={title}
                                        icon={icon}
                                        title={title}
                                        text={text}
                                        to={to}
                                        isPremium={isPremium}
                                        onOpen={navigate}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>

                    <aside className="self-start rounded-2xl border border-amber-200/30 bg-theme-surface p-6 text-theme-text shadow-2xl">
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
                width="full"
                align="center"
                title="Free vs Premium"
                description={isLoadingPlan ? 'Loading plan details...' : 'See what changes when you upgrade.'}
                className="mt-10 max-w-6xl"
            >
                <div className="overflow-hidden rounded-2xl border border-theme-text/10 bg-theme-surface text-theme-text shadow-xl">
                    <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr] gap-3 bg-theme-surface-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-theme-text-soft">
                        <span>Feature</span>
                        <span>{freePlan.label ?? 'Free'}</span>
                        <span>{premiumPlan.label ?? 'Premium'}</span>
                    </div>
                    <FeatureRow
                        label="Habits"
                        freeValue={`${freePlan.limits?.maxHabits ?? FALLBACK_FREE_PLAN.limits.maxHabits}`}
                        premiumValue={`${premiumPlan.limits?.maxHabits ?? FALLBACK_PREMIUM_PLAN.limits.maxHabits}`}
                    />
                    <FeatureRow
                        label="Joined active challenges"
                        freeValue={`${freePlan.limits?.maxActiveChallenges ?? FALLBACK_FREE_PLAN.limits.maxActiveChallenges}`}
                        premiumValue={`${premiumPlan.limits?.maxActiveChallenges ?? FALLBACK_PREMIUM_PLAN.limits.maxActiveChallenges}`}
                    />
                    <FeatureRow
                        label="Created active challenges"
                        freeValue={`${freePlan.limits?.maxActiveCreatedChallenges ?? FALLBACK_FREE_PLAN.limits.maxActiveCreatedChallenges}`}
                        premiumValue={`${premiumPlan.limits?.maxActiveCreatedChallenges ?? FALLBACK_PREMIUM_PLAN.limits.maxActiveCreatedChallenges}`}
                    />
                    <FeatureRow
                        label="Monthly streak shields"
                        freeValue={`${freePlan.monthlyBenefits?.streakShields ?? FALLBACK_FREE_PLAN.monthlyBenefits.streakShields}`}
                        premiumValue={`${premiumPlan.monthlyBenefits?.streakShields ?? FALLBACK_PREMIUM_PLAN.monthlyBenefits.streakShields}`}
                    />
                    <FeatureRow
                        label="Monthly moon coins"
                        freeValue={`${freePlan.monthlyBenefits?.coins ?? FALLBACK_FREE_PLAN.monthlyBenefits.coins}`}
                        premiumValue={`${premiumPlan.monthlyBenefits?.coins ?? FALLBACK_PREMIUM_PLAN.monthlyBenefits.coins}`}
                    />
                    <FeatureRow
                        label="Premium shop items"
                        freeValue={yesNo(freePlan.permissions?.canBuyPremiumItems)}
                        premiumValue={yesNo(premiumPlan.permissions?.canBuyPremiumItems)}
                    />
                    <FeatureRow
                        label="Analytics & trends"
                        freeValue="Not included"
                        premiumValue="Included"
                    />
                    <FeatureRow
                        label="AI habit ideas"
                        freeValue="Not included"
                        premiumValue="Included"
                    />
                    <FeatureRow
                        label="Themes"
                        freeValue="Default only"
                        premiumValue="All themes"
                    />
                    <FeatureRow
                        label="Companions"
                        freeValue="Starter choice only"
                        premiumValue="Switch anytime"
                    />
                </div>
            </PageSection>

            <PageSection width="lg" align="center">
                <div className="rounded-2xl border border-theme-text/10 bg-theme-surface p-5 text-sm text-theme-text-soft">
                    <div className="flex items-start gap-3">
                        {isPremium ? (
                            <Check className="mt-0.5 size-5 shrink-0 text-theme-success" aria-hidden="true" />
                        ) : null}
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

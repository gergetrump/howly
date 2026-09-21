import { useEffect, useState } from 'react';
import { Check, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { createCheckoutSession } from '@/services/paymentService';
import { getCurrentUserPlan } from '@/services/userService';

const FALLBACK_PREMIUM_BENEFITS = [
    'Create more habits',
    'Create your own challenges',
    'Join more active challenges',
    'Get monthly moon coins',
    'Receive monthly streak shields',
    'Unlock premium shop items',
];

function buildPremiumBenefits(plan) {
    if (!plan) {
        return FALLBACK_PREMIUM_BENEFITS;
    }

    const benefits = [];

    if (plan.limits?.maxHabits) {
        benefits.push(`Create up to ${plan.limits.maxHabits} habits`);
    }

    if (plan.permissions?.canCreateChallenges) {
        benefits.push('Create your own challenges');
    }

    if (plan.limits?.maxActiveChallenges) {
        benefits.push(`Join up to ${plan.limits.maxActiveChallenges} active challenges`);
    }

    if (plan.monthlyBenefits?.coins) {
        benefits.push(`Get ${plan.monthlyBenefits.coins} moon coins every month`);
    }

    if (plan.monthlyBenefits?.streakShields) {
        benefits.push(`Receive ${plan.monthlyBenefits.streakShields} streak shield every month`);
    }

    if (plan.permissions?.canBuyPremiumItems) {
        benefits.push('Unlock premium shop items');
    }

    return benefits.length > 0 ? benefits : FALLBACK_PREMIUM_BENEFITS;
}

export function PremiumUpgradeDialog({
    open,
    onOpenChange,
    message = 'Upgrade to Premium to unlock this feature.',
    onBeforeCheckout,
}) {
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');
    const [premiumPlan, setPremiumPlan] = useState(null);
    const premiumBenefits = buildPremiumBenefits(premiumPlan);

    useEffect(() => {
        let isMounted = true;

        if (!open || premiumPlan) {
            return () => {
                isMounted = false;
            };
        }

        getCurrentUserPlan()
            .then((planResponse) => {
                if (isMounted) {
                    setPremiumPlan(planResponse?.plans?.premium ?? null);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setPremiumPlan(null);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [open, premiumPlan]);

    async function handleBuyPremium() {
        setIsCheckingOut(true);
        setCheckoutError('');

        try {
            onBeforeCheckout?.();
            const session = await createCheckoutSession();

            if (!session?.url) {
                throw new Error('Premium checkout is not available right now.');
            }

            window.location.href = session.url;
        } catch (error) {
            setCheckoutError(error.message || 'Premium checkout could not be started.');
            setIsCheckingOut(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg rounded-2xl border-theme-text/10 bg-theme-surface p-8 text-theme-text shadow-2xl">
                <DialogHeader className="items-center text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-300/20">
                        <Crown className="size-7" aria-hidden="true" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">Upgrade to Premium</DialogTitle>
                    <DialogDescription className="text-base text-theme-text-soft">
                        {message}
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-2xl border border-theme-text/10 bg-theme-text/5 p-4">
                    <ul className="space-y-3">
                        {premiumBenefits.map((benefit) => (
                            <li key={benefit} className="flex items-start gap-3 text-sm text-theme-text">
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                                    <Check className="size-3.5" aria-hidden="true" />
                                </span>
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {checkoutError ? (
                    <p className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                        {checkoutError}
                    </p>
                ) : null}

                <DialogFooter className="border-theme-text/10 bg-theme-text/5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isCheckingOut}
                        className="border-theme-text/20 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleBuyPremium}
                        disabled={isCheckingOut}
                        className="bg-amber-300 text-slate-950 hover:bg-amber-200"
                    >
                        {isCheckingOut ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                        Buy Premium
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

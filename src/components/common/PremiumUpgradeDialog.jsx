import { useState } from 'react';
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
import { createPremiumCheckoutSession } from '@/services/paymentApi';

const PREMIUM_BENEFITS = [
    'Create up to 6 habits',
    'Create your own challenges',
    'Join up to 5 active challenges',
    'Get 300 moon coins every month',
    'Receive 1 streak shield every month',
    'Unlock premium shop items',
];

export function PremiumUpgradeDialog({
    open,
    onOpenChange,
    message = 'Upgrade to Premium to unlock this feature.',
    onBeforeCheckout,
}) {
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');

    async function handleBuyPremium() {
        setIsCheckingOut(true);
        setCheckoutError('');

        try {
            onBeforeCheckout?.();
            const session = await createPremiumCheckoutSession();

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
            <DialogContent className="sm:max-w-lg rounded-2xl border-white/10 bg-[#1e1b3a] p-8 text-white shadow-2xl">
                <DialogHeader className="items-center text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-300/20">
                        <Crown className="size-7" aria-hidden="true" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">Upgrade to Premium</DialogTitle>
                    <DialogDescription className="text-base text-slate-300">
                        {message}
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <ul className="space-y-3">
                        {PREMIUM_BENEFITS.map((benefit) => (
                            <li key={benefit} className="flex items-start gap-3 text-sm text-slate-100">
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                                    <Check className="size-3.5" aria-hidden="true" />
                                </span>
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {checkoutError ? (
                    <p className="rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {checkoutError}
                    </p>
                ) : null}

                <DialogFooter className="border-white/10 bg-white/5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isCheckingOut}
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
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

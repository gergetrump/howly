import { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';

import { useAuth } from '@/context/authContext';
import { getItems } from '@/services/itemApi';
import { ItemCard } from '@/components/cards';
import { ActionButton } from '@/components/common';
import { StreakShieldIcon } from '@/components/brand/StreakShieldIcon.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Catalog asset key for the consumable Streak Freeze (mirrors the backend).
const STREAK_FREEZE_ASSET_KEY = 'streak-freeze';
// Reserve cap — keep in sync with backend config/plans.js (MAX_STREAK_SHIELDS).
const MAX_STREAK_SHIELDS = 3;

// Shop card for the Streak Freeze power-up. Renders as a normal ItemCard (same
// look as the wearable items) but with cart/buy controls like boost power-ups.
// Buying grants +1 shield through the shared inventory endpoint; the backend
// special-cases this asset and keeps the reserve capped.
export function StreakFreezeCard({
    onAddToCart,
    onBuy,
    getCartQuantity,
    isCartQuantityMax,
    isOwnedQuantityMax,
    isBuying,
    isFreeUser,
    onPremiumRequired,
}) {
    const { user } = useAuth();
    const [item, setItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    useEffect(() => {
        let active = true;

        getItems()
            .then((items) => {
                if (active) {
                    setItem((items ?? []).find((entry) => entry.assetKey === STREAK_FREEZE_ASSET_KEY) ?? null);
                }
            })
            .catch(() => {
                if (active) {
                    setItem(null);
                }
            })
            .finally(() => {
                if (active) {
                    setIsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    // Nothing to show until the catalog item exists.
    if (isLoading || !item) {
        return null;
    }

    const owned = user?.streakShields ?? 0;
    const cartQuantity = getCartQuantity?.(item) ?? 0;
    const cartQuantityMax = isCartQuantityMax?.(item) ?? false;
    const ownedQuantityMax = isOwnedQuantityMax?.(item) ?? owned >= MAX_STREAK_SHIELDS;

    function guardPremium(action) {
        if (isFreeUser && item?.premiumOnly) {
            onPremiumRequired?.();
            return;
        }

        action();
    }

    return (
        <ItemCard
            name="Streak Shield"
            price={item.price}
            showOwnedBadge={false}
            dense
            titleAction={(
                <Popover open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="grid h-6 w-6 place-items-center rounded-full border border-theme-text/10 bg-theme-text/10 text-theme-text transition hover:bg-theme-text/20 hover:text-theme-text"
                            aria-label="What does Streak Shield do?"
                        >
                            <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="end"
                        side="bottom"
                        sideOffset={8}
                        className="z-[120] w-56 rounded-xl border border-violet-200/20 bg-theme-bg/95 p-3 text-left text-[11px] font-semibold leading-snug text-theme-text shadow-xl shadow-slate-950/30"
                    >
                        Save one habit streak or your overall streak before the repair time runs out. You can hold up to 3 shields.
                    </PopoverContent>
                </Popover>
            )}
            visual={<StreakShieldIcon className="h-full w-auto py-1" />}
        >
            <ActionButton
                type="button"
                fullWidth
                className="col-span-2 h-8 px-3 text-xs disabled:bg-theme-text/10 disabled:text-theme-text-muted"
                disabled={cartQuantityMax}
                onClick={() => guardPremium(() => onAddToCart?.(item))}
            >
                {cartQuantity > 0 ? `${cartQuantity}x in cart` : cartQuantityMax ? 'Max 3' : 'Add to cart'}
            </ActionButton>
            <ActionButton
                type="button"
                fullWidth
                className="col-span-2 h-8 px-3 text-xs disabled:bg-theme-text/10 disabled:text-theme-text-muted"
                disabled={isBuying || ownedQuantityMax}
                onClick={() => guardPremium(() => onBuy?.(item))}
            >
                {isBuying ? 'Buying...' : ownedQuantityMax ? 'Full' : 'Buy'}
            </ActionButton>
        </ItemCard>
    );
}

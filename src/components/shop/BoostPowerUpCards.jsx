import { useEffect, useMemo, useState } from 'react';
import { CircleHelp } from 'lucide-react';

import { ActionButton } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { BigBoost, MediumBoost, SmallBoost } from '@/components/brand';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getItems } from '@/services/itemApi';

const BOOSTS = [
    {
        assetKey: 'small-boost',
        fallbackName: 'Small Boost',
        Visual: SmallBoost,
        rewardLabel: '+50 x3',
        description: 'Gives +50 coins for the next 3 completions of one habit. Use it from inventory.',
    },
    {
        assetKey: 'medium-boost',
        fallbackName: 'Medium Boost',
        Visual: MediumBoost,
        rewardLabel: '+75 x4',
        description: 'Gives +75 coins for the next 4 completions of one habit. Use it from inventory.',
    },
    {
        assetKey: 'big-boost',
        fallbackName: 'Big Boost',
        Visual: BigBoost,
        rewardLabel: '+100 x5',
        description: 'Gives +100 coins for the next 5 completions of one habit. Use it from inventory.',
    },
];

export function BoostPowerUpCards({
    onAddToCart,
    onBuy,
    getCartQuantity,
    isCartQuantityMax,
    isBuying,
    isFreeUser,
    onPremiumRequired,
}) {
    const [items, setItems] = useState([]);
    const [openHelpAssetKey, setOpenHelpAssetKey] = useState('');

    useEffect(() => {
        let active = true;

        getItems()
            .then((nextItems) => {
                if (active) {
                    setItems(nextItems ?? []);
                }
            })
            .catch(() => {
                if (active) {
                    setItems([]);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const boostItemsByAssetKey = useMemo(() => {
        return Object.fromEntries(
            BOOSTS.map((boost) => [
                boost.assetKey,
                items.find((item) => item.assetKey === boost.assetKey) ?? null,
            ]),
        );
    }, [items]);

    function guardPremium(item, action) {
        if (isFreeUser && item?.premiumOnly) {
            onPremiumRequired?.();
            return;
        }

        action();
    }

    return BOOSTS.map((boost) => {
        const item = boostItemsByAssetKey[boost.assetKey];

        if (!item) {
            return null;
        }

        const Visual = boost.Visual;
        const cartQuantity = getCartQuantity?.(item) ?? 0;
        const cartQuantityMax = isCartQuantityMax?.(item) ?? false;

        return (
            <ItemCard
                key={boost.assetKey}
                name={item.name || boost.fallbackName}
                price={item.price}
                premiumOnly={item.premiumOnly}
                showOwnedBadge={false}
                reserveBadgeSpace
                dense
                titleAction={(
                    <div className="flex items-center gap-1.5">
                        <span className="rounded-full border border-violet-300/30 bg-violet-400/15 px-2 py-1 text-[10px] font-bold text-violet-100">
                            {boost.rewardLabel}
                        </span>
                        <Popover
                            open={openHelpAssetKey === boost.assetKey}
                            onOpenChange={(isOpen) => {
                                setOpenHelpAssetKey(isOpen ? boost.assetKey : '');
                            }}
                        >
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/20 hover:text-white"
                                    aria-label={`What does ${item.name || boost.fallbackName} do?`}
                                >
                                    <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="end"
                                side="bottom"
                                sideOffset={8}
                                className="z-[120] w-52 rounded-xl border border-violet-200/20 bg-slate-950/95 p-3 text-left text-[11px] font-semibold leading-snug text-slate-100 shadow-xl shadow-slate-950/30"
                            >
                                {boost.description}
                            </PopoverContent>
                        </Popover>
                    </div>
                )}
                visual={<Visual className="h-full w-auto py-1" />}
            >
                <ActionButton
                    type="button"
                    fullWidth
                    className="h-8 px-3 text-xs disabled:bg-white/10 disabled:text-slate-500"
                    disabled={cartQuantityMax}
                    onClick={() => guardPremium(item, () => onAddToCart?.(item))}
                >
                    {cartQuantity > 0 ? `${cartQuantity}x in cart` : cartQuantityMax ? 'Max 20' : 'Add to cart'}
                </ActionButton>
                <ActionButton
                    type="button"
                    fullWidth
                    className="h-8 px-3 text-xs"
                    disabled={isBuying}
                    onClick={() => guardPremium(item, () => onBuy?.(item))}
                >
                    {isBuying ? 'Buying...' : 'Buy'}
                </ActionButton>
            </ItemCard>
        );
    });
}

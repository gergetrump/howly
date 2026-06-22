import { useEffect, useState } from 'react';

import { useAuth } from '@/context/authContext';
import { getItems } from '@/services/itemApi';
import { buyItem } from '@/services/inventoryApi';
import { ItemCard } from '@/components/cards';
import { ActionButton } from '@/components/common';
import { StreakFreezeIcon } from '@/components/brand/StreakFreezeIcon.jsx';

// Catalog asset key for the consumable Streak Freeze (mirrors the backend).
const STREAK_FREEZE_ASSET_KEY = 'streak-freeze';
// Reserve cap — keep in sync with backend config/plans.js (MAX_STREAK_SHIELDS).
const MAX_STREAK_SHIELDS = 3;

// Shop card for the Streak Freeze power-up. Renders as a normal ItemCard (same
// look as the wearable items) but with a single Buy button — no try-on, since
// it's a consumable. Buying grants +1 shield (capped) via the shared inventory
// endpoint; the backend special-cases this asset, so we apply the returned wallet.
export function StreakFreezeCard() {
    const { user, setUser } = useAuth();
    const [item, setItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBuying, setIsBuying] = useState(false);

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
    const isAtMax = owned >= MAX_STREAK_SHIELDS;
    const canAfford = (user?.coins ?? 0) >= item.price;
    const isDisabled = isBuying || isAtMax || !canAfford;

    let label = 'Buy';
    if (isBuying) {
        label = 'Buying…';
    } else if (isAtMax) {
        label = 'Full';
    }

    async function handleBuy() {
        if (isDisabled) {
            return;
        }

        setIsBuying(true);

        try {
            const result = await buyItem(item._id);

            // Consumable purchase returns the fresh wallet — apply it so the header
            // coins and freeze count update instantly.
            setUser((current) => (current
                ? {
                    ...current,
                    coins: result?.coins ?? current.coins,
                    streakShields: result?.streakShields ?? current.streakShields,
                }
                : current));
        } catch {
            // The disabled states cover the expected cases; ignore transient errors.
        } finally {
            setIsBuying(false);
        }
    }

    return (
        <ItemCard
            name="Streak Freeze"
            price={item.price}
            showOwnedBadge={false}
            dense
            visual={<StreakFreezeIcon className="h-full w-auto py-1" />}
        >
            <ActionButton
                type="button"
                fullWidth
                className="col-span-2 h-8 px-3 text-xs"
                disabled={isDisabled}
                onClick={handleBuy}
            >
                {label}
            </ActionButton>
        </ItemCard>
    );
}

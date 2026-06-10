import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { CompanionAvatar } from '@/components/brand';
import { renderShopItemVisual } from '@/components/brand/items/itemRegistry';
import { Page, PageSection, Heading } from '@/components/layout';
import { useAuth } from '@/context/authContext';
import {
    equipInventoryItem,
    getMyInventory,
    unequipInventoryItem,
} from '@/services/inventoryApi';

export function InventoryPage() {
    const { user } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingInventoryItemId, setUpdatingInventoryItemId] = useState(null);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let isCurrent = true;

        async function loadInventory() {
            setIsLoading(true);
            setError('');

            try {
                const nextInventory = await getMyInventory();

                if (isCurrent) {
                    setInventory(nextInventory);
                }
            } catch {
                if (isCurrent) {
                    setError('Your inventory could not be loaded');
                }
            } finally {
                if (isCurrent) {
                    setIsLoading(false);
                }
            }
        }

        loadInventory();

        return () => {
            isCurrent = false;
        };
    }, []);

    const equippedItemKeys = useMemo(
        () => inventory
            .filter((entry) => entry.equipped)
            .map((entry) => entry.item?.assetKey)
            .filter(Boolean),
        [inventory],
    );

    const ownedItems = useMemo(
        () => inventory
            .map((entry) => ({
                ...entry.item,
                userItemId: entry._id,
                equipped: entry.equipped,
            }))
            .filter((item) => item?._id),
        [inventory],
    );

    async function handleSetEquipped(userItemId, equipped) {
        setUpdatingInventoryItemId(userItemId);
        setNotice('');
        setError('');

        try {
            const updatedInventoryItem = equipped
                ? await equipInventoryItem(userItemId)
                : await unequipInventoryItem(userItemId);

            setInventory((currentInventory) =>
                currentInventory.map((entry) =>
                    entry._id === updatedInventoryItem._id ? updatedInventoryItem : entry,
                ),
            );
            setNotice(equipped ? 'Item equipped' : 'Item unequipped');
        } catch {
            setError(equipped ? 'Equipping this item did not work' : 'Unequipping this item did not work');
        } finally {
            setUpdatingInventoryItemId(null);
        }
    }

    return (
        <Page theme="forest" className="h-screen overflow-hidden">
            <Heading title="Inventory" subtitle="Equip items for your companion." streakDays={user?.streak ?? 0} />
            <section className="sticky top-24 z-20 flex min-h-72 flex-col items-center justify-end gap-3 text-center">
                <CompanionAvatar
                    name="Howly"
                    size="xl"
                    showName
                    equippedItemKeys={equippedItemKeys}
                />
            </section>

            <PageSection title="Owned Items" className="min-w-0">
                {isLoading ? <p className="text-sm text-slate-300">Loading your inventory...</p> : null}
                {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                {!isLoading && !error && ownedItems.length === 0 ? (
                    <p className="text-sm text-slate-300">Your inventory is empty</p>
                ) : null}

                <div className="relative rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl shadow-slate-950/20">
                    <div className="max-h-[25rem] overflow-y-scroll pr-2 [scrollbar-gutter:stable]">
                        <CardGrid columns={3} className="pb-8">
                            {ownedItems.map((item) => (
                                <ItemCard
                                    key={item.userItemId}
                                    name={item.name}
                                    price={item.price}
                                    premiumOnly={item.premiumOnly}
                                    equipped={item.equipped}
                                    visual={renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]')}
                                >
                                    <ActionButton
                                        type="button"
                                        fullWidth
                                        className="h-9 px-3 text-sm"
                                        disabled={item.equipped || updatingInventoryItemId === item.userItemId}
                                        aria-label={`Equip ${item.name}`}
                                        onClick={() => handleSetEquipped(item.userItemId, true)}
                                    >
                                        <Plus aria-hidden="true" />
                                    </ActionButton>
                                    <ActionButton
                                        type="button"
                                        fullWidth
                                        className="h-9 px-3 text-sm"
                                        disabled={!item.equipped || updatingInventoryItemId === item.userItemId}
                                        aria-label={`Unequip ${item.name}`}
                                        onClick={() => handleSetEquipped(item.userItemId, false)}
                                    >
                                        <Minus aria-hidden="true" />
                                    </ActionButton>
                                </ItemCard>
                            ))}
                        </CardGrid>
                    </div>
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 h-10 rounded-b-xl bg-gradient-to-t from-howly-card to-transparent" />
                </div>
            </PageSection>
        </Page>
    );
}

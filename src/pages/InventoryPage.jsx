import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { CompanionAvatar } from '@/components/brand';
import { renderShopItemVisual } from '@/components/brand/items/itemRegistry';
import { Page, PageSection, Heading } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/authContext';
import { ITEM_CATEGORIES, SINGLE_EQUIP_ITEM_TYPES } from '@/constants/itemCategories';
import {
    getMyInventory,
    saveOutfit,
} from '@/services/inventoryApi';

export function InventoryPage() {
    const navigate = useNavigate();
    const { user, companion } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [draftEquippedItemIds, setDraftEquippedItemIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingOutfit, setIsSavingOutfit] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    useEffect(() => {
        let isCurrent = true;

        async function loadInventory() {
            setIsLoading(true);
            setError('');

            try {
                const nextInventory = await getMyInventory();

                if (isCurrent) {
                    setInventory(nextInventory);
                    setDraftEquippedItemIds(new Set(
                        nextInventory
                            .filter((entry) => entry.equipped)
                            .map((entry) => entry._id),
                    ));
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
            .filter((entry) => draftEquippedItemIds.has(entry._id))
            .map((entry) => entry.item?.assetKey)
            .filter(Boolean),
        [draftEquippedItemIds, inventory],
    );

    const ownedItems = useMemo(
        () => inventory
            .map((entry) => ({
                ...entry.item,
                userItemId: entry._id,
                equipped: draftEquippedItemIds.has(entry._id),
            }))
            .filter((item) => item?._id),
        [draftEquippedItemIds, inventory],
    );

    const savedEquippedItemIds = useMemo(
        () => new Set(
            inventory
                .filter((entry) => entry.equipped)
                .map((entry) => entry._id),
        ),
        [inventory],
    );

    const filteredItems = useMemo(
        () => activeCategory === 'all'
            ? ownedItems
            : ownedItems.filter((item) => item.type === activeCategory),
        [activeCategory, ownedItems],
    );

    const hasUnsavedOutfitChanges = useMemo(() => {
        if (savedEquippedItemIds.size !== draftEquippedItemIds.size) {
            return true;
        }

        return [...draftEquippedItemIds].some((itemId) => !savedEquippedItemIds.has(itemId));
    }, [draftEquippedItemIds, savedEquippedItemIds]);

    function handleToggleEquipped(item) {
        setNotice('');
        setError('');

        setDraftEquippedItemIds((currentItemIds) => {
            const nextItemIds = new Set(currentItemIds);

            if (nextItemIds.has(item.userItemId)) {
                nextItemIds.delete(item.userItemId);
                return nextItemIds;
            }

            if (SINGLE_EQUIP_ITEM_TYPES.has(item.type)) {
                inventory.forEach((entry) => {
                    if (entry.item?.type === item.type) {
                        nextItemIds.delete(entry._id);
                    }
                });
            }

            nextItemIds.add(item.userItemId);
            return nextItemIds;
        });
    }

    async function handleSaveOutfit() {
        setIsSavingOutfit(true);
        setNotice('');
        setError('');

        try {
            const savedInventory = await saveOutfit([...draftEquippedItemIds]);

            setInventory(savedInventory);
            setDraftEquippedItemIds(new Set(
                savedInventory
                    .filter((entry) => entry.equipped)
                    .map((entry) => entry._id),
            ));
            setNotice('Outfit saved');
            window.dispatchEvent(new Event('howly:outfit-updated'));
        } catch {
            setError('Saving this outfit did not work');
        } finally {
            setIsSavingOutfit(false);
        }
    }

    function renderShopEmptyState() {
        return (
            <div className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm font-medium text-slate-200">Try on some items at the Shop!</p>
                <ActionButton
                    type="button"
                    className="bg-violet-500 px-5 text-white hover:bg-violet-400"
                    onClick={() => navigate('/shop')}
                >
                    Visit shop
                </ActionButton>
            </div>
        );
    }

    return (
        <Page theme="forest">
            <Heading title="Inventory" subtitle="Equip items for your companion." streakDays={user?.streak ?? 0} />
            <section className="sticky top-24 z-20 flex min-h-72 flex-col items-center justify-end gap-3 text-center">
                <CompanionAvatar
                    type={companion?.type}
                    name={companion?.name}
                    size="xl"
                    showName
                    equippedItemKeys={equippedItemKeys}
                />
                <ActionButton
                    type="button"
                    className="h-9 bg-white/10 px-4 text-sm text-white hover:bg-white/20 disabled:text-slate-500"
                    disabled={draftEquippedItemIds.size === 0 || isSavingOutfit}
                    onClick={() => {
                        setNotice('');
                        setError('');
                        setDraftEquippedItemIds(new Set());
                    }}
                >
                    Unequip all
                </ActionButton>
            </section>

            <PageSection title="Owned Items" className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                        <TabsList className="h-auto flex-wrap border border-white/10 bg-white/10 p-1 text-slate-300">
                            {ITEM_CATEGORIES.map((category) => (
                                <TabsTrigger
                                    key={category.value}
                                    value={category.value}
                                    className="px-3 py-1.5 text-slate-300 data-active:bg-white data-active:text-slate-950"
                                >
                                    {category.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <ActionButton
                        type="button"
                        className="bg-violet-500 px-5 text-white hover:bg-violet-400 disabled:bg-white/10 disabled:text-slate-400"
                        disabled={!hasUnsavedOutfitChanges || isSavingOutfit}
                        onClick={handleSaveOutfit}
                    >
                        {isSavingOutfit ? 'Saving...' : 'Save Outfit'}
                    </ActionButton>
                </div>

                {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
                {error ? <p className="text-sm text-red-300">{error}</p> : null}

                {isLoading ? (
                    <div className="flex min-h-48 items-center justify-center text-center">
                        <p className="text-sm text-slate-300">Loading your inventory...</p>
                    </div>
                ) : null}

                {!isLoading && !error && ownedItems.length === 0 ? (
                    renderShopEmptyState()
                ) : null}

                {!isLoading && !error && ownedItems.length > 0 && filteredItems.length === 0 ? (
                    renderShopEmptyState()
                ) : null}

                {!isLoading && !error && filteredItems.length > 0 ? (
                    <CardGrid columns={4} className="gap-4 pb-8">
                        {filteredItems.map((item) => (
                            <ItemCard
                                key={item.userItemId}
                                name={item.name}
                                price={item.price}
                                premiumOnly={item.premiumOnly}
                                equipped={item.equipped}
                                showPrice={false}
                                dense
                                interactive
                                disabled={isSavingOutfit}
                                visual={renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]')}
                                onClick={() => handleToggleEquipped(item)}
                            />
                        ))}
                    </CardGrid>
                ) : null}
            </PageSection>
        </Page>
    );
}

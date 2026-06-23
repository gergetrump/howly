import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { CompanionAvatar } from '@/components/brand';
import { getItemDisplayName, hasItemSideOptions, renderShopItemVisual } from '@/components/brand/items/itemRegistry';
import { Page, PageSection, Heading } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/authContext';
import { ITEM_CATEGORIES, SINGLE_EQUIP_ITEM_TYPES } from '@/constants/itemCategories';
import {
    getMyInventory,
    saveOutfit,
} from '@/services/inventoryApi';
import { getEquippedItemConfigsFromInventory, itemMatchesCategory } from '@/lib/inventoryItems';

export function InventoryPage() {
    const navigate = useNavigate();
    const { user, companion } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [draftEquippedItemIds, setDraftEquippedItemIds] = useState(new Set());
    const [draftItemSides, setDraftItemSides] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingOutfit, setIsSavingOutfit] = useState(false);
    const [error, setError] = useState('');
    const [companionMessage, setCompanionMessage] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const handsFullMessage = 'My hands are full! Remove at least one item from either hand.';

    const getInventorySides = useCallback((inventoryEntries) => (
        Object.fromEntries(
            inventoryEntries
                .filter((entry) => hasItemSideOptions(entry.item?.assetKey))
                .map((entry) => [entry._id, entry.customization?.side === 'left' ? 'left' : 'right']),
        )
    ), []);

    const getDraftCustomization = useCallback((entry) => {
        if (!hasItemSideOptions(entry.item?.assetKey)) {
            return entry.customization ?? {};
        }

        return {
            ...(entry.customization ?? {}),
            side: draftItemSides[entry._id] ?? entry.customization?.side ?? 'right',
        };
    }, [draftItemSides]);

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
                    setDraftItemSides(getInventorySides(nextInventory));
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
    }, [getInventorySides]);

    const equippedItemConfigs = useMemo(
        () => getEquippedItemConfigsFromInventory(
            inventory.map((entry) => ({
                ...entry,
                equipped: draftEquippedItemIds.has(entry._id),
                customization: getDraftCustomization(entry),
            })),
        ),
        [draftEquippedItemIds, getDraftCustomization, inventory],
    );

    const ownedItems = useMemo(
        () => inventory
            .map((entry) => ({
                ...entry.item,
                userItemId: entry._id,
                equipped: draftEquippedItemIds.has(entry._id),
                customization: getDraftCustomization(entry),
            }))
            .filter((item) => item?._id),
        [draftEquippedItemIds, getDraftCustomization, inventory],
    );

    const savedEquippedItemIds = useMemo(
        () => new Set(
            inventory
                .filter((entry) => entry.equipped)
                .map((entry) => entry._id),
        ),
        [inventory],
    );
    const savedItemSides = useMemo(() => getInventorySides(inventory), [getInventorySides, inventory]);

    const filteredItems = useMemo(
        () => activeCategory === 'all'
            ? ownedItems
            : ownedItems.filter((item) => itemMatchesCategory(item, activeCategory)),
        [activeCategory, ownedItems],
    );

    const hasUnsavedOutfitChanges = useMemo(() => {
        if (savedEquippedItemIds.size !== draftEquippedItemIds.size) {
            return true;
        }

        if ([...draftEquippedItemIds].some((itemId) => !savedEquippedItemIds.has(itemId))) {
            return true;
        }

        return Object.entries(draftItemSides).some(([userItemId, side]) => savedItemSides[userItemId] !== side);
    }, [draftEquippedItemIds, draftItemSides, savedEquippedItemIds, savedItemSides]);

    function handleToggleEquipped(item) {
        setError('');
        setCompanionMessage('');

        const nextItemIds = new Set(draftEquippedItemIds);

        if (nextItemIds.has(item.userItemId)) {
            nextItemIds.delete(item.userItemId);
            setDraftEquippedItemIds(nextItemIds);
            return;
        }

        let nextSide = null;

        if (hasItemSideOptions(item.assetKey)) {
            const preferredSide = draftItemSides[item.userItemId] ?? item.customization?.side ?? 'right';
            const alternateSide = preferredSide === 'right' ? 'left' : 'right';
            const occupiedSides = new Set(
                inventory
                    .filter((entry) => nextItemIds.has(entry._id) && hasItemSideOptions(entry.item?.assetKey))
                    .map((entry) => draftItemSides[entry._id] ?? entry.customization?.side ?? 'right'),
            );

            if (!occupiedSides.has(preferredSide)) {
                nextSide = preferredSide;
            } else if (!occupiedSides.has(alternateSide)) {
                nextSide = alternateSide;
            } else {
                setCompanionMessage(handsFullMessage);
                return;
            }
        }

        if (SINGLE_EQUIP_ITEM_TYPES.has(item.type)) {
            inventory.forEach((entry) => {
                if (entry.item?.type === item.type) {
                    nextItemIds.delete(entry._id);
                }
            });
        }

        nextItemIds.add(item.userItemId);
        setDraftEquippedItemIds(nextItemIds);

        if (nextSide) {
            setDraftItemSides((currentSides) => ({
                ...currentSides,
                [item.userItemId]: nextSide,
            }));
        }
    }

    async function handleSaveOutfit() {
        setIsSavingOutfit(true);
        setError('');
        setCompanionMessage('');

        try {
            const customizationUpdates = Object.fromEntries(
                Object.entries(draftItemSides)
                    .filter(([userItemId, side]) => savedItemSides[userItemId] !== side)
                    .map(([userItemId, side]) => [userItemId, { side }]),
            );
            const savedInventory = await saveOutfit([...draftEquippedItemIds], customizationUpdates);

            setInventory(savedInventory);
            setDraftEquippedItemIds(new Set(
                savedInventory
                    .filter((entry) => entry.equipped)
                    .map((entry) => entry._id),
            ));
            setDraftItemSides(getInventorySides(savedInventory));
            window.dispatchEvent(new Event('howly:outfit-updated'));
        } catch {
            setError('Saving this outfit did not work');
        } finally {
            setIsSavingOutfit(false);
        }
    }

    function handleSideChange(userItemId, side) {
        setError('');
        setCompanionMessage('');
        setDraftItemSides((currentSides) => {
            const movingEntry = inventory.find((entry) => entry._id === userItemId);

            if (!movingEntry || !draftEquippedItemIds.has(userItemId)) {
                return {
                    ...currentSides,
                    [userItemId]: side,
                };
            }

            const currentSide = currentSides[userItemId] ?? movingEntry.customization?.side ?? 'right';
            const occupiedEntry = inventory.find((entry) => (
                entry._id !== userItemId
                && draftEquippedItemIds.has(entry._id)
                && hasItemSideOptions(entry.item?.assetKey)
                && (currentSides[entry._id] ?? entry.customization?.side ?? 'right') === side
            ));

            if (!occupiedEntry) {
                return {
                    ...currentSides,
                    [userItemId]: side,
                };
            }

            return {
                ...currentSides,
                [userItemId]: side,
                [occupiedEntry._id]: currentSide,
            };
        });
    }

    function renderSideControls(item) {
        if (!hasItemSideOptions(item.assetKey)) {
            return null;
        }

        const selectedSide = item.customization?.side === 'left' ? 'left' : 'right';

        return (
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    className={`grid h-7 w-7 place-items-center rounded-md border transition ${selectedSide === 'left' ? 'border-violet-200 bg-violet-400/35 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                    aria-label={`Move ${getItemDisplayName(item)} to the left side`}
                    aria-pressed={selectedSide === 'left'}
                    disabled={isSavingOutfit}
                    onClick={() => handleSideChange(item.userItemId, 'left')}
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={`grid h-7 w-7 place-items-center rounded-md border transition ${selectedSide === 'right' ? 'border-violet-200 bg-violet-400/35 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                    aria-label={`Move ${getItemDisplayName(item)} to the right side`}
                    aria-pressed={selectedSide === 'right'}
                    disabled={isSavingOutfit}
                    onClick={() => handleSideChange(item.userItemId, 'right')}
                >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        );
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
            <section className="sticky top-24 z-20 flex min-h-72 flex-col items-center justify-end gap-3 text-center relative">
                <CompanionAvatar
                    type={companion?.type}
                    name={companion?.name}
                    size="xl"
                    showName
                    equippedItemConfigs={equippedItemConfigs}
                />
                {companionMessage ? (
                    <div className="absolute left-1/2 top-8 ml-28 max-w-64 rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white shadow-xl shadow-slate-950/30 ring-1 ring-white/15 before:absolute before:left-[-12px] before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-y-[10px] before:border-r-[12px] before:border-y-transparent before:border-r-white/10">
                        {companionMessage}
                    </div>
                ) : null}
                <ActionButton
                    type="button"
                    className="h-9 bg-white/10 px-4 text-sm text-white hover:bg-white/20 disabled:text-slate-500"
                    disabled={draftEquippedItemIds.size === 0 || isSavingOutfit}
                    onClick={() => {
                        setError('');
                        setCompanionMessage('');
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
                                name={getItemDisplayName(item)}
                                price={item.price}
                                premiumOnly={item.premiumOnly}
                                equipped={item.equipped}
                                showPrice={false}
                                dense
                                interactive
                                disabled={isSavingOutfit}
                                titleAction={renderSideControls(item)}
                                visual={renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]', item.customization)}
                                onClick={() => handleToggleEquipped(item)}
                            />
                        ))}
                    </CardGrid>
                ) : null}
            </PageSection>
        </Page>
    );
}

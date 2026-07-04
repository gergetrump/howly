import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertTriangle, Crown } from 'lucide-react';
import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { CompanionAvatar } from '@/components/brand';
import { ChangeCompanionDialog } from '@/components/habits/ChangeCompanionDialog';
import { PremiumRequiredDialog } from '@/components/shop';
import { getItemDisplayName, getItemEquipSlot, hasItemSideOptions, renderShopItemVisual } from '@/components/brand/items/itemRegistry';
import { Page, PageSection, Heading } from '@/components/layout';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/authContext';
import { ITEM_CATEGORIES, SINGLE_EQUIP_ITEM_TYPES } from '@/constants/itemCategories';
import {
    getMyInventory,
    saveOutfit,
    consumeInventoryItem,
} from '@/services/inventoryApi';
import { getMyHabits } from '@/services/habitService';
import { getEquippedItemConfigsFromInventory, itemMatchesCategory } from '@/lib/inventoryItems';
import { cn } from '@/lib/utils';

const SINGLE_EQUIP_SLOTS = new Set(['body', 'face', 'head', 'neck']);
const SIDEABLE_HEAD_ITEM_KEYS = new Set(['cute-hat', 'hairpin']);

function isSideableHeadItem(assetKey) {
    return SIDEABLE_HEAD_ITEM_KEYS.has(assetKey);
}

export function InventoryPage() {
    const navigate = useNavigate();
    const { user, setUser, companion, setCompanion } = useAuth();
    const [inventory, setInventory] = useState([]);
    const [habits, setHabits] = useState([]);
    const [draftEquippedItemIds, setDraftEquippedItemIds] = useState(new Set());
    const [draftItemSides, setDraftItemSides] = useState({});
    const [usingBoostItemId, setUsingBoostItemId] = useState('');
    const [boostDialogItemId, setBoostDialogItemId] = useState('');
    const [boostDialogHabitId, setBoostDialogHabitId] = useState('');
    const [boostDialogError, setBoostDialogError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingOutfit, setIsSavingOutfit] = useState(false);
    const [error, setError] = useState('');
    const [companionMessage, setCompanionMessage] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [isChangeCompanionOpen, setIsChangeCompanionOpen] = useState(false);
    const [isCompanionPremiumPromptOpen, setIsCompanionPremiumPromptOpen] = useState(false);
    const isPremiumUser = user?.isPremium === true || user?.role === 'admin';
    const handsFullMessage = 'My hands are full! Remove at least one item from either hand.';

    function handleChangeCompanionClick() {
        if (isPremiumUser) {
            setIsChangeCompanionOpen(true);
        } else {
            setIsCompanionPremiumPromptOpen(true);
        }
    }

    function handleCompanionChanged(nextCompanion) {
        if (nextCompanion) {
            setCompanion(nextCompanion);
        }
        setIsChangeCompanionOpen(false);
    }

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
                const [nextInventory, nextHabits] = await Promise.all([
                    getMyInventory(),
                    getMyHabits({ limit: 100 }),
                ]);

                if (isCurrent) {
                    setInventory(nextInventory);
                    setHabits(nextHabits?.data ?? []);
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
                quantity: entry.quantity ?? 1,
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
    const boostDialogItem = useMemo(
        () => ownedItems.find((item) => item.userItemId === boostDialogItemId) ?? null,
        [boostDialogItemId, ownedItems],
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
        if (item.type === 'powerUp') {
            return;
        }

        setError('');
        setCompanionMessage('');

        const nextItemIds = new Set(draftEquippedItemIds);

        if (nextItemIds.has(item.userItemId)) {
            nextItemIds.delete(item.userItemId);
            setDraftEquippedItemIds(nextItemIds);
            return;
        }

        let nextSide = null;

        const itemSlot = getItemEquipSlot(item.assetKey);

        if ((itemSlot === 'hand' || isSideableHeadItem(item.assetKey)) && hasItemSideOptions(item.assetKey)) {
            const preferredSide = draftItemSides[item.userItemId] ?? item.customization?.side ?? 'right';
            const alternateSide = preferredSide === 'right' ? 'left' : 'right';
            const occupiedSides = new Set(
                inventory
                    .filter((entry) => (
                        nextItemIds.has(entry._id)
                        && getItemEquipSlot(entry.item?.assetKey) === itemSlot
                        && hasItemSideOptions(entry.item?.assetKey)
                        && (itemSlot !== 'head' || isSideableHeadItem(entry.item?.assetKey))
                    ))
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

        if (SINGLE_EQUIP_SLOTS.has(itemSlot)) {
            inventory.forEach((entry) => {
                const entrySlot = getItemEquipSlot(entry.item?.assetKey);
                const shouldKeepSideableHeadPair = itemSlot === 'head'
                    && isSideableHeadItem(item.assetKey)
                    && isSideableHeadItem(entry.item?.assetKey);

                if (entrySlot === itemSlot && !shouldKeepSideableHeadPair) {
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
                && getItemEquipSlot(entry.item?.assetKey) === getItemEquipSlot(movingEntry.item?.assetKey)
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
                    className={`grid h-7 w-7 place-items-center rounded-md border transition ${selectedSide === 'left' ? 'border-theme-accent/40 bg-theme-accent/25 text-theme-text' : 'border-theme-text/10 bg-theme-text/5 text-theme-text hover:bg-theme-text/10'}`}
                    aria-label={`Move ${getItemDisplayName(item)} to the left side`}
                    aria-pressed={selectedSide === 'left'}
                    disabled={isSavingOutfit}
                    onClick={() => handleSideChange(item.userItemId, 'left')}
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={`grid h-7 w-7 place-items-center rounded-md border transition ${selectedSide === 'right' ? 'border-theme-accent/40 bg-theme-accent/25 text-theme-text' : 'border-theme-text/10 bg-theme-text/5 text-theme-text hover:bg-theme-text/10'}`}
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
                <p className="text-sm font-medium text-theme-text">Try on some items at the Shop!</p>
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

    function openBoostDialog(item) {
        setBoostDialogItemId(item.userItemId);
        setBoostDialogHabitId(habits[0]?.id || '');
        setBoostDialogError('');
    }

    function closeBoostDialog() {
        setBoostDialogItemId('');
        setBoostDialogHabitId('');
        setBoostDialogError('');
    }

    async function handleUseBoost(item, habitId) {
        if (!habitId) {
            setBoostDialogError('Choose a habit first');
            return;
        }

        if (!habitId || usingBoostItemId) {
            return;
        }

        setUsingBoostItemId(item.userItemId);
        setError('');
        setBoostDialogError('');

        try {
            const result = await consumeInventoryItem(item.userItemId, habitId);

            setInventory((currentInventory) => {
                if ((result?.quantity ?? 0) <= 0) {
                    return currentInventory.filter((entry) => entry._id !== item.userItemId);
                }

                return currentInventory.map((entry) => (
                    entry._id === item.userItemId
                        ? { ...entry, quantity: result.quantity }
                        : entry
                ));
            });
            setUser((currentUser) => (currentUser && result?.coins !== undefined
                ? { ...currentUser, coins: result.coins }
                : currentUser));
            closeBoostDialog();
        } catch (boostError) {
            const message = boostError.code === 'BOOST_ALREADY_ACTIVE'
                ? 'This habit already has an active boost'
                : boostError.code === 'BOOST_HABIT_NOT_FOUND'
                    ? 'Choose one of your habits'
                    : 'Boost could not be used';

            setBoostDialogError(message);
        } finally {
            setUsingBoostItemId('');
        }
    }

    function renderBoostControls(item) {
        const isUsing = usingBoostItemId === item.userItemId;

        return (
            <ActionButton
                type="button"
                className="col-span-2 ml-auto h-8 w-1/2 px-3 text-xs"
                disabled={habits.length === 0 || isUsing}
                onClick={() => openBoostDialog(item)}
            >
                {isUsing ? 'Using...' : 'Use'}
            </ActionButton>
        );
    }

    return (
        <>
        <Page theme="forest">
            <div className="space-y-5">
                <Heading title="Inventory" subtitle="Equip items for your companion." streakDays={user?.streak ?? 0} />
                <section className="relative flex min-h-72 flex-col items-center justify-end gap-3 text-center">
                    <CompanionAvatar
                        type={companion?.type}
                        name={companion?.name}
                        size="xl"
                        showName
                        equippedItemConfigs={equippedItemConfigs}
                    />
                    {companionMessage ? (
                        <div className="absolute left-1/2 top-8 ml-28 max-w-64 rounded-2xl bg-theme-text/10 px-4 py-3 text-left text-sm font-semibold text-theme-text shadow-xl shadow-slate-950/30 ring-1 ring-white/15 before:absolute before:left-[-12px] before:top-1/2 before:h-0 before:w-0 before:-translate-y-1/2 before:border-y-[10px] before:border-r-[12px] before:border-y-transparent before:border-r-white/10">
                            {companionMessage}
                        </div>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <ActionButton
                            type="button"
                            className="h-9 bg-theme-text/10 px-4 text-sm text-theme-text hover:bg-theme-text/20 disabled:text-theme-text-muted"
                            disabled={draftEquippedItemIds.size === 0 || isSavingOutfit}
                            onClick={() => {
                                setError('');
                                setCompanionMessage('');
                                setDraftEquippedItemIds(new Set());
                            }}
                        >
                            Unequip all
                        </ActionButton>
                        <ActionButton
                            type="button"
                            className="h-9 bg-howly-primary/20 px-4 text-sm font-semibold text-howly-primary hover:bg-howly-primary/30"
                            onClick={handleChangeCompanionClick}
                        >
                            <span className="flex items-center gap-1.5">
                                {!isPremiumUser ? <Crown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                                Change companion
                            </span>
                        </ActionButton>
                    </div>
                </section>

                <div className="min-w-0 space-y-3">
                    <h2 className="text-xl font-semibold text-theme-text">Owned Items</h2>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                            <TabsList className="h-auto flex-wrap border border-theme-text/10 bg-theme-text/10 p-1 text-theme-text-soft">
                                {ITEM_CATEGORIES.map((category) => (
                                    <TabsTrigger
                                        key={category.value}
                                        value={category.value}
                                        className="px-3 py-1.5 !text-theme-text-soft data-active:!bg-theme-invert data-active:!text-theme-invert-text"
                                    >
                                        {category.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <ActionButton
                            type="button"
                            className="bg-violet-500 px-5 text-white hover:bg-violet-400 disabled:bg-theme-text/10 disabled:text-theme-text-muted"
                            disabled={!hasUnsavedOutfitChanges || isSavingOutfit}
                            onClick={handleSaveOutfit}
                        >
                            {isSavingOutfit ? 'Saving...' : 'Save Outfit'}
                        </ActionButton>
                    </div>
                </div>
            </div>

            <PageSection className="min-w-0">
                <div className="max-h-[31rem] overflow-y-auto pr-2 [scrollbar-gutter:stable]">
                    {error ? <p className="text-sm text-theme-danger">{error}</p> : null}

                    {isLoading ? (
                        <div className="flex min-h-48 items-center justify-center text-center">
                            <p className="text-sm text-theme-text-soft">Loading your inventory...</p>
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
                                    interactive={item.type !== 'powerUp'}
                                    disabled={isSavingOutfit}
                                    cornerBadge={item.type === 'powerUp' ? (
                                        <span className="rounded-full border border-theme-text/10 bg-theme-text/10 px-2 py-1 text-[10px] font-bold text-theme-text">
                                            x{item.quantity}
                                        </span>
                                    ) : null}
                                    visual={renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]', item.customization)}
                                    onClick={() => handleToggleEquipped(item)}
                                >
                                    {item.type === 'powerUp' ? (
                                        renderBoostControls(item)
                                    ) : (
                                        <div className="col-span-2 flex min-h-8 justify-end">
                                            {renderSideControls(item)}
                                        </div>
                                    )}
                                </ItemCard>
                            ))}
                        </CardGrid>
                    ) : null}
                </div>
            </PageSection>
        </Page>
        <ChangeCompanionDialog
            open={isChangeCompanionOpen}
            onOpenChange={setIsChangeCompanionOpen}
            currentType={companion?.type}
            currentName={companion?.name}
            onSaved={handleCompanionChanged}
        />
        <PremiumRequiredDialog
            isOpen={isCompanionPremiumPromptOpen}
            onClose={() => setIsCompanionPremiumPromptOpen(false)}
            title="Change your companion"
            description="Switching your companion is a Premium perk. Upgrade to pick a new buddy anytime."
        />
        <Dialog
            open={Boolean(boostDialogItem)}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    closeBoostDialog();
                }
            }}
        >
            <DialogContent className="rounded-2xl border-0 bg-theme-surface p-8 text-theme-text shadow-2xl sm:max-w-md">
                <h2 className="mb-2 text-center text-2xl font-bold tracking-tight text-theme-text">
                    Apply boost
                </h2>
                <p className="mb-6 text-center text-sm text-theme-text-soft">
                    Choose a habit for {boostDialogItem ? getItemDisplayName(boostDialogItem) : 'this boost'}
                </p>

                <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-left">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                    <p className="text-xs leading-relaxed text-theme-gold/90">
                        If the selected habit is deleted later on, the boost cannot be further used.
                    </p>
                </div>

                <div 
                    className={cn(
                        "mb-4 rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger transition-opacity duration-200",
                        boostDialogError ? "opacity-100" : "opacity-0 pointer-events-none select-none"
                    )}
                    aria-hidden={!boostDialogError}
                >
                    {boostDialogError || '\u00A0'}
                </div>

                <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-theme-text">Habit</Label>
                    <Select
                        value={boostDialogHabitId}
                        onValueChange={(nextHabitId) => {
                            setBoostDialogHabitId(nextHabitId);
                            setBoostDialogError('');
                        }}
                        disabled={usingBoostItemId === boostDialogItem?.userItemId}
                    >
                        <SelectTrigger className="!h-12 w-full rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text focus:ring-theme-accent/20 [&>svg]:text-theme-text [&>svg]:opacity-50">
                            <SelectValue placeholder="Choose a habit" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4} className="z-[100] max-h-60 w-[var(--radix-select-trigger-width)] rounded-xl border-theme-accent/20 bg-theme-surface">
                            {habits.map((habit) => (
                                <SelectItem
                                    key={habit.id}
                                    value={habit.id}
                                    className="cursor-pointer text-theme-text focus:!bg-theme-accent/40 focus:!text-theme-text data-[state=checked]:text-theme-text [&_*]:!text-theme-text"
                                >
                                    {habit.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <ActionButton
                    type="button"
                    fullWidth
                    className="mt-6 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 text-base font-semibold text-white shadow-lg shadow-purple-600/25 hover:from-purple-700 hover:to-purple-600"
                    disabled={!boostDialogHabitId || usingBoostItemId === boostDialogItem?.userItemId}
                    onClick={() => {
                        if (boostDialogItem) {
                            handleUseBoost(boostDialogItem, boostDialogHabitId);
                        }
                    }}
                >
                    {usingBoostItemId === boostDialogItem?.userItemId ? 'Applying...' : 'Use boost'}
                </ActionButton>
            </DialogContent>
        </Dialog>
        </>
    );
}

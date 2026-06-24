import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { ActionButton } from '@/components/common';
import { CompanionAvatar } from '@/components/brand';
import { getItemDisplayName, getItemEquipSlot, hasItemSideOptions } from '@/components/brand/items/itemRegistry';
import { Page, PageSection, Heading } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CartDialog,
    getCustomizationConfig,
    getInventoryEntryOwnershipSignature,
    getItemOwnershipSignature,
    ITEM_CUSTOMIZATION_CONFIG,
    normalizeItemCustomization,
    PurchaseConfirmationDialog,
    ShopCustomizationPanel,
    ShopItemGrid,
} from '@/components/shop';
import { useAuth } from '@/context/authContext';
import { ITEM_CATEGORIES, SINGLE_EQUIP_ITEM_TYPES } from '@/constants/itemCategories';
import { buyItem, getMyInventory } from '@/services/inventoryApi';
import { getItems } from '@/services/itemApi';
import { getCurrentUser, getCurrentUserPlan } from '@/services/userService';
import { confirmCheckoutSession } from '@/services/paymentService';
import { itemMatchesCategory } from '@/lib/inventoryItems';

const PREMIUM_RETURN_ITEM_STORAGE_KEY = 'howly_premium_return_item_id';
const SINGLE_PREVIEW_SLOTS = new Set(['body', 'face', 'hand', 'head', 'neck']);

export function ShopPage() {
    const navigate = useNavigate();
    const { user, setUser, companion } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [ownedItemSignatures, setOwnedItemSignatures] = useState(new Set());
    const [previewItems, setPreviewItems] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState(null);
    const [itemsToBuy, setItemsToBuy] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [error, setError] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [premiumReturnItemId, setPremiumReturnItemId] = useState('');
    const [selectedCustomItemId, setSelectedCustomItemId] = useState('');
    const [planInfo, setPlanInfo] = useState(null);
    const [itemCustomizations, setItemCustomizations] = useState(() => (
        Object.fromEntries(
            Object.entries(ITEM_CUSTOMIZATION_CONFIG).map(([assetKey, config]) => [
                assetKey,
                { ...config.defaults },
            ]),
        )
    ));
    const [activeColorSlots, setActiveColorSlots] = useState(() => (
        Object.fromEntries(
            Object.entries(ITEM_CUSTOMIZATION_CONFIG).map(([assetKey, config]) => [
                assetKey,
                config.colorSlots[0]?.key,
            ]),
        )
    ));

    const isFreeUser = user?.isPremium !== true && user?.role !== 'admin';
    const premiumMonthlyCoins = planInfo?.plans?.premium?.monthlyBenefits?.coins;

    const restorePremiumReturnItem = useCallback(() => {
        const returnItemId = window.sessionStorage.getItem(PREMIUM_RETURN_ITEM_STORAGE_KEY);

        if (returnItemId) {
            setPremiumReturnItemId(returnItemId);
            window.sessionStorage.removeItem(PREMIUM_RETURN_ITEM_STORAGE_KEY);
        }
    }, []);

    const openPremiumPage = useCallback((message, returnItemId = '') => {
        if (returnItemId) {
            window.sessionStorage.setItem(PREMIUM_RETURN_ITEM_STORAGE_KEY, returnItemId);
            setPremiumReturnItemId(returnItemId);
        }

        navigate('/premium', {
            state: {
                message,
                returnTo: '/shop',
            },
        });
    }, [navigate]);

    const refreshCurrentUser = useCallback(async () => {
        const currentUser = await getCurrentUser();
        const refreshedUser = currentUser.user ?? currentUser;
        setUser(refreshedUser);

        return refreshedUser;
    }, [setUser]);

    useEffect(() => {
        getCurrentUserPlan()
            .then(setPlanInfo)
            .catch((planError) => {
                console.error('Failed to load user plan:', planError);
            });
    }, []);

    useEffect(() => {
        const paymentStatus = searchParams.get('payment');
        const checkoutSessionId = searchParams.get('checkout_session_id');

        if (!paymentStatus) {
            return undefined;
        }

        let isCurrent = true;
        let retryTimerId;

        async function refreshPremiumStatus() {
            if (paymentStatus === 'cancelled') {
                restorePremiumReturnItem();
                setError('Premium checkout was cancelled.');
                setSearchParams({}, { replace: true });
                return;
            }

            if (paymentStatus !== 'success') {
                return;
            }

            setError('');
            restorePremiumReturnItem();

            if (checkoutSessionId) {
                try {
                    const confirmation = await confirmCheckoutSession(checkoutSessionId);

                    if (!isCurrent) {
                        return;
                    }

                    if (confirmation?.user) {
                        setUser(confirmation.user);
                    }

                    if (confirmation?.user?.isPremium) {
                        setSearchParams({}, { replace: true });
                        return;
                    }
                } catch (confirmationError) {
                    console.error('Could not confirm checkout session:', confirmationError);
                }
            }

            const refreshedUser = await refreshCurrentUser();

            if (!isCurrent) {
                return;
            }

            if (refreshedUser?.isPremium) {
                setSearchParams({}, { replace: true });
                return;
            }

            retryTimerId = window.setTimeout(async () => {
                await refreshCurrentUser();

                if (!isCurrent) {
                    return;
                }

                setSearchParams({}, { replace: true });
            }, 1500);
        }

        refreshPremiumStatus();

        return () => {
            isCurrent = false;
            window.clearTimeout(retryTimerId);
        };
    }, [refreshCurrentUser, restorePremiumReturnItem, searchParams, setSearchParams, setUser]);

    useEffect(() => {
        let isCurrent = true;

        async function loadItems() {
            setIsLoading(true);
            setError('');

            try {
                const nextItems = await getItems();
                const token = localStorage.getItem('howly_token');
                const nextInventory = token ? await getMyInventory() : [];

                if (isCurrent) {
                    setItems(nextItems);
                    setOwnedItemSignatures(new Set(
                        nextInventory
                            .map(getInventoryEntryOwnershipSignature)
                            .filter(Boolean),
                    ));
                }
            } catch {
                if (isCurrent) {
                    setError('Shop items could not be loaded');
                }
            } finally {
                if (isCurrent) {
                    setIsLoading(false);
                }
            }
        }

        loadItems();

        return () => {
            isCurrent = false;
        };
    }, []);

    const previewItemKeys = useMemo(
        () => previewItems
            .filter((item) => !getCustomizationConfig(item.assetKey))
            .map((item) => item.assetKey)
            .filter(Boolean),
        [previewItems],
    );

    const previewItemConfigs = previewItems
        .filter((item) => getCustomizationConfig(item.assetKey))
        .map((item) => ({
            assetKey: item.assetKey,
            customization: getShopPreviewCustomization(item),
        }));

    const cartItemsToBuy = cartItems.filter((entry) => !isPurchaseEntryOwned(entry));
    const cartTotalPrice = cartItemsToBuy.reduce((total, entry) => total + (getPurchaseEntryItem(entry)?.price ?? 0), 0);
    const confirmationTotalPrice = itemsToBuy.reduce((total, entry) => total + (getPurchaseEntryItem(entry)?.price ?? 0), 0);

    const filteredItems = useMemo(
        () => activeCategory === 'all'
            ? items
            : items.filter((item) => itemMatchesCategory(item, activeCategory)),
        [activeCategory, items],
    );
    const selectedCustomItem = useMemo(() => {
        const selectedItem = items.find((item) => item._id === selectedCustomItemId);

        return selectedItem && getCustomizationConfig(selectedItem.assetKey) ? selectedItem : null;
    }, [items, selectedCustomItemId]);
    const selectedCustomizationConfig = getCustomizationConfig(selectedCustomItem?.assetKey);
    const selectedItemCustomization = selectedCustomItem ? getItemCustomization(selectedCustomItem) : {};
    const selectedActiveColorSlot = selectedCustomItem
        ? activeColorSlots[selectedCustomItem.assetKey] ?? selectedCustomizationConfig?.colorSlots[0]?.key
        : '';

    const addSelectedItem = useCallback((currentItems, item) => {
        const itemSlot = getItemEquipSlot(item?.assetKey);

        if (SINGLE_PREVIEW_SLOTS.has(itemSlot)) {
            return [
                ...currentItems.filter((currentItem) => getItemEquipSlot(currentItem?.assetKey) !== itemSlot),
                item,
            ];
        }

        if (SINGLE_EQUIP_ITEM_TYPES.has(item.type)) {
            return [
                ...currentItems.filter((currentItem) => currentItem.type !== item.type),
                item,
            ];
        }

        return [...currentItems, item];
    }, []);

    useEffect(() => {
        if (!premiumReturnItemId || items.length === 0) {
            return undefined;
        }

        const returnItem = items.find((item) => item._id === premiumReturnItemId);

        if (!returnItem) {
            return undefined;
        }

        const restoreTimerId = window.setTimeout(() => {
            setActiveCategory(returnItem.type ?? 'all');
            setPreviewItems((currentPreviewItems) => (
                currentPreviewItems.some((item) => item._id === returnItem._id)
                    ? currentPreviewItems
                    : addSelectedItem(currentPreviewItems, returnItem)
            ));
            document
                .querySelector(`[data-shop-item-id="${returnItem._id}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setPremiumReturnItemId('');
        }, 0);

        return () => window.clearTimeout(restoreTimerId);
    }, [addSelectedItem, items, premiumReturnItemId]);

    function getPurchaseEntryItem(entry) {
        return entry?.item ?? entry;
    }

    function getPurchaseEntryCustomization(entry) {
        const item = getPurchaseEntryItem(entry);

        if (!item) {
            return {};
        }

        return entry?.customization
            ? normalizeItemCustomization(item, entry.customization)
            : getItemCustomization(item);
    }

    function getPurchaseEntrySignature(entry) {
        const item = getPurchaseEntryItem(entry);

        return getItemOwnershipSignature(item, getPurchaseEntryCustomization(entry));
    }

    function createPurchaseEntry(item) {
        const customization = getItemCustomization(item);

        return {
            cartKey: getItemOwnershipSignature(item, customization),
            item,
            customization,
        };
    }

    function isPurchaseEntryOwned(entry) {
        return ownedItemSignatures.has(getPurchaseEntrySignature(entry));
    }

    function isCurrentItemInCart(item) {
        return cartItems.some((entry) => entry.cartKey === createPurchaseEntry(item).cartKey);
    }

    function isItemPreviewed(itemId) {
        return previewItems.some((item) => item._id === itemId);
    }

    function isItemOwned(item) {
        return ownedItemSignatures.has(getItemOwnershipSignature(item, getItemCustomization(item)));
    }

    function addCartEntry(currentCartItems, item) {
        const nextEntry = createPurchaseEntry(item);

        if (ownedItemSignatures.has(nextEntry.cartKey)) {
            return currentCartItems;
        }

        if (currentCartItems.some((entry) => entry.cartKey === nextEntry.cartKey)) {
            return currentCartItems;
        }

        return [...currentCartItems, nextEntry];
    }

    function handleAddCurrentItemToCart(item) {
        setError('');
        setCartItems((currentCartItems) => addCartEntry(currentCartItems, item));
    }

    function handleTryOnItem(itemId) {
        const item = items.find((shopItem) => shopItem._id === itemId);

        if (!item) {
            return;
        }

        setError('');
        if (getCustomizationConfig(item.assetKey)) {
            setSelectedCustomItemId(item._id);
        }
        const isAlreadyPreviewed = isItemPreviewed(item._id);

        if (isAlreadyPreviewed) {
            setPreviewItems((currentPreviewItems) => currentPreviewItems.filter((previewItem) => previewItem._id !== item._id));
            return;
        }

        setPreviewItems((currentPreviewItems) => addSelectedItem(currentPreviewItems, item));
    }

    function handleRemoveCartEntry(cartKey) {
        setError('');
        setCartItems((currentCartItems) => currentCartItems.filter((entry) => entry.cartKey !== cartKey));
    }

    function openBuyConfirmation(entriesForPurchase) {
        const nextItemsToBuy = entriesForPurchase.filter((entry) => !isPurchaseEntryOwned(entry));

        if (nextItemsToBuy.length === 0) {
            setError('All selected items are already in your inventory');
            return;
        }

        setItemsToBuy(nextItemsToBuy);
        setIsCartOpen(false);
    }

    function clearPreviewItems() {
        setPreviewItems([]);
        setCartItems([]);
    }

    function getItemCustomization(item) {
        return normalizeItemCustomization(item, itemCustomizations[item.assetKey]);
    }

    function getShopPreviewCustomization(item) {
        const customization = getItemCustomization(item);

        return hasItemSideOptions(item.assetKey)
            ? { ...customization, side: 'right' }
            : customization;
    }

    function handleItemColorChange(assetKey, slot, color) {
        setItemCustomizations((currentCustomizations) => ({
            ...currentCustomizations,
            [assetKey]: {
                ...normalizeItemCustomization(assetKey, currentCustomizations[assetKey]),
                [slot]: color,
            },
        }));
    }

    function handleItemTextChange(assetKey, textKey, text) {
        setItemCustomizations((currentCustomizations) => ({
            ...currentCustomizations,
            [assetKey]: {
                ...normalizeItemCustomization(assetKey, currentCustomizations[assetKey]),
                [textKey]: text,
            },
        }));
    }

    function handleItemSymbolChange(assetKey, symbolKey, symbol, selectedSymbolColor = null) {
        setItemCustomizations((currentCustomizations) => ({
            ...currentCustomizations,
            [assetKey]: {
                ...normalizeItemCustomization(assetKey, currentCustomizations[assetKey]),
                [symbolKey]: symbol,
                ...(selectedSymbolColor?.colorKey && symbol
                    ? { [selectedSymbolColor.colorKey]: selectedSymbolColor.color }
                    : {}),
            },
        }));
    }

    async function handleBuyItems(entriesForPurchase) {
        setBuyingItemId('cart');
        setError('');
        const purchasedEntries = [];
        let failedEntry = null;

        try {
            for (const entry of entriesForPurchase) {
                const item = getPurchaseEntryItem(entry);
                const customization = getPurchaseEntryCustomization(entry);

                failedEntry = entry;
                await buyItem(item._id, customization);
                purchasedEntries.push(entry);
            }

            setOwnedItemSignatures((currentOwnedItemSignatures) => {
                const nextOwnedItemSignatures = new Set(currentOwnedItemSignatures);
                purchasedEntries.forEach((entry) => {
                    nextOwnedItemSignatures.add(getPurchaseEntrySignature(entry));
                });
                return nextOwnedItemSignatures;
            });
            setCartItems((currentCartItems) => (
                currentCartItems.filter((entry) => !purchasedEntries.some((purchasedEntry) => purchasedEntry.cartKey === entry.cartKey))
            ));
            await refreshCurrentUser();
        } catch (buyError) {
            if (purchasedEntries.length > 0) {
                setOwnedItemSignatures((currentOwnedItemSignatures) => {
                    const nextOwnedItemSignatures = new Set(currentOwnedItemSignatures);
                    purchasedEntries.forEach((entry) => {
                        nextOwnedItemSignatures.add(getPurchaseEntrySignature(entry));
                    });
                    return nextOwnedItemSignatures;
                });
                setCartItems((currentCartItems) => (
                    currentCartItems.filter((entry) => !purchasedEntries.some((purchasedEntry) => purchasedEntry.cartKey === entry.cartKey))
                ));
                await refreshCurrentUser();
            }

            const failedItem = getPurchaseEntryItem(failedEntry);

            if (buyError.code === 'ITEM_ALREADY_OWNED') {
                setError('One of these items is already in your inventory');
            } else if (buyError.code === 'PREMIUM_REQUIRED') {
                if (isFreeUser) {
                    openPremiumPage(
                        `${failedItem ? getItemDisplayName(failedItem) : 'This item'} is a premium item. Upgrade to buy premium shop items and get monthly bonus coins.`,
                        failedItem?._id ?? '',
                    );
                } else {
                    setError(`${failedItem ? getItemDisplayName(failedItem) : 'This item'} is premium only`);
                }
            } else if (buyError.code === 'NOT_ENOUGH_COINS') {
                if (isFreeUser) {
                    openPremiumPage(
                        `You do not have enough moon coins for ${failedItem ? getItemDisplayName(failedItem) : 'this item'}. Premium gives you monthly bonus coins${premiumMonthlyCoins ? ` (${premiumMonthlyCoins} coins)` : ''}.`,
                        failedItem?._id ?? '',
                    );
                } else {
                    setError(`You do not have enough moon coins for ${failedItem ? getItemDisplayName(failedItem) : 'this item'}`);
                }
            } else {
                setError('Buying these items did not work');
            }
        } finally {
            setBuyingItemId(null);
            setItemsToBuy([]);
        }
    }

    return (
        <Page theme="forest" contentClassName="max-w-[112rem]">
            <Heading title="Shop" subtitle="Unlock items for your companion." streakDays={user?.streak ?? 0} />
            <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(13rem,0.5fr)_minmax(0,1.55fr)_minmax(16rem,0.6fr)] lg:items-start xl:gap-10">
                <section className="flex min-h-72 flex-col items-center justify-center gap-3 text-center lg:sticky lg:top-24 lg:min-h-[30rem]">
                    <CompanionAvatar
                        type={companion?.type}
                        name={companion?.name}
                        size="xl"
                        showName
                        previewItemKeys={previewItemKeys}
                        previewItemConfigs={previewItemConfigs}
                    />
                </section>

                <PageSection title="Shop Items" className="min-w-0">
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

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <ActionButton
                                type="button"
                                className="h-9 bg-white/10 px-4 text-sm text-white hover:bg-white/20 disabled:text-slate-500"
                                disabled={previewItems.length === 0}
                                onClick={clearPreviewItems}
                            >
                                Unequip all
                            </ActionButton>
                        </div>
                    </div>

                    {isLoading ? <p className="text-sm text-slate-300">Loading shop items...</p> : null}
                    {error ? <p className="text-sm text-red-300">{error}</p> : null}
                    {!isLoading && !error && items.length === 0 ? (
                        <p className="text-sm text-slate-300">No shop items yet</p>
                    ) : null}
                    <ShopItemGrid
                        isLoading={isLoading}
                        error={error}
                        items={items}
                        filteredItems={filteredItems}
                        getItemCustomization={getItemCustomization}
                        onAddCurrentItemToCart={handleAddCurrentItemToCart}
                        isItemOwned={isItemOwned}
                        isCurrentItemInCart={isCurrentItemInCart}
                        isItemPreviewed={isItemPreviewed}
                        onTryOnItem={handleTryOnItem}
                        openBuyConfirmation={openBuyConfirmation}
                        createPurchaseEntry={createPurchaseEntry}
                        buyingItemId={buyingItemId}
                    />

                    <div className="mt-4 flex justify-end">
                        <ActionButton
                            type="button"
                            className={`gap-2 px-4 text-white ${cartItems.length === 0 ? 'bg-white/10 hover:bg-white/15' : 'bg-violet-500 hover:bg-violet-400'}`}
                            onClick={() => setIsCartOpen(true)}
                        >
                            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                            Cart
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{cartItems.length}</span>
                        </ActionButton>
                    </div>
                </PageSection>

                <ShopCustomizationPanel
                    item={selectedCustomItem}
                    customizationConfig={selectedCustomizationConfig}
                    customization={selectedItemCustomization}
                    activeSlot={selectedActiveColorSlot}
                    addToCartLabel={
                        selectedCustomItem && isItemOwned(selectedCustomItem)
                            ? 'Owned'
                            : selectedCustomItem && isCurrentItemInCart(selectedCustomItem)
                                ? 'In cart'
                                : 'Add to cart'
                    }
                    isAddToCartDisabled={!selectedCustomItem || isItemOwned(selectedCustomItem) || isCurrentItemInCart(selectedCustomItem)}
                    onActiveSlotChange={(slot) => setActiveColorSlots((currentSlots) => ({
                        ...currentSlots,
                        [selectedCustomItem.assetKey]: slot,
                    }))}
                    onColorChange={(slot, color) => handleItemColorChange(selectedCustomItem.assetKey, slot, color)}
                    onTextChange={(textKey, text) => handleItemTextChange(selectedCustomItem.assetKey, textKey, text)}
                    onSymbolChange={(symbolKey, symbol, selectedSymbolColor) => handleItemSymbolChange(selectedCustomItem.assetKey, symbolKey, symbol, selectedSymbolColor)}
                    onAddToCart={() => handleAddCurrentItemToCart(selectedCustomItem)}
                />
            </div>

            <CartDialog
                isOpen={isCartOpen}
                onOpenChange={setIsCartOpen}
                cartItems={cartItems}
                cartItemsToBuy={cartItemsToBuy}
                cartTotalPrice={cartTotalPrice}
                getPurchaseEntryItem={getPurchaseEntryItem}
                getPurchaseEntryCustomization={getPurchaseEntryCustomization}
                isPurchaseEntryOwned={isPurchaseEntryOwned}
                onRemoveCartEntry={handleRemoveCartEntry}
                onOpenBuyConfirmation={openBuyConfirmation}
            />

            <PurchaseConfirmationDialog
                itemsToBuy={itemsToBuy}
                confirmationTotalPrice={confirmationTotalPrice}
                buyingItemId={buyingItemId}
                getPurchaseEntryItem={getPurchaseEntryItem}
                onOpenChange={(open) => !open && setItemsToBuy([])}
                onBuyItems={handleBuyItems}
            />
        </Page>
    );
}

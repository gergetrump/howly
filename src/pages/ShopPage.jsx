import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { ActionButton } from '@/components/common';
import { CompanionAvatar } from '@/components/brand';
import { getItemDisplayName, getItemEquipSlot, hasItemSideOptions } from '@/components/brand/items/itemRegistry';
import { Page, PageSection, Heading } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CartDialog,
    BoostPowerUpCards,
    getCustomizationConfig,
    getInventoryEntryOwnershipSignature,
    getItemOwnershipSignature,
    ITEM_CUSTOMIZATION_CONFIG,
    normalizeItemCustomization,
    PremiumRequiredDialog,
    PurchaseConfirmationDialog,
    ShopCustomizationPanel,
    ShopItemGrid,
} from '@/components/shop';
import { useAuth } from '@/context/authContext';
import { ITEM_CATEGORIES, SINGLE_EQUIP_ITEM_TYPES } from '@/constants/itemCategories';
import { StreakFreezeCard } from '@/components/shop/StreakFreezeCard.jsx';
import { buyItem, getBoostPurchaseLimits, getMyInventory } from '@/services/inventoryApi';
import { getItems } from '@/services/itemApi';
import { getCurrentUser, getCurrentUserPlan } from '@/services/userService';
import { confirmCheckoutSession } from '@/services/paymentService';
import { itemMatchesCategory } from '@/lib/inventoryItems';

const PREMIUM_RETURN_ITEM_STORAGE_KEY = 'howly_premium_return_item_id';
const SINGLE_PREVIEW_SLOTS = new Set(['body', 'face', 'hand', 'head', 'neck']);
const MAX_OWNED_POWER_UP_QUANTITY = 20;
const MAX_MONTHLY_BOOST_PURCHASE_QUANTITY = 20;
const STREAK_FREEZE_ASSET_KEY = 'streak-freeze';
const MAX_STREAK_SHIELDS = 3;
const BOOST_ASSET_KEYS = new Set(['small-boost', 'medium-boost', 'big-boost']);

function isItemCategoryValue(value) {
    return ITEM_CATEGORIES.some((category) => category.value === value);
}

export function ShopPage() {
    const { user, setUser, companion } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialCategory = searchParams.get('category');
    const [items, setItems] = useState([]);
    const [ownedItemSignatures, setOwnedItemSignatures] = useState(new Set());
    const [ownedPowerUpQuantities, setOwnedPowerUpQuantities] = useState({});
    const [monthlyBoostPurchaseQuantities, setMonthlyBoostPurchaseQuantities] = useState({});
    const [monthlyBoostPurchaseLimit, setMonthlyBoostPurchaseLimit] = useState(MAX_MONTHLY_BOOST_PURCHASE_QUANTITY);
    const [previewItems, setPreviewItems] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState(null);
    const [itemsToBuy, setItemsToBuy] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
    const [premiumDialogTitle, setPremiumDialogTitle] = useState(undefined);
    const [premiumDialogDescription, setPremiumDialogDescription] = useState(undefined);
    const [premiumDialogShowsUpgradeActions, setPremiumDialogShowsUpgradeActions] = useState(true);
    const [error, setError] = useState('');
    const [activeCategory, setActiveCategory] = useState(() => (
        initialCategory && isItemCategoryValue(initialCategory) ? initialCategory : 'all'
    ));
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

    const openPremiumPage = useCallback((description, returnItemId = '', title = undefined, showUpgradeActions = true) => {
        if (returnItemId) {
            window.sessionStorage.setItem(PREMIUM_RETURN_ITEM_STORAGE_KEY, returnItemId);
            setPremiumReturnItemId(returnItemId);
        }

        setPremiumDialogTitle(title);
        setPremiumDialogDescription(description);
        setPremiumDialogShowsUpgradeActions(showUpgradeActions);
        setIsPremiumDialogOpen(true);
    }, []);

    const openPremiumPageAfterPurchaseDialog = useCallback((description, returnItemId = '', title = undefined, showUpgradeActions = true) => {
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        setItemsToBuy([]);
        window.requestAnimationFrame(() => {
            window.scrollTo(scrollX, scrollY);
            openPremiumPage(description, returnItemId, title, showUpgradeActions);
            window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
        });
    }, [openPremiumPage]);

    const refreshCurrentUser = useCallback(async () => {
        const currentUser = await getCurrentUser();
        const refreshedUser = currentUser.user ?? currentUser;
        setUser(refreshedUser);

        return refreshedUser;
    }, [setUser]);

    const refreshBoostPurchaseLimits = useCallback(async () => {
        const limits = await getBoostPurchaseLimits();
        setMonthlyBoostPurchaseQuantities(limits?.purchases ?? {});
        setMonthlyBoostPurchaseLimit(limits?.maxQuantity ?? MAX_MONTHLY_BOOST_PURCHASE_QUANTITY);

        return limits;
    }, []);

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
                const token = localStorage.getItem('howly_token');
                const [nextItems, nextInventory, boostPurchaseLimits] = await Promise.all([
                    getItems(),
                    token ? getMyInventory() : Promise.resolve([]),
                    token ? getBoostPurchaseLimits() : Promise.resolve(null),
                ]);

                if (isCurrent) {
                    setItems(nextItems);
                    setOwnedItemSignatures(new Set(
                        nextInventory
                            .map(getInventoryEntryOwnershipSignature)
                            .filter(Boolean),
                    ));
                    setOwnedPowerUpQuantities(Object.fromEntries(
                        nextInventory
                            .filter((entry) => entry.item?.type === 'powerUp')
                            .map((entry) => [entry.item.assetKey, entry.quantity ?? 1]),
                    ));
                    setMonthlyBoostPurchaseQuantities(boostPurchaseLimits?.purchases ?? {});
                    setMonthlyBoostPurchaseLimit(boostPurchaseLimits?.maxQuantity ?? MAX_MONTHLY_BOOST_PURCHASE_QUANTITY);
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
    const cartTotalPrice = cartItemsToBuy.reduce((total, entry) => total + ((getPurchaseEntryItem(entry)?.price ?? 0) * getPurchaseEntryQuantity(entry)), 0);
    const confirmationTotalPrice = itemsToBuy.reduce((total, entry) => total + ((getPurchaseEntryItem(entry)?.price ?? 0) * getPurchaseEntryQuantity(entry)), 0);
    const cartItemCount = cartItems.reduce((total, entry) => total + getPurchaseEntryQuantity(entry), 0);

    const requestedCategory = searchParams.get('category');
    const selectedCategory = requestedCategory && isItemCategoryValue(requestedCategory)
        ? requestedCategory
        : activeCategory;

    function handleCategoryChange(nextCategory) {
        setActiveCategory(nextCategory);

        if (searchParams.has('category')) {
            setSearchParams((currentParams) => {
                const nextParams = new URLSearchParams(currentParams);
                nextParams.delete('category');
                return nextParams;
            }, { replace: true });
        }
    }

    // Power-ups are consumables shown via their own card (StreakFreezeCard), not
    // the wearable grid — keep them out.
    const filteredItems = useMemo(
        () => {
            const wearableItems = items.filter((item) => item.type !== 'powerUp');
            return selectedCategory === 'all'
                ? wearableItems
                : wearableItems.filter((item) => itemMatchesCategory(item, selectedCategory));
        },
        [items, selectedCategory],
    );
    const selectedCustomItem = useMemo(() => {
        return items.find((item) => item._id === selectedCustomItemId) ?? null;
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

    function getPurchaseEntryQuantity(entry) {
        return Math.max(1, Number(entry?.quantity ?? 1));
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
            quantity: 1,
        };
    }

    function isStackablePurchaseEntry(entry) {
        return getPurchaseEntryItem(entry)?.type === 'powerUp';
    }

    function getOwnedPowerUpQuantity(item) {
        if (item?.assetKey === STREAK_FREEZE_ASSET_KEY) {
            return Number(user?.streakShields ?? 0);
        }

        return item?.type === 'powerUp'
            ? Number(ownedPowerUpQuantities[item.assetKey] ?? 0)
            : 0;
    }

    function isBoostPowerUp(item) {
        return BOOST_ASSET_KEYS.has(item?.assetKey);
    }

    function getMonthlyBoostPurchaseQuantity(item) {
        return isBoostPowerUp(item)
            ? Number(monthlyBoostPurchaseQuantities[item.assetKey] ?? 0)
            : 0;
    }

    function getMaxOwnedQuantityForPowerUp(item) {
        if (item?.assetKey === STREAK_FREEZE_ASSET_KEY) {
            return MAX_STREAK_SHIELDS;
        }

        return MAX_OWNED_POWER_UP_QUANTITY;
    }

    function getMaxMonthlyQuantityForPowerUp(item) {
        return isBoostPowerUp(item)
            ? monthlyBoostPurchaseLimit
            : Number.POSITIVE_INFINITY;
    }

    function getMaxCartQuantityForEntry(entry) {
        const item = getPurchaseEntryItem(entry);

        if (!isStackablePurchaseEntry(entry)) {
            return 1;
        }

        const ownedRemainingQuantity = getMaxOwnedQuantityForPowerUp(item) - getOwnedPowerUpQuantity(item);
        const monthlyRemainingQuantity = getMaxMonthlyQuantityForPowerUp(item) - getMonthlyBoostPurchaseQuantity(item);

        return Math.max(0, Math.min(ownedRemainingQuantity, monthlyRemainingQuantity));
    }

    function isCartEntryAtQuantityLimit(entry) {
        return isStackablePurchaseEntry(entry)
            && getPurchaseEntryQuantity(entry) >= getMaxCartQuantityForEntry(entry);
    }

    function isPurchaseEntryOwned(entry) {
        if (isStackablePurchaseEntry(entry)) {
            return false;
        }

        return ownedItemSignatures.has(getPurchaseEntrySignature(entry));
    }

    function isOwnedPowerUpQuantityMax(item) {
        return getOwnedPowerUpQuantity(item) >= getMaxOwnedQuantityForPowerUp(item);
    }

    function isMonthlyBoostPurchaseQuantityMax(item) {
        return isBoostPowerUp(item) && getMonthlyBoostPurchaseQuantity(item) >= monthlyBoostPurchaseLimit;
    }

    function getPowerUpLimitLabel(item) {
        if (isOwnedPowerUpQuantityMax(item)) {
            return 'Inventory full';
        }

        if (isMonthlyBoostPurchaseQuantityMax(item)) {
            return 'Monthly limit';
        }

        return 'Limit reached';
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

        if (!isStackablePurchaseEntry(nextEntry) && ownedItemSignatures.has(nextEntry.cartKey)) {
            return currentCartItems;
        }

        const existingEntry = currentCartItems.find((entry) => entry.cartKey === nextEntry.cartKey);

        if (existingEntry) {
            if (!isStackablePurchaseEntry(existingEntry)) {
                return currentCartItems;
            }

            if (isCartEntryAtQuantityLimit(existingEntry)) {
                return currentCartItems;
            }

            return currentCartItems.map((entry) => (
                entry.cartKey === nextEntry.cartKey
                    ? { ...entry, quantity: getPurchaseEntryQuantity(entry) + 1 }
                    : entry
            ));
        }

        if (isStackablePurchaseEntry(nextEntry) && getMaxCartQuantityForEntry(nextEntry) <= 0) {
            return currentCartItems;
        }

        return [...currentCartItems, nextEntry];
    }

    function handlePremiumRequired() {
        setPremiumDialogTitle(undefined);
        setPremiumDialogDescription(undefined);
        setIsPremiumDialogOpen(true);
    }

    function handleAddCurrentItemToCart(item) {
        if (isFreeUser && item?.premiumOnly) {
            handlePremiumRequired();
            return;
        }
        setError('');
        setCartItems((currentCartItems) => addCartEntry(currentCartItems, item));
    }

    function handleTryOnItem(itemId) {
        const item = items.find((shopItem) => shopItem._id === itemId);

        if (!item) {
            return;
        }

        setError('');
        setSelectedCustomItemId(item._id);
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

    function handleIncreaseCartEntry(cartKey) {
        setError('');
        setCartItems((currentCartItems) => currentCartItems.map((entry) => (
            entry.cartKey === cartKey && isStackablePurchaseEntry(entry) && !isCartEntryAtQuantityLimit(entry)
                ? { ...entry, quantity: getPurchaseEntryQuantity(entry) + 1 }
                : entry
        )));
    }

    function handleDecreaseCartEntry(cartKey) {
        setError('');
        setCartItems((currentCartItems) => currentCartItems.flatMap((entry) => {
            if (entry.cartKey !== cartKey || !isStackablePurchaseEntry(entry)) {
                return [entry];
            }

            const nextQuantity = getPurchaseEntryQuantity(entry) - 1;
            return nextQuantity > 0 ? [{ ...entry, quantity: nextQuantity }] : [];
        }));
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

    function addPurchasedPowerUpQuantities(purchasedQuantitiesByCartKey, purchasedEntries) {
        setOwnedPowerUpQuantities((currentQuantities) => {
            const nextQuantities = { ...currentQuantities };

            purchasedEntries.forEach((entry) => {
                const item = getPurchaseEntryItem(entry);
                const purchasedQuantity = purchasedQuantitiesByCartKey[entry.cartKey] ?? 0;

                if (item?.type === 'powerUp' && purchasedQuantity > 0) {
                    if (item.assetKey === STREAK_FREEZE_ASSET_KEY) {
                        return;
                    }

                    nextQuantities[item.assetKey] = Math.min(
                        MAX_OWNED_POWER_UP_QUANTITY,
                        Number(nextQuantities[item.assetKey] ?? 0) + purchasedQuantity,
                    );
                }
            });

            return nextQuantities;
        });
    }

    function addPurchasedMonthlyBoostQuantities(purchasedQuantitiesByCartKey, purchasedEntries) {
        setMonthlyBoostPurchaseQuantities((currentQuantities) => {
            const nextQuantities = { ...currentQuantities };

            purchasedEntries.forEach((entry) => {
                const item = getPurchaseEntryItem(entry);
                const purchasedQuantity = purchasedQuantitiesByCartKey[entry.cartKey] ?? 0;

                if (isBoostPowerUp(item) && purchasedQuantity > 0) {
                    nextQuantities[item.assetKey] = Math.min(
                        monthlyBoostPurchaseLimit,
                        Number(nextQuantities[item.assetKey] ?? 0) + purchasedQuantity,
                    );
                }
            });

            return nextQuantities;
        });
    }

    async function handleBuyItems(entriesForPurchase) {
        setError('');

        const totalCost = entriesForPurchase.reduce(
            (total, entry) => total + ((getPurchaseEntryItem(entry)?.price ?? 0) * getPurchaseEntryQuantity(entry)),
            0,
        );
        const availableCoins = user?.coins ?? 0;

        if (totalCost > availableCoins) {
            if (isFreeUser) {
                openPremiumPageAfterPurchaseDialog(
                    `You do not have enough moon coins for the whole cart (${totalCost} needed, you have ${availableCoins}). Premium gives you monthly bonus coins${premiumMonthlyCoins ? ` (${premiumMonthlyCoins} coins)` : ''}.`,
                    '',
                    'Not enough moon coins',
                );
            } else {
                openPremiumPageAfterPurchaseDialog(
                    `You do not have enough moon coins for the whole cart — you need ${totalCost} but have ${availableCoins}. Remove some items first.`,
                    '',
                    'Not enough moon coins',
                    false,
                );
            }
            return;
        }

        setBuyingItemId('cart');
        const purchasedEntries = [];
        const purchasedQuantitiesByCartKey = {};
        let failedEntry = null;

        try {
            for (const entry of entriesForPurchase) {
                const item = getPurchaseEntryItem(entry);
                const customization = getPurchaseEntryCustomization(entry);
                const quantity = getPurchaseEntryQuantity(entry);

                failedEntry = entry;
                for (let count = 0; count < quantity; count += 1) {
                    await buyItem(item._id, customization);
                    purchasedQuantitiesByCartKey[entry.cartKey] = (purchasedQuantitiesByCartKey[entry.cartKey] ?? 0) + 1;
                }

                purchasedEntries.push(entry);
            }

            setOwnedItemSignatures((currentOwnedItemSignatures) => {
                const nextOwnedItemSignatures = new Set(currentOwnedItemSignatures);
                purchasedEntries.forEach((entry) => {
                    if (!isStackablePurchaseEntry(entry)) {
                        nextOwnedItemSignatures.add(getPurchaseEntrySignature(entry));
                    }
                });
                return nextOwnedItemSignatures;
            });
            addPurchasedPowerUpQuantities(purchasedQuantitiesByCartKey, entriesForPurchase);
            addPurchasedMonthlyBoostQuantities(purchasedQuantitiesByCartKey, entriesForPurchase);
            setCartItems((currentCartItems) => currentCartItems.flatMap((entry) => {
                const purchasedQuantity = purchasedQuantitiesByCartKey[entry.cartKey] ?? 0;

                if (purchasedQuantity <= 0) {
                    return [entry];
                }

                const remainingQuantity = getPurchaseEntryQuantity(entry) - purchasedQuantity;
                return remainingQuantity > 0 ? [{ ...entry, quantity: remainingQuantity }] : [];
            }));
            await Promise.all([
                refreshCurrentUser(),
                refreshBoostPurchaseLimits(),
            ]);
            setItemsToBuy([]);
        } catch (buyError) {
            if (Object.keys(purchasedQuantitiesByCartKey).length > 0) {
                setOwnedItemSignatures((currentOwnedItemSignatures) => {
                    const nextOwnedItemSignatures = new Set(currentOwnedItemSignatures);
                    purchasedEntries.forEach((entry) => {
                        if (!isStackablePurchaseEntry(entry)) {
                            nextOwnedItemSignatures.add(getPurchaseEntrySignature(entry));
                        }
                    });
                    return nextOwnedItemSignatures;
                });
                addPurchasedPowerUpQuantities(purchasedQuantitiesByCartKey, entriesForPurchase);
                addPurchasedMonthlyBoostQuantities(purchasedQuantitiesByCartKey, entriesForPurchase);
                setCartItems((currentCartItems) => currentCartItems.flatMap((entry) => {
                    const purchasedQuantity = purchasedQuantitiesByCartKey[entry.cartKey] ?? 0;

                    if (purchasedQuantity <= 0) {
                        return [entry];
                    }

                    const remainingQuantity = getPurchaseEntryQuantity(entry) - purchasedQuantity;
                    return remainingQuantity > 0 ? [{ ...entry, quantity: remainingQuantity }] : [];
                }));
                await Promise.all([
                    refreshCurrentUser(),
                    refreshBoostPurchaseLimits(),
                ]);
            }

            const failedItem = getPurchaseEntryItem(failedEntry);

            let shouldCloseConfirmation = true;

            if (buyError.code === 'ITEM_ALREADY_OWNED') {
                setError('One of these items is already in your inventory');
            } else if (buyError.code === 'BOOST_QUANTITY_LIMIT_REACHED') {
                await refreshCurrentUser();
            } else if (buyError.code === 'BOOST_MONTHLY_LIMIT_REACHED') {
                setError('Monthly boost purchase limit reached for this boost.');
                await refreshBoostPurchaseLimits();
            } else if (buyError.code === 'SHIELDS_AT_MAX') {
                await refreshCurrentUser();
            } else if (buyError.code === 'PREMIUM_REQUIRED') {
                if (isFreeUser) {
                    shouldCloseConfirmation = false;
                    openPremiumPageAfterPurchaseDialog(
                        `${failedItem ? getItemDisplayName(failedItem) : 'This item'} is a premium item. Upgrade to buy premium shop items and get monthly bonus coins.`,
                        failedItem?._id ?? '',
                    );
                } else {
                    setError(`${failedItem ? getItemDisplayName(failedItem) : 'This item'} is premium only`);
                }
            } else if (buyError.code === 'NOT_ENOUGH_COINS') {
                shouldCloseConfirmation = false;
                if (isFreeUser) {
                    openPremiumPageAfterPurchaseDialog(
                        `You do not have enough moon coins for this purchase. Premium gives you monthly bonus coins${premiumMonthlyCoins ? ` (${premiumMonthlyCoins} coins)` : ''}.`,
                        '',
                        'Not enough moon coins'
                    );
                } else {
                    openPremiumPageAfterPurchaseDialog(
                        'You do not have enough moon coins for this purchase.',
                        '',
                        'Not enough moon coins',
                        false
                    );
                }
            } else {
                setError('Buying these items did not work');
            }

            if (shouldCloseConfirmation) {
                setItemsToBuy([]);
            }
        } finally {
            setBuyingItemId(null);
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
                        <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
                            <TabsList className="h-auto flex-wrap border border-theme-text/10 bg-theme-surface p-1 text-theme-text-soft">
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

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <ActionButton
                                type="button"
                                className="h-9 bg-theme-text/10 px-4 text-sm text-theme-text hover:bg-theme-text/20 disabled:text-theme-text-muted"
                                disabled={previewItems.length === 0}
                                onClick={clearPreviewItems}
                            >
                                Unequip all
                            </ActionButton>
                        </div>
                    </div>

                    {isLoading ? <p className="text-sm text-theme-text-soft">Loading shop items...</p> : null}
                    {!isLoading && !error && items.length === 0 ? (
                        <p className="text-sm text-theme-text-soft">No shop items yet</p>
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
                        leadingCard={selectedCategory === 'all' || selectedCategory === 'powerUp' ? (
                            <>
                                <StreakFreezeCard
                                    key="streak-freeze"
                                    onAddToCart={handleAddCurrentItemToCart}
                                    onBuy={(item) => openBuyConfirmation([createPurchaseEntry(item)])}
                                    getCartQuantity={(item) => {
                                        const cartEntry = cartItems.find((entry) => entry.cartKey === createPurchaseEntry(item).cartKey);
                                        return cartEntry ? getPurchaseEntryQuantity(cartEntry) : 0;
                                    }}
                                    isCartQuantityMax={(item) => {
                                        const cartEntry = cartItems.find((entry) => entry.cartKey === createPurchaseEntry(item).cartKey);
                                        const entry = cartEntry ?? createPurchaseEntry(item);
                                        return getMaxCartQuantityForEntry(entry) <= 0 || (cartEntry ? isCartEntryAtQuantityLimit(cartEntry) : false);
                                    }}
                                    isOwnedQuantityMax={isOwnedPowerUpQuantityMax}
                                    isBuying={buyingItemId === 'cart'}
                                    isFreeUser={isFreeUser}
                                    onPremiumRequired={handlePremiumRequired}
                                />
                                <BoostPowerUpCards
                                    key="habit-boosts"
                                    onAddToCart={handleAddCurrentItemToCart}
                                    onBuy={(item) => openBuyConfirmation([createPurchaseEntry(item)])}
                                    getCartQuantity={(item) => {
                                        const cartEntry = cartItems.find((entry) => entry.cartKey === createPurchaseEntry(item).cartKey);
                                        return cartEntry ? getPurchaseEntryQuantity(cartEntry) : 0;
                                    }}
                                    isCartQuantityMax={(item) => {
                                        const cartEntry = cartItems.find((entry) => entry.cartKey === createPurchaseEntry(item).cartKey);
                                        const entry = cartEntry ?? createPurchaseEntry(item);
                                        return getMaxCartQuantityForEntry(entry) <= 0 || (cartEntry ? isCartEntryAtQuantityLimit(cartEntry) : false);
                                    }}
                                    isOwnedQuantityMax={isOwnedPowerUpQuantityMax}
                                    isMonthlyQuantityMax={isMonthlyBoostPurchaseQuantityMax}
                                    getLimitLabel={getPowerUpLimitLabel}
                                    isBuying={buyingItemId === 'cart'}
                                    isFreeUser={isFreeUser}
                                    onPremiumRequired={handlePremiumRequired}
                                />
                            </>
                        ) : null}
                        isFreeUser={isFreeUser}
                        onPremiumRequired={handlePremiumRequired}
                    />

                    <div className="mt-4 flex justify-end">
                        <ActionButton
                            type="button"
                            className={`gap-2 px-4 ${cartItems.length === 0 ? 'bg-theme-text/10 text-theme-text-muted hover:bg-theme-text/15' : 'bg-violet-500 text-white hover:bg-violet-400'}`}
                            onClick={() => setIsCartOpen(true)}
                        >
                            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                            Cart
                            <span className="rounded-full bg-theme-text/20 px-2 py-0.5 text-xs">{cartItemCount}</span>
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

            <PremiumRequiredDialog
                isOpen={isPremiumDialogOpen}
                onClose={() => setIsPremiumDialogOpen(false)}
                title={premiumDialogTitle}
                description={premiumDialogDescription}
                showIcon={premiumDialogShowsUpgradeActions}
                showActions={premiumDialogShowsUpgradeActions}
            />

            <CartDialog
                isOpen={isCartOpen}
                onOpenChange={setIsCartOpen}
                cartItems={cartItems}
                cartItemsToBuy={cartItemsToBuy}
                cartTotalPrice={cartTotalPrice}
                getPurchaseEntryItem={getPurchaseEntryItem}
                getPurchaseEntryCustomization={getPurchaseEntryCustomization}
                getPurchaseEntryQuantity={getPurchaseEntryQuantity}
                isStackablePurchaseEntry={isStackablePurchaseEntry}
                isCartEntryAtQuantityLimit={isCartEntryAtQuantityLimit}
                isPurchaseEntryOwned={isPurchaseEntryOwned}
                onRemoveCartEntry={handleRemoveCartEntry}
                onIncreaseCartEntry={handleIncreaseCartEntry}
                onDecreaseCartEntry={handleDecreaseCartEntry}
                onOpenBuyConfirmation={openBuyConfirmation}
            />

            <PurchaseConfirmationDialog
                itemsToBuy={itemsToBuy}
                confirmationTotalPrice={confirmationTotalPrice}
                buyingItemId={buyingItemId}
                getPurchaseEntryItem={getPurchaseEntryItem}
                getPurchaseEntryQuantity={getPurchaseEntryQuantity}
                onOpenChange={(open) => !open && setItemsToBuy([])}
                onBuyItems={handleBuyItems}
            />
        </Page>
    );
}

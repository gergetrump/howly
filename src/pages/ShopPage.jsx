import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Minus, ShoppingCart, X } from 'lucide-react';
import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { CompanionAvatar } from '@/components/brand';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { renderShopItemVisual } from '@/components/brand/items/itemRegistry';
import { Page, PageSection, Heading } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ConfirmationDialog,
    ConfirmationDialogAction,
    ConfirmationDialogCancel,
    ConfirmationDialogContent,
    ConfirmationDialogDescription,
    ConfirmationDialogFooter,
    ConfirmationDialogHeader,
    ConfirmationDialogTitle,
} from '@/components/ui/confirmation-dialog';
import { useAuth } from '@/context/authContext';
import { ITEM_CATEGORIES, SINGLE_EQUIP_ITEM_TYPES } from '@/constants/itemCategories';
import { buyItem, getMyInventory } from '@/services/inventoryApi';
import { getItems } from '@/services/itemApi';
import { getCurrentUser, getCurrentUserPlan } from '@/services/userService';
import { confirmCheckoutSession } from '@/services/paymentService';

const PREMIUM_RETURN_ITEM_STORAGE_KEY = 'howly_premium_return_item_id';

export function ShopPage() {
    const navigate = useNavigate();
    const { user, setUser, companion } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [ownedItemIds, setOwnedItemIds] = useState(new Set());
    const [previewItems, setPreviewItems] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState(null);
    const [itemsToBuy, setItemsToBuy] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [error, setError] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [premiumReturnItemId, setPremiumReturnItemId] = useState('');
    const [planInfo, setPlanInfo] = useState(null);

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
                const retryUser = await refreshCurrentUser();

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
                    setOwnedItemIds(new Set(nextInventory.map((entry) => entry.item?._id).filter(Boolean)));
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
        () => previewItems.map((item) => item.assetKey).filter(Boolean),
        [previewItems],
    );

    const cartItemsToBuy = useMemo(
        () => cartItems.filter((item) => !ownedItemIds.has(item._id)),
        [cartItems, ownedItemIds],
    );

    const cartTotalPrice = useMemo(
        () => cartItemsToBuy.reduce((total, item) => total + (item.price ?? 0), 0),
        [cartItemsToBuy],
    );

    const confirmationTotalPrice = useMemo(
        () => itemsToBuy.reduce((total, item) => total + (item.price ?? 0), 0),
        [itemsToBuy],
    );

    const filteredItems = useMemo(
        () => activeCategory === 'all'
            ? items
            : items.filter((item) => item.type === activeCategory),
        [activeCategory, items],
    );

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
    }, [items, premiumReturnItemId]);

    function isItemInCart(itemId) {
        return cartItems.some((item) => item._id === itemId);
    }

    function isItemPreviewed(itemId) {
        return previewItems.some((item) => item._id === itemId);
    }

    function addSelectedItem(currentItems, item) {
        if (SINGLE_EQUIP_ITEM_TYPES.has(item.type)) {
            return [
                ...currentItems.filter((currentItem) => currentItem.type !== item.type),
                item,
            ];
        }

        return [...currentItems, item];
    }

    function handleTryOnItem(itemId) {
        const item = items.find((shopItem) => shopItem._id === itemId);

        if (!item) {
            return;
        }

        setError('');
        const isAlreadyPreviewed = isItemPreviewed(item._id);
        const isOwned = ownedItemIds.has(item._id);

        if (isAlreadyPreviewed) {
            setPreviewItems((currentPreviewItems) => currentPreviewItems.filter((previewItem) => previewItem._id !== item._id));
            setCartItems((currentCartItems) => currentCartItems.filter((cartItem) => cartItem._id !== item._id));
            return;
        }

        setPreviewItems((currentPreviewItems) => addSelectedItem(currentPreviewItems, item));

        if (isOwned) {
            if (SINGLE_EQUIP_ITEM_TYPES.has(item.type)) {
                setCartItems((currentCartItems) => currentCartItems.filter((cartItem) => cartItem.type !== item.type));
            }
            return;
        }

        setCartItems((currentCartItems) => addSelectedItem(currentCartItems, item));
    }

    function handleRemoveCartItem(itemId) {
        setError('');
        setCartItems((currentCartItems) => currentCartItems.filter((item) => item._id !== itemId));
        setPreviewItems((currentPreviewItems) => currentPreviewItems.filter((item) => item._id !== itemId));
    }

    function openBuyConfirmation(itemsForPurchase) {
        const nextItemsToBuy = itemsForPurchase.filter((item) => !ownedItemIds.has(item._id));

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

    async function handleBuyItems(itemsForPurchase) {
        setBuyingItemId('cart');
        setError('');
        const purchasedItems = [];
        let failedItem = null;

        try {
            for (const item of itemsForPurchase) {
                failedItem = item;
                await buyItem(item._id);
                purchasedItems.push(item);
            }

            setOwnedItemIds((currentOwnedItemIds) => {
                const nextOwnedItemIds = new Set(currentOwnedItemIds);
                purchasedItems.forEach((item) => nextOwnedItemIds.add(item._id));
                return nextOwnedItemIds;
            });
            setCartItems((currentCartItems) => (
                currentCartItems.filter((item) => !purchasedItems.some((purchasedItem) => purchasedItem._id === item._id))
            ));
            await refreshCurrentUser();
        } catch (buyError) {
            if (purchasedItems.length > 0) {
                setOwnedItemIds((currentOwnedItemIds) => {
                    const nextOwnedItemIds = new Set(currentOwnedItemIds);
                    purchasedItems.forEach((item) => nextOwnedItemIds.add(item._id));
                    return nextOwnedItemIds;
                });
                setCartItems((currentCartItems) => (
                    currentCartItems.filter((item) => !purchasedItems.some((purchasedItem) => purchasedItem._id === item._id))
                ));
                await refreshCurrentUser();
            }

            if (buyError.code === 'ITEM_ALREADY_OWNED') {
                setError('One of these items is already in your inventory');
            } else if (buyError.code === 'PREMIUM_REQUIRED') {
                if (isFreeUser) {
                    openPremiumPage(
                        `${failedItem?.name ?? 'This item'} is a premium item. Upgrade to buy premium shop items and get monthly bonus coins.`,
                        failedItem?._id ?? '',
                    );
                } else {
                    setError(`${failedItem?.name ?? 'This item'} is premium only`);
                }
            } else if (buyError.code === 'NOT_ENOUGH_COINS') {
                if (isFreeUser) {
                    openPremiumPage(
                        `You do not have enough moon coins for ${failedItem?.name ?? 'this item'}. Premium gives you monthly bonus coins${premiumMonthlyCoins ? ` (${premiumMonthlyCoins} coins)` : ''}.`,
                        failedItem?._id ?? '',
                    );
                } else {
                    setError(`You do not have enough moon coins for ${failedItem?.name ?? 'this item'}`);
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
        <Page theme="forest" className="overflow-hidden">
            <Heading title="Shop" subtitle="Unlock items for your companion." streakDays={user?.streak ?? 0} />
            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(18rem,0.65fr)_minmax(0,1.7fr)] lg:items-start">
                <section className="flex min-h-72 flex-col items-center justify-center gap-3 text-center lg:sticky lg:top-24 lg:min-h-[30rem]">
                    <CompanionAvatar
                        type={companion?.type}
                        name={companion?.name}
                        size="xl"
                        showName
                        previewItemKeys={previewItemKeys}
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
                    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl shadow-slate-950/20">
                        <div className="h-[34rem] max-h-[34rem] overflow-y-scroll pr-2 [scrollbar-gutter:stable]">
                            {!isLoading && !error && items.length > 0 && filteredItems.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-center">
                                    <p className="text-sm text-slate-300">No items in this category yet</p>
                                </div>
                            ) : null}

                            {filteredItems.length > 0 ? (
                                <CardGrid columns={3} className="pb-8">
                                    {filteredItems.map((item) => (
                                        <div key={item._id} data-shop-item-id={item._id}>
                                            <ItemCard
                                                name={item.name}
                                                price={item.price}
                                                premiumOnly={item.premiumOnly}
                                                owned={ownedItemIds.has(item._id)}
                                                showOwnedBadge={false}
                                                dense
                                                visual={renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]')}
                                            >
                                                <ActionButton
                                                    type="button"
                                                    fullWidth
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => handleTryOnItem(item._id)}
                                                >
                                                    {isItemPreviewed(item._id) || isItemInCart(item._id) ? 'Remove' : 'Try on'}
                                                </ActionButton>
                                                <ActionButton
                                                    type="button"
                                                    fullWidth
                                                    className="h-8 px-3 text-xs"
                                                    disabled={ownedItemIds.has(item._id) || buyingItemId === item._id}
                                                    onClick={() => openBuyConfirmation([item])}
                                                >
                                                    {ownedItemIds.has(item._id) ? 'Owned' : 'Buy'}
                                                </ActionButton>
                                            </ItemCard>
                                        </div>
                                    ))}
                                </CardGrid>
                            ) : null}
                        </div>
                        <div className="pointer-events-none absolute inset-x-3 bottom-3 h-10 rounded-b-xl bg-gradient-to-t from-howly-card to-transparent" />
                    </div>

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
            </div>

            <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
                <DialogContent className="border-white/10 bg-[#1e1b3a] p-0 text-white shadow-2xl sm:max-w-lg">
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Cart</DialogTitle>
                            <DialogDescription className="text-slate-300">
                                Items you are trying on
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
                            {cartItems.length === 0 ? (
                                <div className="rounded-2xl bg-white/8 p-5 text-center text-sm text-slate-300 ring-1 ring-white/10">
                                    Your cart is empty
                                </div>
                            ) : null}
                            {cartItems.map((item) => {
                                const isOwned = ownedItemIds.has(item._id);

                                return (
                                    <div
                                        key={item._id}
                                        className="flex items-center gap-3 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"
                                    >
                                        <div className="flex h-16 w-20 shrink-0 items-center justify-center">
                                            {renderShopItemVisual(item, 'max-h-full max-w-full')}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold">{item.name}</p>
                                            {isOwned ? (
                                                <p className="text-sm text-slate-300">Already owned</p>
                                            ) : (
                                                <MoonCoin amount={item.price} compact />
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                                            aria-label={`Remove ${item.name} from cart`}
                                            onClick={() => handleRemoveCartItem(item._id)}
                                        >
                                            <Minus className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                            <div>
                                <p className="text-sm text-slate-300">Total</p>
                                <MoonCoin amount={cartTotalPrice} />
                            </div>
                            <ActionButton
                                type="button"
                                className="h-11 bg-violet-500 px-5 text-white hover:bg-violet-400 disabled:bg-white/10 disabled:text-slate-500"
                                disabled={cartItemsToBuy.length === 0}
                                onClick={() => openBuyConfirmation(cartItems)}
                            >
                                Buy
                            </ActionButton>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog open={itemsToBuy.length > 0} onOpenChange={(open) => !open && setItemsToBuy([])}>
                <ConfirmationDialogContent className="overflow-hidden rounded-3xl border border-violet-300/20 bg-[#1e1b3a] p-0 text-white shadow-2xl shadow-violet-950/40 sm:max-w-md">
                    <div className="relative bg-gradient-to-br from-violet-500/25 via-transparent to-fuchsia-500/15 px-8 pb-8 pt-18">
                        <ConfirmationDialogCancel
                            size="icon"
                            variant="ghost"
                            className="absolute left-5 top-5 h-10 w-10 rounded-full bg-white/12 text-white hover:bg-white/20 hover:text-white"
                            aria-label="Close purchase confirmation"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </ConfirmationDialogCancel>

                        <ConfirmationDialogHeader className="space-y-0 text-center">
                            <ConfirmationDialogTitle className="mx-auto max-w-sm text-xl font-bold leading-tight">
                                Buy {itemsToBuy.length === 1 ? itemsToBuy[0].name : `${itemsToBuy.length} items`}?
                            </ConfirmationDialogTitle>
                            <ConfirmationDialogDescription className="sr-only">
                                Confirm that these items should be added to your inventory.
                            </ConfirmationDialogDescription>
                        </ConfirmationDialogHeader>

                        <ConfirmationDialogFooter className="mt-5 block">
                            <ConfirmationDialogAction
                                className="h-10 w-full rounded-xl bg-violet-500 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 hover:bg-violet-400 disabled:bg-violet-500/60"
                                disabled={itemsToBuy.length === 0 || buyingItemId === 'cart'}
                                onClick={() => handleBuyItems(itemsToBuy)}
                            >
                                {buyingItemId === 'cart' ? 'Buying...' : `Buy ${confirmationTotalPrice} 🌙`}
                            </ConfirmationDialogAction>
                        </ConfirmationDialogFooter>
                    </div>
                </ConfirmationDialogContent>
            </ConfirmationDialog>
        </Page>
    );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Minus, Palette, Pencil, ShoppingCart, X } from 'lucide-react';
import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { CompanionAvatar } from '@/components/brand';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { getItemDisplayName, renderShopItemVisual } from '@/components/brand/items/itemRegistry';
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
import { StreakFreezeCard } from '@/components/shop/StreakFreezeCard.jsx';
import { buyItem, getMyInventory } from '@/services/inventoryApi';
import { getItems } from '@/services/itemApi';
import { getCurrentUser, getCurrentUserPlan } from '@/services/userService';
import { confirmCheckoutSession } from '@/services/paymentService';
import { itemMatchesCategory } from '@/lib/inventoryItems';

const PREMIUM_RETURN_ITEM_STORAGE_KEY = 'howly_premium_return_item_id';
const MAX_CUSTOM_TEXT_LENGTH = 20;
const ITEM_CUSTOMIZATION_CONFIG = {
    hoodie: {
        defaults: {
            color: '#C66E6E',
            stringColor: '#DADADA',
            textColor: '#FFFFFF',
            text: 'HOWLY',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'stringColor', label: 'Strings' },
            { key: 'textColor', label: 'Text' },
        ],
        text: {
            key: 'text',
            label: 'Hoodie text',
            placeholder: 'HOWLY',
        },
    },
    'cream-top': {
        defaults: {
            color: '#F4EFE5',
            buttonColor: '#B18167',
            pocketColor: '#DDCEAF',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'buttonColor', label: 'Buttons' },
            { key: 'pocketColor', label: 'Pockets' },
        ],
    },
    'warm-top': {
        defaults: {
            color: '#F4EFE5',
            buttonColor: '#B18167',
            pocketColor: '#DDCEAF',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
            { key: 'buttonColor', label: 'Buttons' },
            { key: 'pocketColor', label: 'Pockets' },
        ],
    },
    'cozy-jacket': {
        defaults: {
            jacketColor: '#4A6741',
            stringColor: '#DADADA',
            shirtColor: '#F4EFE5',
        },
        colorSlots: [
            { key: 'jacketColor', label: 'Jacket' },
            { key: 'stringColor', label: 'Strings' },
            { key: 'shirtColor', label: 'Shirt' },
        ],
    },
    suit: {
        defaults: {
            jacketColor: '#392E18',
            shirtColor: '#EEEEEE',
            tieColor: '#670000',
            tieStripeColor: '#FFC000',
        },
        colorSlots: [
            { key: 'jacketColor', label: 'Jacket' },
            { key: 'shirtColor', label: 'Shirt' },
            { key: 'tieColor', label: 'Tie' },
            { key: 'tieStripeColor', label: 'Tie stripe' },
        ],
    },
    cup: {
        defaults: {
            color: '#E09AAB',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
    glasses: {
        defaults: {
            color: '#000000',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
    phone: {
        defaults: {
            frameColor: '#D9D9D9',
            backgroundColor: '#575757',
        },
        colorSlots: [
            { key: 'frameColor', label: 'Frame' },
            { key: 'backgroundColor', label: 'Background' },
        ],
    },
    'warm-hat': {
        defaults: {
            color: '#4A6741',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
    sneaker: {
        defaults: {
            color: '#1A1A1A',
        },
        colorSlots: [
            { key: 'color', label: 'Whole' },
        ],
    },
};
const PALETTE_COLORS = [
    '#FFFFFF', '#F8FAFC', '#E5E7EB', '#CBD5E1', '#94A3B8', '#64748B', '#334155', '#111827',
    '#FCE7F3', '#F9A8D4', '#F472B6', '#EC4899', '#BE185D', '#7E2249', '#DDD6FE', '#A78BFA',
    '#FEE2E2', '#FDA4AF', '#FB7185', '#EF4444', '#B91C1C', '#FED7AA', '#FB923C', '#C2410C',
    '#FEF3C7', '#FDE68A', '#FACC15', '#CA8A04', '#713F12', '#DCFCE7', '#86EFAC', '#22C55E',
    '#BBF7D0', '#5EEAD4', '#14B8A6', '#0F766E', '#E0F2FE', '#7DD3FC', '#0EA5E9', '#0369A1',
    '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8', '#312E81', '#EDE9FE', '#8B5CF6', '#6D28D9',
];

function normalizeHexInput(value) {
    const trimmedValue = value.trim();
    const hexValue = trimmedValue.startsWith('#') ? trimmedValue : `#${trimmedValue}`;

    return /^#[0-9A-Fa-f]{6}$/.test(hexValue) ? hexValue.toUpperCase() : null;
}

function getCustomizationConfig(assetKey) {
    return ITEM_CUSTOMIZATION_CONFIG[assetKey] ?? null;
}

function normalizeItemCustomization(itemOrAssetKey, customization = {}) {
    const assetKey = typeof itemOrAssetKey === 'string' ? itemOrAssetKey : itemOrAssetKey?.assetKey;
    const config = getCustomizationConfig(assetKey);

    if (!config) {
        return {};
    }

    return {
        ...config.defaults,
        ...customization,
    };
}

function getItemOwnershipSignature(item, customization = {}) {
    const itemId = item?._id?.toString?.() ?? item?._id;

    if (!itemId) {
        return '';
    }

    const config = getCustomizationConfig(item.assetKey);

    if (!config) {
        return `${itemId}:default`;
    }

    const normalizedCustomization = normalizeItemCustomization(item, customization);
    const signatureParts = Object.keys(config.defaults).map((key) => normalizedCustomization[key]);

    return [itemId, ...signatureParts].join(':');
}

function getInventoryEntryOwnershipSignature(entry) {
    return getItemOwnershipSignature(entry.item, entry.customization ?? {});
}

function ItemColorPicker({
    colors,
    colorSlots,
    activeSlot,
    onSlotChange,
    onColorChange,
    itemName,
    onAddToCart,
    addToCartLabel = 'Add to cart',
    isAddToCartDisabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const fallbackSlot = colorSlots[0]?.key;
    const selectedColor = colors[activeSlot] ?? colors[fallbackSlot] ?? '#FFFFFF';
    const [position, setPosition] = useState(null);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const nativeColorInputRef = useRef(null);

    function getPanelPosition() {
        const triggerRect = triggerRef.current?.getBoundingClientRect();

        if (!triggerRect) {
            return null;
        }

        const panelWidth = 320;
        const panelMaxHeight = 560;
        const minimumPanelHeight = 160;
        const viewportMargin = 16;
        const triggerGap = 10;
        const maxViewportHeight = Math.max(minimumPanelHeight, window.innerHeight - (viewportMargin * 2));
        const left = Math.min(
            Math.max(triggerRect.left - panelWidth + triggerRect.width, viewportMargin),
            window.innerWidth - panelWidth - viewportMargin,
        );
        const availableBelow = window.innerHeight - triggerRect.bottom - triggerGap - viewportMargin;
        const availableAbove = triggerRect.top - triggerGap - viewportMargin;
        const shouldOpenBelow = availableBelow >= Math.min(panelMaxHeight, minimumPanelHeight) || availableBelow >= availableAbove;
        const availableVerticalSpace = shouldOpenBelow ? availableBelow : availableAbove;
        const maxHeight = Math.min(
            panelMaxHeight,
            maxViewportHeight,
            Math.max(minimumPanelHeight, availableVerticalSpace),
        );
        const preferredTop = shouldOpenBelow
            ? triggerRect.bottom + triggerGap
            : Math.max(viewportMargin, triggerRect.top - triggerGap - maxHeight);
        const top = Math.min(
            Math.max(preferredTop, viewportMargin),
            window.innerHeight - maxHeight - viewportMargin,
        );

        return { left, top, maxHeight };
    }

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        function updatePosition() {
            const nextPosition = getPanelPosition();

            if (nextPosition) {
                setPosition(nextPosition);
            }
        }

        function handleClickOutside(event) {
            if (
                !triggerRef.current?.contains(event.target)
                && !panelRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        updatePosition();
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    function applyColor(nextColor) {
        onColorChange(activeSlot, nextColor.toUpperCase());
    }

    function handleHexInputChange(event) {
        const nextValue = event.target.value;
        const normalizedColor = normalizeHexInput(nextValue);

        if (normalizedColor) {
            applyColor(normalizedColor);
        }
    }

    function handleTogglePicker() {
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        const triggerRect = triggerRef.current?.getBoundingClientRect();
        const nextPosition = triggerRect ? getPanelPosition() : null;

        setPosition(nextPosition);

        setIsOpen(true);
    }

    const pickerPanel = isOpen && position ? createPortal(
        <div
            ref={panelRef}
            className="fixed z-[1000] w-80 overflow-y-auto rounded-2xl border border-white/15 bg-[#2b4563] p-4 text-white shadow-2xl shadow-slate-950/50"
            style={{ left: position.left, top: position.top, maxHeight: position.maxHeight }}
        >
            <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-white/8 p-1">
                {colorSlots.map((slot) => (
                    <button
                        key={slot.key}
                        type="button"
                        className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${activeSlot === slot.key ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
                        aria-pressed={activeSlot === slot.key}
                        onClick={() => onSlotChange(slot.key)}
                    >
                        {slot.label}
                    </button>
                ))}
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span
                        className="h-10 w-16 rounded-xl border border-white/20"
                        style={{ backgroundColor: selectedColor }}
                        aria-hidden="true"
                    />
                    <input
                        key={selectedColor}
                        defaultValue={selectedColor.toUpperCase()}
                        className="w-28 border-b border-white/70 bg-transparent text-lg font-bold uppercase tracking-wide text-white outline-none"
                        aria-label="Hoodie color hex code"
                        onChange={handleHexInputChange}
                    />
                </div>
                <button
                    type="button"
                    className="relative flex h-10 w-12 items-center justify-center rounded-md border border-white/70 bg-white/10 transition hover:bg-white/20"
                    aria-label="Open color wheel"
                    onClick={() => nativeColorInputRef.current?.click()}
                >
                    <Palette className="h-6 w-6" aria-hidden="true" />
                    <input
                        ref={nativeColorInputRef}
                        type="color"
                        value={selectedColor}
                        className="sr-only"
                        aria-hidden="true"
                        tabIndex={-1}
                        onChange={(event) => applyColor(event.target.value)}
                    />
                </button>
            </div>

            <div className="grid grid-cols-8 gap-1.5">
                {PALETTE_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        className={`h-7 rounded-sm border transition hover:scale-105 ${selectedColor === color ? 'border-white ring-2 ring-white/60' : 'border-white/20'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Choose ${itemName} color ${color}`}
                        aria-pressed={selectedColor === color}
                        onClick={() => applyColor(color)}
                    />
                ))}
            </div>

            <button
                type="button"
                className="mt-4 h-9 w-full rounded-xl bg-violet-500 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:bg-white/10 disabled:text-slate-400"
                disabled={isAddToCartDisabled}
                onClick={onAddToCart}
            >
                {addToCartLabel}
            </button>
        </div>,
        document.body,
    ) : null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/20"
                aria-label={`Customize ${itemName} color`}
                aria-expanded={isOpen}
                onClick={handleTogglePicker}
            >
                <Palette className="h-5 w-5 text-slate-100" aria-hidden="true" />
            </button>
            {pickerPanel}
        </>
    );
}

function ItemTextEditor({ value, label, placeholder, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ left: 0, top: 0 });
    const triggerRef = useRef(null);
    const panelRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        function updatePosition() {
            const triggerRect = triggerRef.current?.getBoundingClientRect();

            if (!triggerRect) {
                return;
            }

            const panelWidth = 220;
            const left = Math.min(
                Math.max(triggerRect.left - panelWidth + triggerRect.width, 16),
                window.innerWidth - panelWidth - 16,
            );
            const top = triggerRect.bottom + 10;

            setPosition({ left, top });
        }

        function handleClickOutside(event) {
            if (
                !triggerRef.current?.contains(event.target)
                && !panelRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        updatePosition();
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    function handleTextChange(event) {
        const nextText = event.target.value
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .slice(0, MAX_CUSTOM_TEXT_LENGTH)
            .toUpperCase();

        onChange(nextText);
    }

    const editorPanel = isOpen ? createPortal(
        <div
            ref={panelRef}
            className="fixed z-[1000] w-56 rounded-2xl border border-white/15 bg-[#2b4563] p-4 text-white shadow-2xl shadow-slate-950/50"
            style={{ left: position.left, top: position.top }}
        >
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-200" htmlFor="item-text-input">
                {label}
            </label>
            <input
                id="item-text-input"
                value={value}
                className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white outline-none focus:border-violet-200"
                maxLength={MAX_CUSTOM_TEXT_LENGTH}
                placeholder={placeholder}
                onChange={handleTextChange}
            />
        </div>,
        document.body,
    ) : null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/20"
                aria-label={`Edit ${label}`}
                aria-expanded={isOpen}
                onClick={() => setIsOpen((currentValue) => !currentValue)}
            >
                <Pencil className="h-4 w-4 text-slate-100" aria-hidden="true" />
            </button>
            {editorPanel}
        </>
    );
}

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
    const [syncedCategoryParam, setSyncedCategoryParam] = useState(null);
    const [premiumReturnItemId, setPremiumReturnItemId] = useState('');
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
        () => previewItems.map((item) => item.assetKey).filter(Boolean),
        [previewItems],
    );

    const previewItemConfigs = previewItems
        .filter((item) => getCustomizationConfig(item.assetKey))
        .map((item) => ({
            assetKey: item.assetKey,
            customization: getItemCustomization(item),
        }));

    const cartItemsToBuy = cartItems.filter((entry) => !isPurchaseEntryOwned(entry));
    const cartTotalPrice = cartItemsToBuy.reduce((total, entry) => total + (getPurchaseEntryItem(entry)?.price ?? 0), 0);
    const confirmationTotalPrice = itemsToBuy.reduce((total, entry) => total + (getPurchaseEntryItem(entry)?.price ?? 0), 0);

    // Select the tab from the ?category= URL param (e.g. the dashboard banner's
    // "Get a freeze" deep-links to ?category=powerUp). Adjusted during render — not
    // an effect — so it also applies when navigating to an already-mounted shop.
    const requestedCategory = searchParams.get('category');
    if (requestedCategory !== syncedCategoryParam) {
        setSyncedCategoryParam(requestedCategory);
        if (requestedCategory && ITEM_CATEGORIES.some((category) => category.value === requestedCategory)) {
            setActiveCategory(requestedCategory);
        }
    }

    // Power-ups are consumables shown via their own card (StreakFreezeCard), not
    // the wearable grid — keep them out.
    const filteredItems = useMemo(
        () => {
            const wearableItems = items.filter((item) => item.type !== 'powerUp');
            return activeCategory === 'all'
                ? wearableItems
                : wearableItems.filter((item) => itemMatchesCategory(item, activeCategory));
        },
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

    function addSelectedItem(currentItems, item) {
        if (SINGLE_EQUIP_ITEM_TYPES.has(item.type)) {
            return [
                ...currentItems.filter((currentItem) => currentItem.type !== item.type),
                item,
            ];
        }

        return [...currentItems, item];
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
                    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl shadow-slate-950/20">
                        <div className="h-[34rem] max-h-[34rem] overflow-y-scroll pr-2 [scrollbar-gutter:stable]">
                            {!isLoading && !error && items.length > 0 && filteredItems.length === 0 && activeCategory !== 'powerUp' ? (
                                <div className="flex h-full items-center justify-center text-center">
                                    <p className="text-sm text-slate-300">No items in this category yet</p>
                                </div>
                            ) : null}

                            {filteredItems.length > 0 || activeCategory === 'all' || activeCategory === 'powerUp' ? (
                                <CardGrid columns={3} className="pb-8">
                                    {activeCategory === 'all' || activeCategory === 'powerUp' ? (
                                        <StreakFreezeCard key="streak-freeze" />
                                    ) : null}
                                    {filteredItems.map((item) => {
                                        const customizationConfig = getCustomizationConfig(item.assetKey);
                                        const itemCustomization = getItemCustomization(item);
                                        const activeColorSlot = activeColorSlots[item.assetKey] ?? customizationConfig?.colorSlots[0]?.key;

                                        return (
                                        <div key={item._id} data-shop-item-id={item._id}>
                                            <ItemCard
                                                name={getItemDisplayName(item)}
                                                price={item.price}
                                                premiumOnly={item.premiumOnly}
                                                owned={isItemOwned(item)}
                                                equipped={isItemPreviewed(item._id)}
                                                showOwnedBadge={false}
                                                dense
                                                interactive
                                                onClick={() => handleTryOnItem(item._id)}
                                                titleAction={customizationConfig ? (
                                                    <div className="flex items-center gap-1">
                                                        <ItemColorPicker
                                                            colors={itemCustomization}
                                                            colorSlots={customizationConfig.colorSlots}
                                                            activeSlot={activeColorSlot}
                                                            itemName={getItemDisplayName(item)}
                                                            addToCartLabel={
                                                                isItemOwned(item)
                                                                    ? 'Owned'
                                                                    : isCurrentItemInCart(item)
                                                                        ? 'In cart'
                                                                        : 'Add to cart'
                                                            }
                                                            isAddToCartDisabled={isItemOwned(item) || isCurrentItemInCart(item)}
                                                            onSlotChange={(slot) => setActiveColorSlots((currentSlots) => ({
                                                                ...currentSlots,
                                                                [item.assetKey]: slot,
                                                            }))}
                                                            onColorChange={(slot, color) => handleItemColorChange(item.assetKey, slot, color)}
                                                            onAddToCart={() => handleAddCurrentItemToCart(item)}
                                                        />
                                                        {customizationConfig.text ? (
                                                            <ItemTextEditor
                                                                value={itemCustomization[customizationConfig.text.key] ?? ''}
                                                                label={customizationConfig.text.label}
                                                                placeholder={customizationConfig.text.placeholder}
                                                                onChange={(text) => handleItemTextChange(item.assetKey, customizationConfig.text.key, text)}
                                                            />
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                                visual={renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]', getItemCustomization(item))}
                                            >
                                                <ActionButton
                                                    type="button"
                                                    fullWidth
                                                    className="h-8 px-3 text-xs"
                                                    disabled={isItemOwned(item) || isCurrentItemInCart(item)}
                                                    onClick={() => handleAddCurrentItemToCart(item)}
                                                >
                                                    {isItemOwned(item) ? 'Owned' : isCurrentItemInCart(item) ? 'In cart' : 'Add to cart'}
                                                </ActionButton>
                                                <ActionButton
                                                    type="button"
                                                    fullWidth
                                                    className="h-8 px-3 text-xs"
                                                    disabled={isItemOwned(item) || buyingItemId === item._id}
                                                    onClick={() => openBuyConfirmation([createPurchaseEntry(item)])}
                                                >
                                                    {isItemOwned(item) ? 'Owned' : 'Buy'}
                                                </ActionButton>
                                            </ItemCard>
                                        </div>
                                        );
                                    })}
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
                            {cartItems.map((entry) => {
                                const item = getPurchaseEntryItem(entry);
                                const customization = getPurchaseEntryCustomization(entry);
                                const isOwned = isPurchaseEntryOwned(entry);

                                return (
                                    <div
                                        key={entry.cartKey}
                                        className="flex items-center gap-3 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10"
                                    >
                                        <div className="flex h-16 w-20 shrink-0 items-center justify-center">
                                            {renderShopItemVisual(item, 'max-h-full max-w-full', customization)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold">{getItemDisplayName(item)}</p>
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
                                            aria-label={`Remove ${getItemDisplayName(item)} from cart`}
                                            onClick={() => handleRemoveCartEntry(entry.cartKey)}
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
                                Buy {itemsToBuy.length === 1 ? getItemDisplayName(getPurchaseEntryItem(itemsToBuy[0])) : `${itemsToBuy.length} items`}?
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

import { useEffect, useMemo, useState } from 'react';
import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { CompanionAvatar } from '@/components/brand';
import { renderShopItemVisual } from '@/components/brand/items/itemRegistry';
import { Page, PageSection, Heading } from '@/components/layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/authContext';
import { buyItem, getMyInventory } from '@/services/inventoryApi';
import { getItems } from '@/services/itemApi';

const shopCategories = [
    { label: 'All', value: 'all' },
    { label: 'Clothing', value: 'clothing' },
    { label: 'Shoes', value: 'shoes' },
    { label: 'Accessories', value: 'accessory' },
    { label: 'Power Ups', value: 'powerUp' },
];

export function ShopPage() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [ownedItemIds, setOwnedItemIds] = useState(new Set());
    const [previewItems, setPreviewItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState(null);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

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

    const filteredItems = useMemo(
        () => activeCategory === 'all'
            ? items
            : items.filter((item) => item.type === activeCategory),
        [activeCategory, items],
    );

    function isItemPreviewed(itemId) {
        return previewItems.some((item) => item._id === itemId);
    }

    function handleTryOnItem(itemId) {
        const item = items.find((shopItem) => shopItem._id === itemId);

        if (!item) {
            return;
        }

        setNotice('');
        setError('');
        setPreviewItems((currentPreviewItems) => {
            const isAlreadyPreviewed = currentPreviewItems.some((previewItem) => previewItem._id === item._id);

            if (isAlreadyPreviewed) {
                return currentPreviewItems.filter((previewItem) => previewItem._id !== item._id);
            }

            if (item.type === 'clothing' || item.type === 'shoes') {
                return [
                    ...currentPreviewItems.filter((previewItem) => previewItem.type !== item.type),
                    item,
                ];
            }

            return [...currentPreviewItems, item];
        });
    }

    async function handleBuyItem(item) {
        setBuyingItemId(item._id);
        setNotice('');
        setError('');

        try {
            await buyItem(item._id);
            setOwnedItemIds((currentOwnedItemIds) => {
                const nextOwnedItemIds = new Set(currentOwnedItemIds);
                nextOwnedItemIds.add(item._id);
                return nextOwnedItemIds;
            });
            setNotice(`${item.name} is now in your inventory`);
        } catch (buyError) {
            if (buyError.code === 'ITEM_ALREADY_OWNED') {
                setError(`${item.name} is already in your inventory`);
            } else if (buyError.code === 'PREMIUM_REQUIRED') {
                setError(`${item.name} is premium only`);
            } else if (buyError.code === 'NOT_ENOUGH_COINS') {
                setError(`You do not have enough moon coins for ${item.name}`);
            } else {
                setError('Buying this item did not work');
            }
        } finally {
            setBuyingItemId(null);
        }
    }

    return (
        <Page theme="forest" className="h-screen overflow-hidden">
            <Heading title="Shop" subtitle="Unlock items for your companion." streakDays={user?.streak ?? 0} />
            <section className="sticky top-24 z-20 flex min-h-72 flex-col items-center justify-end gap-3 text-center">
                <CompanionAvatar
                    name="Howly"
                    size="xl"
                    showName
                    previewItemKeys={previewItemKeys}
                />
            </section>

            <PageSection title="Shop Items" className="min-w-0">
                <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                    <TabsList className="h-auto flex-wrap border border-white/10 bg-white/10 p-1 text-slate-300">
                        {shopCategories.map((category) => (
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

                {isLoading ? <p className="text-sm text-slate-300">Loading shop items...</p> : null}
                {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                {!isLoading && !error && items.length === 0 ? (
                    <p className="text-sm text-slate-300">No shop items yet</p>
                ) : null}
                {!isLoading && !error && items.length > 0 && filteredItems.length === 0 ? (
                    <p className="text-sm text-slate-300">No items in this category yet</p>
                ) : null}

                <div className="relative rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl shadow-slate-950/20">
                    <div className="max-h-[25rem] overflow-y-scroll pr-2 [scrollbar-gutter:stable]">
                        <CardGrid columns={3} className="pb-8">
                            {filteredItems.map((item) => (
                                <ItemCard
                                    key={item._id}
                                    name={item.name}
                                    price={item.price}
                                    premiumOnly={item.premiumOnly}
                                    owned={ownedItemIds.has(item._id)}
                                    visual={renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]')}
                                >
                                    <ActionButton
                                        type="button"
                                        fullWidth
                                        className="h-9 px-3 text-sm"
                                        onClick={() => handleTryOnItem(item._id)}
                                    >
                                        {isItemPreviewed(item._id) ? 'Remove' : 'Try on'}
                                    </ActionButton>
                                    <ActionButton
                                        type="button"
                                        fullWidth
                                        className="h-9 px-3 text-sm"
                                        disabled={ownedItemIds.has(item._id) || buyingItemId === item._id}
                                        onClick={() => handleBuyItem(item)}
                                    >
                                        {ownedItemIds.has(item._id) ? 'Owned' : 'Buy'}
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

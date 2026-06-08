import { useEffect, useMemo, useState } from 'react';
import { ActionButton, ActionStack, CardGrid } from '@/components/common';
import { ShopItemCard } from '@/components/cards';
import { CompanionAvatar } from '@/components/brand';
import { Hoodie, HoodieNew } from '@/components/brand/items';
import { Page, PageSection, Heading } from '@/components/layout';
import { useAuth } from '@/context/authContext';
import { buyItem, getMyInventory } from '@/services/inventoryApi';
import { getItems } from '@/services/itemApi';

const itemVisuals = {
    hoodie: Hoodie,
    cozyHoodie: Hoodie,
    'cozy-hoodie': Hoodie,
    pullover_01: Hoodie,
    hoodieNew: HoodieNew,
    'hoodie-new': HoodieNew,
    pullover_02: HoodieNew,
};

const typeLabels = {
    accessory: 'Accessory',
    powerUp: 'Power-up',
    clothing: 'Clothing',
    skin: 'Skin',
    streakShield: 'Streak shield',
};

function getItemTypeLabel(type) {
    return typeLabels[type] ?? type;
}

function renderItemVisual(item, className = 'max-h-full max-w-full') {
    const Visual = itemVisuals[item.assetKey?.trim()];

    return Visual ? <Visual className={className} aria-hidden="true" /> : null;
}

export function ShopPage() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [ownedItemIds, setOwnedItemIds] = useState(new Set());
    const [previewItemId, setPreviewItemId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState(null);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

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

    const previewItem = useMemo(
        () => items.find((item) => item._id === previewItemId),
        [items, previewItemId],
    );

    function handleTryOnItem(itemId) {
        setNotice('');
        setError('');
        setPreviewItemId(itemId);
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
        <Page theme="forest">
            <Heading title="Shop" subtitle="Unlock items for your companion." streakDays={user?.streak ?? 0} />
            <section className="flex min-h-72 flex-col items-center justify-end gap-3 text-center">
                <CompanionAvatar
                    name="Howly"
                    size="xl"
                    showName
                    previewItemKey={previewItem?.assetKey}
                />
            </section>

            <PageSection title="Accessories">
                {isLoading ? <p className="text-sm text-slate-300">Loading shop items...</p> : null}
                {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                {!isLoading && !error && items.length === 0 ? (
                    <p className="text-sm text-slate-300">No shop items yet</p>
                ) : null}

                <CardGrid columns={3}>
                    {items.map((item) => (
                        <ActionStack key={item._id}>
                            <ShopItemCard
                                name={item.name}
                                category={getItemTypeLabel(item.type)}
                                price={item.price}
                                premiumOnly={item.premiumOnly}
                                owned={ownedItemIds.has(item._id)}
                                visual={renderItemVisual(item)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <ActionButton
                                    type="button"
                                    fullWidth
                                    onClick={() => handleTryOnItem(item._id)}
                                >
                                    Try on
                                </ActionButton>
                                <ActionButton
                                    type="button"
                                    fullWidth
                                    disabled={ownedItemIds.has(item._id) || buyingItemId === item._id}
                                    onClick={() => handleBuyItem(item)}
                                >
                                    {ownedItemIds.has(item._id) ? 'Owned' : 'Buy'}
                                </ActionButton>
                            </div>
                        </ActionStack>
                    ))}
                </CardGrid>
            </PageSection>
        </Page>
    );
}

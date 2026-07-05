import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { getItemDisplayName, renderShopItemVisual } from '@/components/brand/items/itemRegistry';
import { ThemeItemVisual } from '@/components/common/ThemeItemVisual.jsx';

export function ShopItemGrid({
    isLoading,
    error,
    items,
    filteredItems,
    getItemCustomization,
    onAddCurrentItemToCart,
    isItemOwned,
    isCurrentItemInCart,
    isItemPreviewed,
    onTryOnItem,
    openBuyConfirmation,
    createPurchaseEntry,
    buyingItemId,
    leadingCard = null,
    isFreeUser,
    onPremiumRequired,
}) {
    function handleAddToCart(item) {
        if (isFreeUser && item.premiumOnly) {
            onPremiumRequired?.();
            return;
        }
        onAddCurrentItemToCart(item);
    }

    function handleBuy(item) {
        if (isFreeUser && item.premiumOnly) {
            onPremiumRequired?.();
            return;
        }
        openBuyConfirmation([createPurchaseEntry(item)]);
    }

    return (
        <div className="relative rounded-2xl border border-theme-text/10 bg-theme-text/5 p-3 shadow-xl shadow-slate-950/20">
            <div className="h-[34rem] max-h-[34rem] overflow-y-scroll pr-2 [scrollbar-gutter:stable]">
                {!isLoading && !error && items.length > 0 && filteredItems.length === 0 && !leadingCard ? (
                    <div className="flex h-full items-center justify-center text-center">
                        <p className="text-sm text-theme-text-soft">No items in this category yet</p>
                    </div>
                ) : null}

                {filteredItems.length > 0 || leadingCard ? (
                    <CardGrid columns={3} className="pb-8">
                        {leadingCard}
                        {filteredItems.map((item) => {
                            return (
                                <div key={item._id} className="h-full" data-shop-item-id={item._id}>
                                    <ItemCard
                                        name={getItemDisplayName(item)}
                                        price={item.price}
                                        premiumOnly={item.premiumOnly}
                                        owned={isItemOwned(item)}
                                        equipped={isItemPreviewed(item._id)}
                                        showOwnedBadge={false}
                                        reserveBadgeSpace
                                        className="h-full"
                                        dense
                                        interactive
                                        onClick={item.type === 'theme' ? undefined : () => onTryOnItem(item._id)}
                                        visual={item.type === 'theme'
                                            ? <ThemeItemVisual item={item} />
                                            : renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]', getItemCustomization(item))}
                                    >
                                        <ActionButton
                                            type="button"
                                            fullWidth
                                            className="h-8 px-3 text-xs"
                                            disabled={isItemOwned(item) || isCurrentItemInCart(item)}
                                            onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                                        >
                                            {isItemOwned(item) ? 'Owned' : isCurrentItemInCart(item) ? 'In cart' : 'Add to cart'}
                                        </ActionButton>
                                        <ActionButton
                                            type="button"
                                            fullWidth
                                            className="h-8 px-3 text-xs"
                                            disabled={isItemOwned(item) || buyingItemId === item._id}
                                            onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
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
    );
}

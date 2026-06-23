import { ActionButton, CardGrid } from '@/components/common';
import { ItemCard } from '@/components/cards';
import { getItemDisplayName, renderShopItemVisual } from '@/components/brand/items/itemRegistry';

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
}) {
    return (
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl shadow-slate-950/20">
            <div className="h-[34rem] max-h-[34rem] overflow-y-scroll pr-2 [scrollbar-gutter:stable]">
                {!isLoading && !error && items.length > 0 && filteredItems.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center">
                        <p className="text-sm text-slate-300">No items in this category yet</p>
                    </div>
                ) : null}

                {filteredItems.length > 0 ? (
                    <CardGrid columns={3} className="pb-8">
                        {filteredItems.map((item) => {
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
                                        onClick={() => onTryOnItem(item._id)}
                                        visual={renderShopItemVisual(item, 'max-h-[78%] max-w-[78%]', getItemCustomization(item))}
                                    >
                                        <ActionButton
                                            type="button"
                                            fullWidth
                                            className="h-8 px-3 text-xs"
                                            disabled={isItemOwned(item) || isCurrentItemInCart(item)}
                                            onClick={() => onAddCurrentItemToCart(item)}
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
    );
}

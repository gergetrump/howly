import { Minus, Plus } from 'lucide-react';
import { ActionButton } from '@/components/common';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { getItemDisplayName, renderShopItemVisual } from '@/components/brand/items/itemRegistry';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function CartDialog({
    isOpen,
    onOpenChange,
    cartItems,
    cartItemsToBuy,
    cartTotalPrice,
    getPurchaseEntryItem,
    getPurchaseEntryCustomization,
    getPurchaseEntryQuantity,
    isStackablePurchaseEntry,
    isCartEntryAtQuantityLimit,
    isPurchaseEntryOwned,
    onRemoveCartEntry,
    onIncreaseCartEntry,
    onDecreaseCartEntry,
    onOpenBuyConfirmation,
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="border-theme-text/10 bg-theme-surface p-0 text-theme-text shadow-2xl sm:max-w-lg">
                <div className="p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Cart</DialogTitle>
                        <DialogDescription className="text-theme-text-soft">
                            Items ready to buy
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-5 max-h-80 space-y-3 overflow-y-auto pr-1">
                        {cartItems.length === 0 ? (
                            <div className="rounded-2xl bg-theme-text/5 p-5 text-center text-sm text-theme-text-soft ring-1 ring-theme-text/10">
                                Your cart is empty
                            </div>
                        ) : null}
                        {cartItems.map((entry) => {
                            const item = getPurchaseEntryItem(entry);
                            const customization = getPurchaseEntryCustomization(entry);
                            const quantity = getPurchaseEntryQuantity(entry);
                            const isStackable = isStackablePurchaseEntry(entry);
                            const isAtQuantityLimit = isCartEntryAtQuantityLimit?.(entry) ?? false;
                            const isOwned = isPurchaseEntryOwned(entry);

                            return (
                                <div
                                    key={entry.cartKey}
                                    className="flex items-center gap-3 rounded-2xl bg-theme-text/5 p-3 ring-1 ring-theme-text/10"
                                >
                                    <div className="flex h-16 w-20 shrink-0 items-center justify-center">
                                        {renderShopItemVisual(item, 'max-h-full max-w-full', customization)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{getItemDisplayName(item)}</p>
                                        {isOwned ? (
                                            <p className="text-sm text-theme-text-soft">Already owned</p>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <MoonCoin amount={item.price * quantity} compact />
                                                {quantity > 1 ? (
                                                    <span className="rounded-full bg-theme-text/10 px-2 py-0.5 text-xs font-semibold text-theme-text">
                                                        {quantity}x
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                    {isStackable ? (
                                        <div className="flex shrink-0 items-center gap-1 rounded-full bg-theme-text/5 p-1">
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-full text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text"
                                                aria-label={`Reduce ${getItemDisplayName(item)} quantity`}
                                                onClick={() => onDecreaseCartEntry(entry.cartKey)}
                                            >
                                                <Minus className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                            <span className="min-w-5 text-center text-sm font-bold text-theme-text">{quantity}</span>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-full text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text disabled:text-slate-600"
                                                aria-label={isAtQuantityLimit ? `${getItemDisplayName(item)} cart quantity is at maximum` : `Increase ${getItemDisplayName(item)} quantity`}
                                                disabled={isAtQuantityLimit}
                                                onClick={() => onIncreaseCartEntry(entry.cartKey)}
                                            >
                                                <Plus className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="rounded-full text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text"
                                            aria-label={`Remove ${getItemDisplayName(item)} from cart`}
                                            onClick={() => onRemoveCartEntry(entry.cartKey)}
                                        >
                                            <Minus className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-theme-text/10 pt-4">
                        <div>
                            <p className="text-sm text-theme-text-soft">Total</p>
                            <MoonCoin amount={cartTotalPrice} />
                        </div>
                        <ActionButton
                            type="button"
                            className="h-11 bg-violet-500 px-5 text-white hover:bg-violet-400 disabled:bg-theme-text/10 disabled:text-theme-text-muted"
                            disabled={cartItemsToBuy.length === 0}
                            onClick={() => onOpenBuyConfirmation(cartItems)}
                        >
                            Buy
                        </ActionButton>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

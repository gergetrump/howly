import { X } from 'lucide-react';
import { getItemDisplayName } from '@/components/brand/items/itemRegistry';
import { MoonCoinIcon } from '@/components/brand/MoonCoin.jsx';
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

export function PurchaseConfirmationDialog({
    itemsToBuy,
    confirmationTotalPrice,
    buyingItemId,
    onOpenChange,
    onBuyItems,
    getPurchaseEntryItem,
    getPurchaseEntryQuantity,
}) {
    const itemCount = itemsToBuy.reduce((total, entry) => total + getPurchaseEntryQuantity(entry), 0);

    return (
        <ConfirmationDialog open={itemsToBuy.length > 0} onOpenChange={onOpenChange}>
            <ConfirmationDialogContent className="overflow-hidden p-0">
                <div className="relative px-8 pb-8 pt-18">
                    <ConfirmationDialogCancel
                        size="icon"
                        variant="ghost"
                        className="absolute right-5 top-5 h-10 w-10 rounded-full bg-theme-text/10 text-theme-text hover:bg-theme-text/20 hover:text-theme-text"
                        aria-label="Close purchase confirmation"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </ConfirmationDialogCancel>

                    <ConfirmationDialogHeader className="space-y-0 text-center">
                        <ConfirmationDialogTitle className="mx-auto max-w-sm text-xl font-bold leading-tight">
                            Buy {itemCount === 1 ? getItemDisplayName(getPurchaseEntryItem(itemsToBuy[0])) : `${itemCount} items`}?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="sr-only">
                            Confirm that these items should be added to your inventory.
                        </ConfirmationDialogDescription>
                    </ConfirmationDialogHeader>

                    <ConfirmationDialogFooter className="mt-5 block">
                        <ConfirmationDialogAction
                            className="h-10 w-full rounded-xl bg-theme-accent text-sm font-semibold text-theme-on-accent shadow-lg shadow-black/30 hover:bg-theme-accent-strong disabled:bg-theme-accent/60"
                            disabled={itemsToBuy.length === 0 || buyingItemId === 'cart'}
                            onClick={() => onBuyItems(itemsToBuy)}
                        >
                            {buyingItemId === 'cart' ? 'Buying...' : (
                                <span className="inline-flex items-center justify-center gap-1.5">
                                    Buy {confirmationTotalPrice}
                                    <MoonCoinIcon className="size-5" />
                                </span>
                            )}
                        </ConfirmationDialogAction>
                    </ConfirmationDialogFooter>
                </div>
            </ConfirmationDialogContent>
        </ConfirmationDialog>
    );
}

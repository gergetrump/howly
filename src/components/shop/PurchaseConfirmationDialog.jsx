import { X } from 'lucide-react';
import { getItemDisplayName } from '@/components/brand/items/itemRegistry';
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
}) {
    return (
        <ConfirmationDialog open={itemsToBuy.length > 0} onOpenChange={onOpenChange}>
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
                            onClick={() => onBuyItems(itemsToBuy)}
                        >
                            {buyingItemId === 'cart' ? 'Buying...' : `Buy ${confirmationTotalPrice} 🌙`}
                        </ConfirmationDialogAction>
                    </ConfirmationDialogFooter>
                </div>
            </ConfirmationDialogContent>
        </ConfirmationDialog>
    );
}

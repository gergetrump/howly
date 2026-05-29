import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MoonCoin({ amount, compact = false, className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-yellow-200/20 bg-yellow-200/10 px-3 py-1 text-sm font-semibold text-yellow-100',
                compact && 'px-2 py-0.5 text-xs',
                className,
            )}
        >
            <Coins className="size-4 text-yellow-100" aria-hidden="true" />
            {amount}
        </span>
    );
}

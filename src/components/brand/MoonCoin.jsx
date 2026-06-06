import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MoonCoin({ amount, compact = false, className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-400',
                compact && 'px-2 py-0.5 text-xs',
                className,
            )}
        >
            <span aria-hidden="true" className="text-sm">🌙</span>
            <span className="!text-yellow-400">{amount}</span>
        </span>
    );
}

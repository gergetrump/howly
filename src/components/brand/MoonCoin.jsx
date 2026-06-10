import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MoonCoin({ amount, compact = false, className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-theme-gold/20 bg-theme-gold/10 px-3 py-1 text-sm font-bold text-theme-gold',
                compact && 'px-2 py-0.5 text-xs',
                className,
            )}
        >
            <span aria-hidden="true" className="text-sm">🌙</span>
            <span className="!text-theme-gold">{amount}</span>
        </span>
    );
}

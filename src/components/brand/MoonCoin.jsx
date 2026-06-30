import { cn } from '@/lib/utils';

function MoonCoinIcon({ compact = false }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={cn('shrink-0 drop-shadow-sm', compact ? 'size-7' : 'size-8')}
        >
            <circle cx="12" cy="12" r="11" fill="#92400e" />
            <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#fde68a" strokeWidth="1.3" />
            <circle cx="12" cy="12" r="7.8" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
            <path
                d="M12 2.7v2M12 19.3v2M2.7 12h2M19.3 12h2M5.4 5.4l1.35 1.35M17.25 17.25l1.35 1.35M18.6 5.4l-1.35 1.35M6.75 17.25 5.4 18.6"
                stroke="#fde68a"
                strokeWidth="0.7"
                strokeLinecap="round"
                opacity="0.85"
            />
            <path
                d="M6.9 7.4c1.1-1.25 2.8-2 5.1-2 2.15 0 3.8.68 4.95 1.85"
                fill="none"
                stroke="#fff7cc"
                strokeWidth="0.9"
                strokeLinecap="round"
                opacity="0.7"
            />
            <path
                d="M17.1 16.7c-1.15 1.2-2.85 1.9-5.1 1.9-2.15 0-3.8-.65-4.95-1.8"
                fill="none"
                stroke="#78350f"
                strokeWidth="0.9"
                strokeLinecap="round"
                opacity="0.35"
            />
            <circle cx="12" cy="12" r="6.05" fill="#d97706" opacity="0.28" />
            <path
                d="M16.15 17.55c-4.05.65-7.75-2.45-7.75-6.75 0-3.15 2.05-5.85 5-6.65-1.2 1.25-1.9 2.95-1.9 4.8 0 3.75 2.75 6.9 6.35 7.5-.5.52-1.08.9-1.7 1.1Z"
                fill="#fff7cc"
                stroke="#78350f"
                strokeWidth="0.75"
                strokeLinejoin="round"
            />
            <path
                d="M12.25 5.7c-.72 1.1-1.08 2.4-1.08 3.8 0 3.2 1.98 5.95 4.75 7"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.75"
                strokeLinecap="round"
                opacity="0.55"
            />
        </svg>
    );
}

export function MoonCoin({ amount, compact = false, className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-400',
                compact && 'px-2 py-0.5 text-xs',
                className,
            )}
        >
            <MoonCoinIcon compact={compact} />
            <span className="!text-yellow-400">{amount}</span>
        </span>
    );
}
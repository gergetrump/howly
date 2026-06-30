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
            <circle cx="12" cy="12" r="5.9" fill="#d97706" opacity="0.22" />
            <path
                d="M15.65 16.65c-.9.48-1.92.72-3.05.72-3.08 0-5.58-2.42-5.58-5.4 0-2.88 2.32-5.28 5.25-5.42-.72.95-1.08 2.08-1.08 3.35 0 3.05 2.48 5.52 5.58 5.52-.32.48-.68.88-1.12 1.23Z"
                fill="#fff7cc"
                stroke="#78350f"
                strokeWidth="0.8"
                strokeLinejoin="round"
            />
            <path
                d="M10.85 7.85c-1.22.85-2 2.33-2 4.02 0 2.03 1.12 3.78 2.78 4.55"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.58"
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
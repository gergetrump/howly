import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

export function ItemCard({
    name,
    price,
    imageSrc,
    visual,
    premiumOnly = false,
    owned = false,
    equipped = false,
    showPrice = true,
    showOwnedBadge = true,
    compact = false,
    dense = false,
    interactive = false,
    disabled = false,
    reserveBadgeSpace = false,
    className,
    cornerBadge,
    titleAction,
    children,
    onClick,
}) {
    const hasBadges = premiumOnly || (showOwnedBadge && owned);
    const hasTitleMeta = hasBadges || titleAction || reserveBadgeSpace;

    function handleKeyDown(event) {
        if (!interactive || disabled || !onClick) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick(event);
        }
    }

    function stopCardClick(event) {
        if (interactive) {
            event.stopPropagation();
        }
    }

    return (
        <Card
            className={cn(
                appCardClassName,
                'relative gap-0 py-0',
                interactive && 'cursor-pointer transition hover:border-violet-300/40 hover:ring-violet-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70',
                equipped && 'border-violet-300/90 ring-2 ring-inset ring-violet-300/45 shadow-lg shadow-violet-950/25',
                disabled && 'cursor-wait opacity-80',
                className,
            )}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive && !disabled ? 0 : undefined}
            aria-pressed={interactive ? equipped : undefined}
            aria-disabled={interactive && disabled ? true : undefined}
            onClick={interactive && !disabled ? onClick : undefined}
            onKeyDown={handleKeyDown}
        >
            {cornerBadge ? (
                <div className="absolute left-3 top-3 z-10" onClick={stopCardClick}>
                    {cornerBadge}
                </div>
            ) : null}
            <CardContent className={cn('space-y-2', compact || dense ? 'p-3' : 'p-4')}>
                <div className={cn(
                    'mx-auto flex w-full items-center justify-center rounded-xl',
                    compact ? 'h-16 sm:h-20' : 'h-24 sm:h-28',
                    dense && 'h-20 sm:h-24',
                )}>
                    {visual ? (
                        visual
                    ) : imageSrc ? (
                        <img src={imageSrc} alt={name} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="text-sm text-slate-400">Item image</span>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex min-h-7 items-center justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold">{name}</h3>
                        </div>
                        {hasTitleMeta ? (
                            <div className="flex shrink-0 items-center gap-1.5" onClick={stopCardClick}>
                                {premiumOnly ? <Badge className="shrink-0 bg-amber-300 text-slate-950">Premium</Badge> : null}
                                {showOwnedBadge && owned ? <Badge className="shrink-0 bg-emerald-400 text-slate-950">Owned</Badge> : null}
                                {reserveBadgeSpace && !hasBadges ? (
                                    <Badge className="invisible shrink-0 bg-amber-300 text-slate-950">Premium</Badge>
                                ) : null}
                                {titleAction}
                            </div>
                        ) : null}
                    </div>
                    {showPrice || children ? (
                        <div className="flex items-center justify-between gap-3">
                            {showPrice ? <MoonCoin amount={price} compact /> : <span />}
                            {children ? (
                                <div className="ml-auto grid w-full max-w-40 grid-cols-2 gap-2" onClick={stopCardClick}>
                                    {children}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}

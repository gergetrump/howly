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
    interactive = false,
    disabled = false,
    children,
    onClick,
}) {
    function handleKeyDown(event) {
        if (!interactive || disabled || !onClick) {
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick(event);
        }
    }

    return (
        <Card
            className={cn(
                appCardClassName,
                interactive && 'cursor-pointer transition hover:border-violet-300/40 hover:ring-violet-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70',
                equipped && 'border-violet-300/80 ring-4 ring-violet-300/55 shadow-violet-950/30',
                disabled && 'cursor-wait opacity-80',
            )}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive && !disabled ? 0 : undefined}
            aria-pressed={interactive ? equipped : undefined}
            aria-disabled={interactive && disabled ? true : undefined}
            onClick={interactive && !disabled ? onClick : undefined}
            onKeyDown={handleKeyDown}
        >
            <CardContent className="space-y-3 p-4">
                <div className="mx-auto flex h-28 w-full items-center justify-center rounded-xl sm:h-32">
                    {visual ? (
                        visual
                    ) : imageSrc ? (
                        <img src={imageSrc} alt={name} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="text-sm text-slate-400">Item image</span>
                    )}
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold">{name}</h3>
                    </div>
                    <MoonCoin amount={price} compact />
                    <div className="flex min-h-5 flex-wrap gap-1">
                        {premiumOnly ? <Badge className="bg-amber-300 text-slate-950">Premium</Badge> : null}
                        {owned ? <Badge className="bg-emerald-400 text-slate-950">Owned</Badge> : null}
                    </div>
                </div>
                {children ? <div className="ml-auto grid w-full max-w-40 grid-cols-2 gap-2 pt-1">{children}</div> : null}
            </CardContent>
        </Card>
    );
}

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { appCardClassName } from '@/components/cards/cardStyles';

export function ItemCard({
    name,
    price,
    imageSrc,
    visual,
    premiumOnly = false,
    owned = false,
    equipped = false,
    children,
}) {
    return (
        <Card className={appCardClassName}>
            <CardContent className="space-y-3 p-4">
                <div className="mx-auto flex h-28 w-full items-center justify-center rounded-xl sm:h-32">
                    {visual ? (
                        visual
                    ) : imageSrc ? (
                        <img src={imageSrc} alt={name} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="text-sm text-theme-text-muted">Item image</span>
                    )}
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold">{name}</h3>
                    </div>
                    <MoonCoin amount={price} compact />
                    {premiumOnly ? <Badge className="bg-amber-300 text-slate-950">Premium</Badge> : null}
                    {owned ? <Badge className="bg-theme-success text-theme-on-success">Owned</Badge> : null}
                    {equipped ? <Badge className="bg-violet-300 text-slate-950">Equipped</Badge> : null}
                </div>
                {children ? <div className="ml-auto grid w-full max-w-40 grid-cols-2 gap-2 pt-1">{children}</div> : null}
            </CardContent>
        </Card>
    );
}

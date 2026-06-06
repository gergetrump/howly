import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MoonCoin } from '@/components/brand/MoonCoin';
import { appCardClassName, appCardInsetClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

export function ShopItemCard({
    name,
    category,
    price,
    imageSrc,
    visual,
    premiumOnly = false,
    owned = false,
}) {
    return (
        <Card className={appCardClassName}>
            <CardContent className="space-y-4">
                <div className={cn('flex aspect-square items-center justify-center rounded-xl p-4', appCardInsetClassName)}>
                    {visual ? (
                        visual
                    ) : imageSrc ? (
                        <img src={imageSrc} alt={name} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="text-sm text-slate-400">Item image</span>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{name}</h3>
                        {category ? <Badge variant="secondary">{category}</Badge> : null}
                    </div>
                    <MoonCoin amount={price} compact />
                    {premiumOnly ? <Badge className="bg-amber-300 text-slate-950">Premium</Badge> : null}
                    {owned ? <Badge className="bg-emerald-400 text-slate-950">Owned</Badge> : null}
                </div>
            </CardContent>
        </Card>
    );
}

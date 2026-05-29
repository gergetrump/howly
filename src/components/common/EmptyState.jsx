import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
    return (
        <Card className="border border-dashed border-white/15 bg-white/[0.03] text-white">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                {Icon ? <Icon className="size-8 text-pink-200" aria-hidden="true" /> : null}
                <div>
                    <h3 className="font-semibold">{title}</h3>
                    {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
                </div>
                {actionLabel ? (
                    <Button type="button" onClick={onAction}>
                        {actionLabel}
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    );
}

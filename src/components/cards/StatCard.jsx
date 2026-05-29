import { Card, CardContent } from '@/components/ui/card';

export function StatCard({ label, value, description, icon: Icon }) {
    return (
        <Card className="bg-white/[0.04] text-white ring-white/10">
            <CardContent className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-300">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                    {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
                </div>
                {Icon ? (
                    <div className="rounded-xl bg-pink-500/15 p-3 text-pink-100">
                        <Icon className="size-5" aria-hidden="true" />
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}

import { Button } from '@/components/ui/button';

export function SectionHeader({ title, description, actionLabel, onAction }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
            </div>

            {actionLabel ? (
                <Button type="button" variant="outline" size="sm" onClick={onAction}>
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}

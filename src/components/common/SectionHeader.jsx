import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function SectionHeader({ title, description, actionLabel, onAction }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 className="text-lg font-semibold text-theme-text">{title}</h2>
                {description ? <p className="mt-1 text-sm text-theme-text-soft">{description}</p> : null}
            </div>

            {actionLabel ? (
                <Button 
                    type="button" 
                    onClick={onAction}
                    className="bg-theme-accent hover:bg-theme-accent-strong text-theme-on-accent border-0 shadow-lg shadow-theme-accent/20 px-5 py-5 text-sm font-semibold rounded-xl"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function SectionHeader({ title, description, actionLabel, onAction, titleAction }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    {titleAction}
                </div>
                {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
            </div>

            {actionLabel ? (
                <Button 
                    type="button" 
                    onClick={onAction}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-lg shadow-purple-500/20 px-5 py-5 text-sm font-semibold rounded-xl"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}

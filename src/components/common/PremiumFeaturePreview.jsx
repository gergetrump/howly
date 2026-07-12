import { useState } from 'react';
import { Crown } from 'lucide-react';
import { PremiumRequiredDialog } from '@/components/shop';

export function PremiumFeaturePreview({
    title,
    description,
    returnTo,
    children,
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(true);

    return (
        <div className="relative isolate overflow-hidden rounded-2xl">
            <div
                className="absolute inset-0 z-0 bg-theme-bg/65 backdrop-blur-md"
                aria-hidden="true"
            />

            <div className="relative z-10 pointer-events-none select-none opacity-60 blur-sm" aria-hidden="true">
                {children}
            </div>

            {!isDialogOpen ? (
                <div className="absolute inset-x-0 top-24 z-20 flex justify-center px-4">
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl border border-theme-gold/30 bg-theme-surface px-4 py-2.5 text-sm font-bold text-theme-gold shadow-xl shadow-theme-bg/30 transition hover:bg-theme-text/10"
                        onClick={() => setIsDialogOpen(true)}
                    >
                        <Crown className="size-4" aria-hidden="true" />
                        Unlock Premium
                    </button>
                </div>
            ) : null}

            <PremiumRequiredDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                title={title}
                description={description}
                returnTo={returnTo}
            />
        </div>
    );
}

import { Crown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PremiumRequiredDialog({ 
    isOpen, 
    onClose,
    title = "Only with premium plan",
    description = "This item is exclusive to premium members. Upgrade to unlock premium shop items and enjoy monthly bonus coins.",
    showIcon = true,
    showActions = true,
}) {
    const navigate = useNavigate();

    if (!isOpen) {
        return null;
    }

    function handleGoToPremium() {
        onClose();
        navigate('/premium', {
            state: {
                returnTo: '/shop',
            },
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-required-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-theme-bg/70 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog panel */}
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-theme-text/10 bg-theme-surface p-6 shadow-2xl shadow-slate-950/60">
                {/* Close button */}
                <button
                    type="button"
                    className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-theme-text-muted transition hover:bg-theme-text/10 hover:text-theme-text"
                    aria-label="Close dialog"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>

                {showIcon ? (
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30">
                        <Crown className="h-7 w-7 text-slate-900" aria-hidden="true" />
                    </div>
                ) : null}

                <h2
                    id="premium-required-title"
                    className="mb-2 text-lg font-bold text-theme-text"
                >
                    {title}
                </h2>
                <p className="mb-6 text-sm text-theme-text-soft">
                    {description}
                </p>

                {showActions ? (
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            id="premium-required-go-premium-btn"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:brightness-110 active:scale-95"
                            onClick={handleGoToPremium}
                        >
                            <Crown className="h-4 w-4" aria-hidden="true" />
                            Go to premium plan
                        </button>
                        <button
                            type="button"
                            className="w-full rounded-xl border border-theme-text/10 px-4 py-2.5 text-sm font-semibold text-theme-text-soft transition hover:bg-theme-text/10 hover:text-theme-text"
                            onClick={onClose}
                        >
                            Maybe later
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

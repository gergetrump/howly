import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const variantClasses = {
    success: 'border-emerald-300/30 bg-emerald-400/15 text-emerald-50',
    error: 'border-red-300/30 bg-red-400/15 text-red-50',
    info: 'border-sky-300/30 bg-sky-400/15 text-sky-50',
    milestone: 'border-white/10 bg-[#25243a] text-white',
};

export function NotificationBanner({
    variant = 'info',
    title,
    eyebrow,
    icon,
    children,
    onClose,
    autoCloseMs,
    className,
}) {
    const [isProgressRunning, setIsProgressRunning] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const animationFrame = requestAnimationFrame(() => setIsVisible(true));

        return () => cancelAnimationFrame(animationFrame);
    }, []);

    useEffect(() => {
        if (!autoCloseMs || !onClose) {
            return undefined;
        }

        const animationFrame = requestAnimationFrame(() => setIsProgressRunning(true));
        const timeout = setTimeout(onClose, autoCloseMs);

        return () => {
            cancelAnimationFrame(animationFrame);
            clearTimeout(timeout);
        };
    }, [autoCloseMs, onClose]);

    return (
        <div
            className={cn(
                'relative flex items-start gap-4 overflow-hidden rounded-xl border px-5 py-4 opacity-0 shadow-xl shadow-slate-950/30 backdrop-blur transition duration-300 ease-out',
                isVisible ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-2 scale-[0.98]',
                variant === 'milestone' && 'border-l-4 border-l-violet-400',
                variantClasses[variant] ?? variantClasses.info,
                className,
            )}
            role="status"
        >
            {icon ? (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-slate-950/40 text-2xl">
                    {icon}
                </div>
            ) : null}
            <div className="flex-1">
                {eyebrow ? (
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{eyebrow}</p>
                ) : null}
                {title ? <p className="mt-1 text-xl font-bold">{title}</p> : null}
                {children ? <p className="mt-1 text-sm opacity-90">{children}</p> : null}
            </div>
            {onClose ? (
                <button
                    type="button"
                    className="rounded-full p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    aria-label="Dismiss notification"
                    onClick={onClose}
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            ) : null}
            {autoCloseMs ? (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                    <div
                        className="h-full bg-violet-300"
                        style={{
                            width: isProgressRunning ? '0%' : '100%',
                            transition: isProgressRunning ? `width ${autoCloseMs}ms linear` : 'none',
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}

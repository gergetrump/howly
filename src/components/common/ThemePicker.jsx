import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/themeContext';

// Mini preview rectangle showing the general vibe of a theme
function ThemePreview({ preview }) {
    return (
        <div
            className="relative h-16 w-full overflow-hidden rounded-xl border border-black/10"
            style={{ backgroundColor: preview.bg }}
            aria-hidden="true"
        >
            {/* Card */}
            <div
                className="absolute left-2 top-2 h-7 w-2/3 rounded-md"
                style={{ backgroundColor: preview.card }}
            />
            {/* Accent pill */}
            <div
                className="absolute bottom-2 left-2 h-2.5 w-1/3 rounded-full"
                style={{ backgroundColor: preview.accent }}
            />
            {/* Completion dot */}
            <div
                className="absolute bottom-2 left-[45%] size-2.5 rounded-full"
                style={{ backgroundColor: preview.extra }}
            />
        </div>
    );
}

export function ThemePicker() {
    const { theme, setTheme, themes } = useTheme();

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {themes.map((option) => {
                const isActive = option.id === theme;

                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => setTheme(option.id)}
                        aria-pressed={isActive}
                        className={cn(
                            'rounded-2xl border-2 bg-theme-surface/80 p-4 text-left transition',
                            isActive
                                ? 'border-theme-accent shadow-lg shadow-theme-accent/20'
                                : 'border-transparent hover:border-theme-text/20',
                        )}
                    >
                        <ThemePreview preview={option.preview} />

                        <div className="mt-3 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-theme-text">
                                    <span className="mr-1.5">{option.emoji}</span>
                                    {option.name}
                                </p>
                                <p className="mt-0.5 text-xs text-theme-text-muted">
                                    {option.description}
                                </p>
                            </div>

                            {isActive ? (
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-theme-accent text-theme-on-accent">
                                    <Check className="size-4" aria-hidden="true" />
                                </span>
                            ) : null}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

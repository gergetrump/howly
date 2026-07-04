import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/themeContext';
import { getMyInventory } from '@/services/inventoryApi';

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
    const navigate = useNavigate();
    const { theme, setTheme, themes } = useTheme();
    const [ownedThemeKeys, setOwnedThemeKeys] = useState(new Set());

    useEffect(() => {
        let isCurrent = true;

        getMyInventory()
            .then((inventory) => {
                if (!isCurrent) return;
                const keys = new Set(
                    (inventory ?? [])
                        .map((entry) => entry?.item?.assetKey)
                        .filter((key) => typeof key === 'string' && key.startsWith('theme-')),
                );
                setOwnedThemeKeys(keys);
            })
            .catch((error) => {
                console.error('Failed to load owned themes:', error);
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {themes.map((option) => {
                const isActive = option.id === theme;
                const locked = option.premium && !ownedThemeKeys.has(option.assetKey);

                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => (locked ? navigate('/shop?category=theme') : setTheme(option.id))}
                        aria-pressed={isActive}
                        className={cn(
                            'relative rounded-2xl border-2 bg-theme-surface/80 p-4 text-left transition',
                            isActive
                                ? 'border-theme-accent shadow-lg shadow-theme-accent/20'
                                : 'border-transparent hover:border-theme-text/20',
                        )}
                    >
                        <div className={cn('relative', locked && 'opacity-60')}>
                            <ThemePreview preview={option.preview} />
                            {locked ? (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="flex size-8 items-center justify-center rounded-full bg-black/45 text-white">
                                        <Lock className="size-4" aria-hidden="true" />
                                    </span>
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-theme-text">
                                    <span className="mr-1.5">{option.emoji}</span>
                                    {option.name}
                                </p>
                                <p className="mt-0.5 text-xs text-theme-text-muted">
                                    {locked ? 'Premium — unlock in the shop' : option.description}
                                </p>
                            </div>

                            {isActive ? (
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-theme-accent text-theme-on-accent">
                                    <Check className="size-4" aria-hidden="true" />
                                </span>
                            ) : locked ? (
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-theme-text/10 text-theme-text-muted">
                                    <Lock className="size-3.5" aria-hidden="true" />
                                </span>
                            ) : null}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

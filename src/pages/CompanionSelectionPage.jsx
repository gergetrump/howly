import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Background } from '@/components/brand/background';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { CompanionAvatar } from '@/components/brand/CompanionAvatar';
import {
    COMPANIONS,
    DEFAULT_COMPANION_TYPE,
    getDefaultCompanionName,
} from '@/constants/companions';
import { selectCompanion } from '@/services/companionService';

const COMPANION_PERKS = [
    { icon: '✨', label: 'Celebrate your streaks' },
    { icon: '🎨', label: 'Unlock new customizations' },
    { icon: '❤️', label: 'Keep you motivated daily' },
];

export function CompanionSelectionPage() {
    const navigate = useNavigate();

    const [selectedType, setSelectedType] = useState(DEFAULT_COMPANION_TYPE);
    const [name, setName] = useState(getDefaultCompanionName(DEFAULT_COMPANION_TYPE));
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleSelectType(type) {
        setSelectedType(type);
        // Pre-fill the matching default name; the user can still edit it.
        setName(getDefaultCompanionName(type));
    }

    async function handleSubmit() {
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError('Please give your companion a name.');
            return;
        }

        setError('');
        setIsSubmitting(true);

        try {
            await selectCompanion({ type: selectedType, name: trimmedName });
            navigate('/onboarding/habits');
        } catch (err) {
            setError(err.message || 'Could not save your companion. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Background className="min-h-screen overflow-y-auto overflow-x-hidden">
            <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12 xs:px-6 md:px-12 lg:px-20">
                <Card
                    className={cn(
                        appCardClassName,
                        'w-full max-w-4xl border-theme-text/10 shadow-xl shadow-black/20',
                    )}
                >
                    <CardContent className="p-8 md:p-10">
                        {/* Full-width header */}
                        <div className="mb-8">
                            <p className="mb-1 text-center text-xs font-semibold uppercase tracking-[0.25em] text-howly-primary">
                                Step 1 of 2
                            </p>
                            <h1 className="text-left text-3xl font-bold tracking-tight text-theme-text">
                                Meet your companion
                            </h1>
                            <p className="mt-2 text-left text-sm leading-relaxed text-theme-text-muted">
                                Pick the buddy who will cheer you on.
                                <br />
                                You can rename it anytime.
                            </p>
                        </div>

                        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
                            {/* Companion preview */}
                            <div className="flex justify-center">
                                <CompanionAvatar type={selectedType} size="2xl" />
                            </div>

                            {/* Controls */}
                            <div>
                                <div className="grid grid-cols-3 gap-3">
                                    {COMPANIONS.map((companion) => (
                                        <button
                                            key={companion.type}
                                            type="button"
                                            onClick={() => handleSelectType(companion.type)}
                                            aria-pressed={selectedType === companion.type}
                                            className={cn(
                                                'flex flex-col items-center gap-1 rounded-2xl border p-2 transition-all',
                                                selectedType === companion.type
                                                    ? 'border-howly-primary bg-howly-primary/10 ring-2 ring-howly-primary/40'
                                                    : 'border-slate-600 bg-theme-surface-2/60 hover:border-slate-500',
                                            )}
                                        >
                                            <CompanionAvatar type={companion.type} size="sm" />
                                            <span className="text-xs font-medium text-theme-text">
                                                {companion.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-6 space-y-2 text-left">
                                    <label
                                        htmlFor="companion-name"
                                        className="text-sm font-medium text-theme-text"
                                    >
                                        Name your companion
                                    </label>
                                    <input
                                        id="companion-name"
                                        name="companion-name"
                                        type="text"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        maxLength={30}
                                        placeholder="Howly"
                                        className="w-full rounded-xl border border-theme-text/15 bg-theme-surface/70 px-4 py-3 text-sm text-theme-text placeholder:text-theme-text-muted outline-none transition-colors focus:border-howly-primary"
                                    />
                                </div>

                                <div className="mt-6 rounded-xl border border-theme-text/15 bg-theme-surface/70 p-4 text-left">
                                    <p className="mb-2 text-sm font-semibold text-theme-text">
                                        Your companion will:
                                    </p>
                                    <ul className="space-y-1.5">
                                        {COMPANION_PERKS.map((perk) => (
                                            <li
                                                key={perk.label}
                                                className="flex items-center gap-2 text-sm text-theme-text-soft"
                                            >
                                                <span aria-hidden="true">{perk.icon}</span>
                                                {perk.label}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {error && (
                                    <p className="mt-4 rounded-xl border border-red-400/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                                        {error}
                                    </p>
                                )}

                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="mt-6 h-12 w-full rounded-full bg-howly-primary text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmitting ? 'Saving...' : 'Continue'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </Background>
    );
}

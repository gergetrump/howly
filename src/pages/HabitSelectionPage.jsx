import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Background } from '@/components/brand/Background.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';
import { STARTER_HABITS, FREE_TIER_HABIT_LIMIT } from '@/constants/starterHabits';
import { createHabitsFromTemplates } from '@/services/habitService';
import { completeOnboarding } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

/* Habit selection (onboarding step 2): pick starter habits within the free limit, then finish onboarding. */
export function HabitSelectionPage() {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    const [selected, setSelected] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const atLimit = selected.length >= FREE_TIER_HABIT_LIMIT;

    /* Toggles a starter habit in the selection, capped at the free-tier limit. */
    function toggleHabit(id) {
        setSelected((previous) => {
            if (previous.includes(id)) {
                return previous.filter((value) => value !== id);
            }
            if (previous.length >= FREE_TIER_HABIT_LIMIT) {
                return previous;
            }
            return [...previous, id];
        });
    }

    // Mark onboarding done, refresh the user,
    // then enter the dashboard.
    async function finishOnboarding() {
        await completeOnboarding();
        await refreshUser();
        navigate('/dashboard');
    }

    /* Finishes onboarding without adding any starter habits. */
    async function handleSkip() {
        setError('');
        setIsSubmitting(true);
        try {
            await finishOnboarding();
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
            setIsSubmitting(false);
        }
    }

    /* Creates the selected starter habits from templates, then finishes onboarding. */
    async function handleAddHabits() {
        if (selected.length === 0) {
            return;
        }

        setError('');
        setIsSubmitting(true);
        try {
            const templates = STARTER_HABITS
                .filter((habit) => selected.includes(habit.id))
                .map((habit) => ({
                    title: habit.title,
                    icon: habit.icon,
                    frequency: habit.frequency,
                    templateKey: habit.id,
                }));

            await createHabitsFromTemplates(templates);
            await finishOnboarding();
        } catch (err) {
            setError(err.message || 'Could not add your habits. Please try again.');
            setIsSubmitting(false);
        }
    }

    return (
        <Background className="min-h-screen overflow-y-auto overflow-x-hidden">
            <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-12 xs:px-6 md:px-12 lg:px-20">
                <Card
                    className={cn(
                        appCardClassName,
                        'w-full max-w-lg border-theme-text/10 shadow-xl shadow-black/20',
                    )}
                >
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center text-center">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-howly-primary">
                                Step 2 of 2
                            </p>
                            <h1 className="text-2xl font-bold tracking-tight text-theme-text">
                                Pick your first habits
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-theme-text-muted">
                                Choose up to {FREE_TIER_HABIT_LIMIT} to get started. That is the
                                free plan limit. You can always add more later.
                            </p>
                            <p className="mt-2 text-xs font-medium text-howly-primary">
                                {selected.length} of {FREE_TIER_HABIT_LIMIT} selected
                            </p>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {STARTER_HABITS.map((habit) => {
                                const isSelected = selected.includes(habit.id);
                                const isDisabled = !isSelected && atLimit;

                                return (
                                    <button
                                        key={habit.id}
                                        type="button"
                                        onClick={() => toggleHabit(habit.id)}
                                        disabled={isDisabled}
                                        aria-pressed={isSelected}
                                        className={cn(
                                            'flex items-center gap-3 rounded-2xl border p-3 text-left transition-all',
                                            isSelected
                                                ? 'border-howly-primary bg-howly-primary/10 ring-2 ring-howly-primary/40'
                                                : 'border-theme-text/15 bg-theme-surface/50 hover:border-slate-500',
                                            isDisabled && 'cursor-not-allowed opacity-40 hover:border-theme-text/15',
                                        )}
                                    >
                                        <span className="text-2xl" aria-hidden="true">
                                            {habit.icon}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-theme-text">
                                                {habit.title}
                                            </span>
                                            <span className="block text-xs text-theme-text-muted">
                                                {habit.frequency}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {error && (
                            <p className="mt-4 rounded-xl border border-red-400/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                                {error}
                            </p>
                        )}

                        <div className="mt-6 flex items-center justify-between gap-3">
                            <Button
                                variant="ghost"
                                onClick={handleSkip}
                                disabled={isSubmitting}
                                className="text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text"
                            >
                                Skip for now
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleAddHabits}
                                disabled={isSubmitting || selected.length === 0}
                                className="h-12 px-8 text-base"
                            >
                                {isSubmitting
                                    ? 'Saving...'
                                    : `Add ${selected.length} habit${selected.length === 1 ? '' : 's'}`}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </Background>
    );
}

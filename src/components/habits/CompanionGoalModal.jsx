import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PremiumUpgradeDialog } from '@/components/common';
import { CompanionAvatar } from '@/components/brand';
import { useAuth } from '@/context/authContext';
import { suggestHabits, createHabitsFromTemplates } from '@/services/habitService';
import { STARTER_HABITS } from '@/constants/starterHabits';
import { getCompanionLines } from '@/constants/companionDialogue';
import { cn } from '@/lib/utils';

// Mirrors the backend plan limits (config/plans.js) so we can cap selection
// before hitting the server; the server stays the source of truth.
const FREE_MAX_HABITS = 2;
const PREMIUM_MAX_HABITS = 6;

function fallbackSuggestions() {
    return STARTER_HABITS.slice(0, 3).map((habit) => ({
        title: habit.title,
        icon: habit.icon,
        frequency: habit.frequency,
    }));
}

export function CompanionGoalModal({ open, onOpenChange, onHabitAdded, existingHabits = [] }) {
    const { user, companion } = useAuth();
    const companionName = companion?.name || 'Howly';
    const lines = getCompanionLines(companionName);

    const isPremium = user?.isPremium === true || user?.role === 'admin';
    const maxHabits = isPremium ? PREMIUM_MAX_HABITS : FREE_MAX_HABITS;
    const remaining = Math.max(0, maxHabits - existingHabits.length);

    const [phase, setPhase] = useState('input'); // input | thinking | results
    const [goal, setGoal] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selected, setSelected] = useState([]); // indices into suggestions
    const [usedFallback, setUsedFallback] = useState(false);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [premiumPrompt, setPremiumPrompt] = useState('');

    // Reset the flow each time the modal opens. Adjusting state during render
    // (guarded by a tracked value) is React's recommended alternative to an effect.
    const [trackedOpen, setTrackedOpen] = useState(open);
    if (open !== trackedOpen) {
        setTrackedOpen(open);
        if (open) {
            setPhase('input');
            setGoal('');
            setSuggestions([]);
            setSelected([]);
            setUsedFallback(false);
            setError('');
            setIsSaving(false);
        }
    }

    async function handleAsk(event) {
        event.preventDefault();
        if (!goal.trim()) return;

        setError('');
        setPhase('thinking');

        try {
            const response = await suggestHabits(goal.trim());
            const list = response?.data?.suggestions ?? [];

            if (list.length) {
                setSuggestions(list);
                setUsedFallback(false);
            } else {
                // AI worked but gave nothing usable — fall back so we never dead-end.
                setSuggestions(fallbackSuggestions());
                setUsedFallback(true);
            }
        } catch {
            // AI unavailable / rate-limited — fall back to classic starter habits.
            setSuggestions(fallbackSuggestions());
            setUsedFallback(true);
        }

        setSelected([]);
        setPhase('results');
    }

    function toggleSuggestion(index) {
        setSelected((previous) => {
            if (previous.includes(index)) {
                return previous.filter((value) => value !== index);
            }
            if (previous.length >= remaining) {
                return previous;
            }
            return [...previous, index];
        });
    }

    async function handleCreate() {
        if (!selected.length) return;

        setIsSaving(true);
        setError('');

        try {
            const templates = selected.map((index) => {
                const suggestion = suggestions[index];
                return {
                    title: suggestion.title,
                    icon: suggestion.icon,
                    frequency: suggestion.frequency,
                };
            });

            const response = await createHabitsFromTemplates(templates);
            (response?.data ?? []).forEach((habit) => onHabitAdded?.(habit, false));
            onOpenChange(false);
        } catch (err) {
            if (!isPremium && err.code === 'HABIT_LIMIT_REACHED') {
                setPremiumPrompt('You reached the free habit limit. Upgrade to Premium for up to 6 habits.');
            } else {
                setError(err.message || 'Could not add the habits. Please try again.');
            }
            setIsSaving(false);
        }
    }

    const atLimit = selected.length >= remaining;
    const bubble =
        phase === 'thinking'
            ? lines.thinking
            : phase === 'results'
                ? (usedFallback ? lines.fallback : lines.results)
                : lines.greeting;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md rounded-2xl border-0 bg-theme-surface p-8 text-theme-text shadow-2xl">
                    {/* Companion + speech bubble */}
                    <div className="flex flex-col items-center text-center">
                        <CompanionAvatar
                            type={companion?.type}
                            name={companionName}
                            size="lg"
                            showName={false}
                        />
                        <div className="relative mt-1 max-w-xs rounded-2xl bg-theme-surface-2/70 px-4 py-3 text-sm text-theme-accent-soft">
                            <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-theme-surface-2/70" />
                            <span className="relative">{bubble}</span>
                            {phase === 'thinking' && <ThinkingDots />}
                        </div>
                    </div>

                    {error && phase !== 'thinking' ? (
                        <p className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-2 text-center text-sm text-theme-danger">
                            {error}
                        </p>
                    ) : null}

                    {/* INPUT */}
                    {phase === 'input' && (
                        <form onSubmit={handleAsk} className="space-y-3">
                            <Input
                                value={goal}
                                onChange={(event) => setGoal(event.target.value)}
                                placeholder="e.g. sleep better, read more, get fit…"
                                maxLength={200}
                                autoFocus
                                className="h-12 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-theme-accent/20"
                            />
                            <Button
                                type="submit"
                                disabled={!goal.trim()}
                                className="h-12 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition-all hover:from-purple-700 hover:to-purple-600 disabled:opacity-50"
                            >
                                <Sparkles size={18} className="mr-2" />
                                Ask {companionName}
                            </Button>
                        </form>
                    )}

                    {/* RESULTS */}
                    {phase === 'results' && (
                        <div className="space-y-3">
                            {remaining === 0 ? (
                                <div className="space-y-2 text-center">
                                    <p className="text-sm text-theme-accent-soft">{lines.limit}</p>
                                    {!isPremium && (
                                        <Button
                                            type="button"
                                            onClick={() => setPremiumPrompt('Upgrade to Premium for up to 6 habits.')}
                                            className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-sm font-semibold text-white"
                                        >
                                            Upgrade to Premium
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-center text-xs font-medium text-theme-accent-soft">
                                    Pick up to {remaining} · {selected.length} selected
                                </p>
                            )}

                            <div className="space-y-2">
                                {suggestions.map((suggestion, index) => {
                                    const isSelected = selected.includes(index);
                                    const isDisabled = !isSelected && (atLimit || remaining === 0);

                                    return (
                                        <button
                                            key={`${suggestion.title}-${index}`}
                                            type="button"
                                            onClick={() => toggleSuggestion(index)}
                                            disabled={isDisabled}
                                            style={{ animationDelay: `${index * 90}ms` }}
                                            className={cn(
                                                'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all animate-in fade-in-0 slide-in-from-bottom-3',
                                                isSelected
                                                    ? 'border-purple-400 bg-theme-accent/15 ring-2 ring-purple-400/40'
                                                    : 'border-theme-accent/20 bg-theme-surface-2/50 hover:border-purple-500/50',
                                                isDisabled && 'cursor-not-allowed opacity-40 hover:border-theme-accent/20',
                                            )}
                                        >
                                            <span className="text-2xl" aria-hidden="true">{suggestion.icon}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-theme-text">
                                                    {suggestion.title}
                                                </span>
                                                <span className="block text-xs text-theme-accent-soft">
                                                    {suggestion.frequency}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setPhase('input')}
                                    className="text-theme-accent-soft hover:text-theme-text"
                                >
                                    Try another goal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={isSaving || !selected.length}
                                    className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition-all hover:from-purple-700 hover:to-purple-600 disabled:opacity-50"
                                >
                                    {isSaving
                                        ? 'Adding…'
                                        : `Add ${selected.length} habit${selected.length === 1 ? '' : 's'}`}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <PremiumUpgradeDialog
                open={Boolean(premiumPrompt)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setPremiumPrompt('');
                    }
                }}
                message={premiumPrompt}
            />
        </>
    );
}

function ThinkingDots() {
    return (
        <span className="ml-1 inline-flex items-center gap-1 align-middle">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-300 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-300 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-300" />
        </span>
    );
}

import { useLayoutEffect, useRef, useState } from 'react';
import { Sparkles, X, Plus, Pencil, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

import { suggestHabits, createHabitsFromTemplates } from '@/services/habitService';
import { getCompanionLines } from '@/constants/companionDialogue';

// The companion "speaks" via this panel; the actual avatar sits to the left
// (CompanionStage on the dashboard). Mounted fresh each time it opens, so no
// reset logic is needed.
export function CompanionChatPanel({
    companionName = 'Howly',
    onClose,
    onHabitAdded,
    onEditSuggestion,
    launchIntent = null,
    className,
}) {
    const lines = getCompanionLines(companionName);
    const autoSubmittedIntentKey = useRef(null);

    const [phase, setPhase] = useState('input'); // input | thinking | results
    const [sentMessage, setSentMessage] = useState('');
    const [input, setInput] = useState(launchIntent?.displayGoal ?? '');
    const [goal, setGoal] = useState('');
    const [habits, setHabits] = useState([]); // { key, title, icon, frequency, category }
    const [error, setError] = useState('');
    const [addingKey, setAddingKey] = useState(null);

    async function runSuggest(displayLabel, apiGoal) {
        const trimmedGoal = apiGoal?.trim();
        if (!trimmedGoal) {
            return;
        }

        setError('');
        setPhase('thinking');

        try {
            const response = await suggestHabits(trimmedGoal);
            const list = response?.data?.suggestions ?? [];

            if (!list.length) {
                setError("Oops — I can't find any habits right now. Please ask me again in a moment.");
                setPhase('input');
                return;
            }

            setGoal(displayLabel || response?.data?.goal || trimmedGoal);
            setHabits(list.map((habit, index) => ({ key: index, ...habit })));
            setPhase('results');
        } catch (err) {
            if (err.code === 'GOAL_MODERATION_BLOCKED') {
                setError(err.message || 'Please rephrase your goal without harmful or inappropriate content.');
            } else {
                setError("Oops — I can't find any habits right now. Please ask me again in a moment.");
            }
            setPhase('input');
        }
    }

    useLayoutEffect(() => {
        const suggestGoal = launchIntent?.suggestGoal?.trim();
        const displayGoal = launchIntent?.displayGoal?.trim();

        if (!suggestGoal || !displayGoal) {
            return undefined;
        }

        const intentKey = `${displayGoal}::${suggestGoal}`;
        if (autoSubmittedIntentKey.current === intentKey) {
            return undefined;
        }

        autoSubmittedIntentKey.current = intentKey;
        setSentMessage(displayGoal);
        setInput('');
        void runSuggest(displayGoal, suggestGoal);

        return undefined;
    }, [launchIntent?.displayGoal, launchIntent?.suggestGoal]);

    async function handleAsk(event) {
        event.preventDefault();
        if (!input.trim()) {
            return;
        }

        setSentMessage(input.trim());
        setInput('');
        setPhase('thinking');

        const apiGoal = input.trim() === launchIntent?.displayGoal && launchIntent?.suggestGoal
            ? launchIntent.suggestGoal
            : input.trim();

        await runSuggest(input.trim(), apiGoal);
    }

    // Quick-add a suggestion as-is, then drop it from the list.
    async function handleAdd(habit) {
        setAddingKey(habit.key);
        setError('');

        try {
            const template = {
                title: habit.title,
                description: habit.description,
                icon: habit.icon,
                frequency: habit.frequency,
                category: habit.category,
            };

            if (launchIntent?.canonicalHabitKey) {
                template.canonicalHabitKey = launchIntent.canonicalHabitKey;
            }

            const response = await createHabitsFromTemplates([template]);
            (response?.data ?? []).forEach((created) => onHabitAdded?.(created));
            setHabits((previous) => previous.filter((entry) => entry.key !== habit.key));
        } catch (err) {
            setError(err.message || 'Could not add the habit. Please try again.');
        } finally {
            setAddingKey(null);
        }
    }

    const bubble = phase === 'thinking'
        ? lines.thinking
        : phase === 'results'
            ? lines.results
            : lines.greeting;

    return (
        <div className={cn('min-w-0 flex-1 rounded-2xl border border-theme-accent/20 bg-theme-surface p-4 text-theme-text shadow-xl', className)}>
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-theme-accent-soft">
                    <Sparkles size={15} aria-hidden="true" />
                    {companionName}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-lg p-1 text-theme-text-muted transition-colors hover:bg-theme-text/10 hover:text-theme-text"
                >
                    <X size={16} />
                </button>
            </div>

            {sentMessage ? (
                <p className="mt-2 ml-auto block w-fit max-w-[85%] rounded-2xl bg-theme-accent/15 px-3 py-2 text-sm text-theme-text">
                    {sentMessage}
                </p>
            ) : null}

            <p className="mt-2 inline-block rounded-2xl bg-theme-surface-2/70 px-3 py-2 text-sm text-theme-accent-soft">
                {bubble}
            </p>

            {error ? (
                <p className="mt-2 rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-3 py-2 text-xs text-theme-danger">
                    {error}
                </p>
            ) : null}

            {phase === 'results' ? (
                <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-theme-accent-soft">Goal</p>
                    <p className="rounded-xl border border-theme-accent/20 bg-theme-accent/10 px-3 py-2 text-sm font-semibold text-theme-text">
                        {goal}
                    </p>

                    <p className="pt-1 text-[11px] font-medium uppercase tracking-wide text-theme-accent-soft">Suggested habits</p>
                    {habits.map((habit) => (
                        <div
                            key={habit.key}
                            className="flex items-center gap-2 rounded-xl border border-theme-accent/20 bg-theme-surface-2/50 p-2.5"
                        >
                            <span className="text-lg" aria-hidden="true">{habit.icon}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-theme-text">{habit.title}</p>
                                <p className="text-xs text-theme-accent-soft">
                                    {habit.frequency}
                                    {habit.category ? ` · ${habit.category}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onEditSuggestion?.(
                                    {
                                        ...habit,
                                        canonicalHabitKey: launchIntent?.canonicalHabitKey ?? null,
                                    },
                                    () => setHabits((previous) => previous.filter((entry) => entry.key !== habit.key)),
                                )}
                                aria-label="Edit habit"
                                className="rounded-lg p-1.5 text-theme-text-soft transition-colors hover:bg-theme-text/10 hover:text-theme-text"
                            >
                                <Pencil size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAdd(habit)}
                                disabled={addingKey === habit.key}
                                aria-label="Add habit"
                                className="rounded-lg bg-theme-accent p-1.5 text-theme-on-accent transition-colors hover:bg-theme-accent-strong disabled:opacity-50"
                            >
                                <Plus size={15} />
                            </button>
                        </div>
                    ))}
                    {habits.length === 0 ? (
                        <p className="py-2 text-center text-xs text-theme-accent-soft">All set. Ask for more ideas below.</p>
                    ) : null}
                </div>
            ) : null}

            <form onSubmit={handleAsk} className="mt-3 flex gap-2">
                <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Type a goal or a sentence…"
                    maxLength={200}
                    className="min-w-0 flex-1 rounded-xl border border-theme-accent/20 bg-theme-surface-2/60 px-3 py-2 text-sm text-theme-text outline-none placeholder:text-theme-text-muted focus:border-theme-accent"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || phase === 'thinking'}
                    aria-label="Ask"
                    className="rounded-xl bg-gradient-to-r from-theme-accent to-theme-accent px-3 text-theme-on-accent transition-all hover:from-theme-accent-strong hover:to-theme-accent-strong disabled:opacity-50"
                >
                    <ArrowUp size={16} />
                </button>
            </form>
        </div>
    );
}

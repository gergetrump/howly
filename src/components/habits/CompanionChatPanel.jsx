import { useState } from 'react';
import { Sparkles, X, Plus, Pencil, ArrowUp } from 'lucide-react';

import { suggestHabits, createHabitsFromTemplates } from '@/services/habitService';
import { STARTER_HABITS } from '@/constants/starterHabits';
import { getCompanionLines } from '@/constants/companionDialogue';

// If the AI is unreachable or returns nothing usable, fall back to a few classic
// starter habits so the panel never dead-ends.
function fallbackHabits() {
    return STARTER_HABITS.slice(0, 3).map((habit, index) => ({
        key: index,
        title: habit.title,
        icon: habit.icon,
        frequency: habit.frequency,
        category: habit.category,
    }));
}

// The companion "speaks" via this panel; the actual avatar sits to the left
// (CompanionStage on the dashboard). Mounted fresh each time it opens, so no
// reset logic is needed.
export function CompanionChatPanel({ companionName = 'Howly', onClose, onHabitAdded, onEditSuggestion }) {
    const lines = getCompanionLines(companionName);

    const [phase, setPhase] = useState('input'); // input | thinking | results
    const [input, setInput] = useState('');
    const [goal, setGoal] = useState('');
    const [habits, setHabits] = useState([]); // { key, title, icon, frequency, category }
    const [error, setError] = useState('');
    const [addingKey, setAddingKey] = useState(null);

    async function handleAsk(event) {
        event.preventDefault();
        if (!input.trim()) return;

        setError('');
        setPhase('thinking');

        try {
            const response = await suggestHabits(input.trim());
            const list = response?.data?.suggestions ?? [];
            setGoal(response?.data?.goal || input.trim());
            setHabits(
                list.length
                    ? list.map((habit, index) => ({ key: index, ...habit }))
                    : fallbackHabits(),
            );
        } catch {
            setGoal(input.trim());
            setHabits(fallbackHabits());
        }

        setPhase('results');
    }

    // Quick-add a suggestion as-is, then drop it from the list.
    async function handleAdd(habit) {
        setAddingKey(habit.key);
        setError('');

        try {
            const response = await createHabitsFromTemplates([{
                title: habit.title,
                icon: habit.icon,
                frequency: habit.frequency,
                category: habit.category,
                goal,
            }]);
            (response?.data ?? []).forEach((created) => onHabitAdded?.(created));
            setHabits((previous) => previous.filter((entry) => entry.key !== habit.key));
        } catch (err) {
            setError(err.message || 'Could not add the habit. Please try again.');
        } finally {
            setAddingKey(null);
        }
    }

    const bubble = phase === 'thinking' ? lines.thinking : phase === 'results' ? lines.results : lines.greeting;

    return (
        <div className="min-w-0 flex-1 rounded-2xl border border-purple-500/20 bg-[#1e1b3a]/70 p-4 text-white shadow-xl">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-purple-100">
                    <Sparkles size={15} aria-hidden="true" />
                    {companionName}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                    <X size={16} />
                </button>
            </div>

            <p className="mt-2 inline-block rounded-2xl bg-[#2d2b55]/70 px-3 py-2 text-sm text-purple-100">
                {bubble}
            </p>

            {error ? (
                <p className="mt-2 rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                    {error}
                </p>
            ) : null}

            {phase === 'results' ? (
                <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-purple-300">Goal</p>
                    <p className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-sm font-semibold text-white">
                        {goal}
                    </p>

                    <p className="pt-1 text-[11px] font-medium uppercase tracking-wide text-purple-300">Suggested habits</p>
                    {habits.map((habit) => (
                        <div
                            key={habit.key}
                            className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-[#2d2b55]/50 p-2.5"
                        >
                            <span className="text-lg" aria-hidden="true">{habit.icon}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white">{habit.title}</p>
                                <p className="text-xs text-purple-300">
                                    {habit.frequency}
                                    {habit.category ? ` · ${habit.category}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onEditSuggestion?.({ ...habit, goal })}
                                aria-label="Edit habit"
                                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <Pencil size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAdd(habit)}
                                disabled={addingKey === habit.key}
                                aria-label="Add habit"
                                className="rounded-lg bg-purple-600 p-1.5 text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                            >
                                <Plus size={15} />
                            </button>
                        </div>
                    ))}
                    {habits.length === 0 ? (
                        <p className="py-2 text-center text-xs text-purple-300">All set — ask for more ideas below.</p>
                    ) : null}
                </div>
            ) : null}

            <form onSubmit={handleAsk} className="mt-3 flex gap-2">
                <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Type a goal or a sentence…"
                    maxLength={200}
                    className="min-w-0 flex-1 rounded-xl border border-purple-500/20 bg-[#2d2b55]/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-500"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || phase === 'thinking'}
                    aria-label="Ask"
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 px-3 text-white transition-all hover:from-purple-700 hover:to-purple-600 disabled:opacity-50"
                >
                    <ArrowUp size={16} />
                </button>
            </form>
        </div>
    );
}

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChallengeHabitList({
    habits,
    selectedHabitId,
    onSelectHabitId,
    allowEmptySelection = false,
    currentHabitTitle,
}) {
    if (habits.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                No habits available yet.
            </div>
        );
    }

    return (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {allowEmptySelection && currentHabitTitle ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                    Current habit: {currentHabitTitle}
                </div>
            ) : null}
            {habits.map((habit) => {
                const isSelected = selectedHabitId === habit.id;

                return (
                    <button
                        key={habit.id}
                        type="button"
                        onClick={() => onSelectHabitId(habit.id)}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                            isSelected
                                ? 'border-emerald-300 bg-emerald-400/15'
                                : 'border-white/10 bg-white/5 hover:bg-white/10',
                        )}
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg">
                            {habit.icon || habit.title?.charAt(0) || 'H'}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-white">
                                {habit.title}
                            </span>
                            <span className="mt-1 block text-sm text-slate-300">
                                {habit.frequency || 'Frequency'} / {habit.streakCount ?? 0} streak
                            </span>
                        </span>
                        {isSelected ? <Check className="size-5 text-emerald-300" aria-hidden="true" /> : null}
                    </button>
                );
            })}
        </div>
    );
}

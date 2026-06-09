import { Loader2 } from 'lucide-react';
import { ActionButton } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ChallengeHabitList } from './ChallengeHabitList.jsx';

export function ChallengeHabitPickerDialog({
    open,
    onOpenChange,
    habits,
    selectedHabitId,
    onSelectedHabitIdChange,
    onConfirm,
    isSubmitting,
    title,
}) {
    const hasHabits = habits.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg rounded-2xl border-white/10 bg-[#1e1b3a] text-white">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="text-slate-300">
                        Habit for this challenge
                    </DialogDescription>
                </DialogHeader>

                <ChallengeHabitList
                    habits={habits}
                    selectedHabitId={selectedHabitId}
                    onSelectHabitId={onSelectedHabitIdChange}
                />

                <DialogFooter className="border-white/10 bg-white/5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                    >
                        Cancel
                    </Button>
                    <ActionButton
                        type="button"
                        onClick={onConfirm}
                        disabled={!hasHabits || !selectedHabitId || isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                        Confirm
                    </ActionButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

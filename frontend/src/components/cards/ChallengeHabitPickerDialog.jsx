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
            <DialogContent className="sm:max-w-lg rounded-2xl border-theme-text/10 bg-theme-surface text-theme-text">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="text-theme-text-soft">
                        Habit for this challenge
                    </DialogDescription>
                </DialogHeader>

                <ChallengeHabitList
                    habits={habits}
                    selectedHabitId={selectedHabitId}
                    onSelectHabitId={onSelectedHabitIdChange}
                />

                <DialogFooter className="border-theme-text/10 bg-theme-text/5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="border-theme-text/20 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
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

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChallengeHabitList } from './ChallengeHabitList.jsx';

const COINS_PER_CHALLENGE_DAY = 5;

function toDateInputValue(date = new Date()) {
    const parsedDate = new Date(date);
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

const INITIAL_CHALLENGE_FORM = {
    title: '',
    description: '',
    frequency: 'daily',
    durationDays: 30,
    visibility: 'public',
    habitId: '',
    startsAt: toDateInputValue(),
};

function buildChallengeForm(challenge) {
    if (!challenge) {
        return INITIAL_CHALLENGE_FORM;
    }

    return {
        title: challenge.title ?? '',
        description: challenge.description ?? '',
        frequency: challenge.frequency ?? 'daily',
        durationDays: challenge.durationDays ?? 30,
        visibility: challenge.visibility ?? 'public',
        habitId: '',
        startsAt: toDateInputValue(challenge.startsAt ?? new Date()),
    };
}

export function ChallengeFormDialog({ open, onOpenChange, onSubmit, isSubmitting, habits, challenge }) {
    const isEditing = Boolean(challenge);
    const [form, setForm] = useState(() => buildChallengeForm(challenge));
    const calculatedReward = Number(form.durationDays || 0) * COINS_PER_CHALLENGE_DAY;
    const selectedHabit = habits.find((habit) => habit.id === form.habitId);
    const canSubmit = Boolean(
        form.title.trim()
            && Number(form.durationDays) > 0
            && form.startsAt
            && (isEditing || selectedHabit)
    );

    function updateField(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const payload = {
            title: form.title,
            description: form.description,
            frequency: form.frequency,
            durationDays: Number(form.durationDays),
            visibility: form.visibility,
            startsAt: form.startsAt,
        };

        if (selectedHabit) {
            payload.habitId = selectedHabit.id;
            payload.habitTitle = selectedHabit.title;
        }

        await onSubmit(payload, challenge);
    }

    function handleOpenChange(nextOpen) {
        if (!nextOpen) {
            setForm(buildChallengeForm(challenge));
        }

        onOpenChange(nextOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xl rounded-2xl border-theme-text/10 bg-theme-surface text-theme-text">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit challenge' : 'Create challenge'}</DialogTitle>
                    <DialogDescription className="text-theme-text-soft">
                        Challenge details
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="challenge-title">Title</Label>
                            <Input
                                id="challenge-title"
                                value={form.title}
                                onChange={(event) => updateField('title', event.target.value)}
                                required
                                maxLength={120}
                                className="border-theme-text/10 bg-theme-text/10 text-theme-text placeholder:text-theme-text-muted"
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label>Habit</Label>
                            <ChallengeHabitList
                                habits={habits}
                                selectedHabitId={form.habitId}
                                onSelectHabitId={(habitId) => updateField('habitId', habitId)}
                                allowEmptySelection={isEditing}
                                currentHabitTitle={challenge?.habitTitle}
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="challenge-description">Description</Label>
                            <textarea
                                id="challenge-description"
                                value={form.description}
                                onChange={(event) => updateField('description', event.target.value)}
                                rows={3}
                                maxLength={500}
                                className="w-full resize-none rounded-lg border border-theme-text/10 bg-theme-text/10 px-2.5 py-2 text-sm text-theme-text outline-none placeholder:text-theme-text-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="challenge-starts-at">Start date</Label>
                            <Input
                                id="challenge-starts-at"
                                type="date"
                                value={form.startsAt}
                                onChange={(event) => updateField('startsAt', event.target.value)}
                                required
                                className="border-theme-text/10 bg-theme-text/10 text-theme-text [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="challenge-duration">Duration days</Label>
                            <Input
                                id="challenge-duration"
                                type="number"
                                min={1}
                                value={form.durationDays}
                                onChange={(event) => updateField('durationDays', event.target.value)}
                                required
                                className="border-theme-text/10 bg-theme-text/10 text-theme-text [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Reward</Label>
                            <div className="flex h-8 items-center rounded-lg border border-theme-text/10 bg-theme-text/10 px-2.5 text-sm text-theme-text">
                                {calculatedReward} coins
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Frequency</Label>
                            <Select value={form.frequency} onValueChange={(value) => updateField('frequency', value)}>
                                <SelectTrigger className="h-9 w-full border-theme-text/10 bg-theme-text/10 text-theme-text">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-theme-text/10 bg-theme-surface text-theme-text">
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Visibility</Label>
                            <Select value={form.visibility} onValueChange={(value) => updateField('visibility', value)}>
                                <SelectTrigger className="h-9 w-full border-theme-text/10 bg-theme-text/10 text-theme-text">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-theme-text/10 bg-theme-surface text-theme-text">
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="friends">Friends</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="border-theme-text/10 bg-theme-text/5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                            className="border-theme-text/20 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
                        >
                            Cancel
                        </Button>
                        <ActionButton type="submit" disabled={!canSubmit || isSubmitting}>
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                            {isEditing ? 'Save' : 'Create'}
                        </ActionButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

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
    startsAt: toDateInputValue(),
    habitTitle: '',
    habitIcon: 'C',
    habitType: 'boolean',
    habitTarget: 1,
    habitUnit: '',
    habitFrequency: 'Daily',
    habitCategory: 'Challenge',
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
        startsAt: toDateInputValue(challenge.startsAt ?? new Date()),
        habitTitle: challenge.habitTemplate?.title ?? challenge.habitTitle ?? '',
        habitIcon: challenge.habitTemplate?.icon ?? 'C',
        habitType: challenge.habitTemplate?.type ?? 'boolean',
        habitTarget: challenge.habitTemplate?.target ?? 1,
        habitUnit: challenge.habitTemplate?.unit ?? '',
        habitFrequency: challenge.habitTemplate?.frequency ?? 'Daily',
        habitCategory: challenge.habitTemplate?.category ?? 'Challenge',
    };
}

export function ChallengeFormDialog({ open, onOpenChange, onSubmit, isSubmitting, challenge }) {
    const isEditing = Boolean(challenge);
    const [form, setForm] = useState(() => buildChallengeForm(challenge));
    const calculatedReward = Number(form.durationDays || 0) * COINS_PER_CHALLENGE_DAY;
    const canSubmit = Boolean(
        form.title.trim()
            && form.habitTitle.trim()
            && Number(form.durationDays) > 0
            && form.startsAt
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
            frequency: form.habitFrequency.toLowerCase(),
            durationDays: Number(form.durationDays),
            visibility: form.visibility,
            startsAt: form.startsAt,
            habitTemplate: {
                title: form.habitTitle,
                icon: form.habitIcon || 'C',
                type: form.habitType,
                target: form.habitType === 'numeric' ? Number(form.habitTarget || 1) : undefined,
                unit: form.habitUnit,
                frequency: form.habitFrequency,
                category: form.habitCategory || 'Challenge',
            },
        };

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
            <DialogContent className="sm:max-w-xl rounded-2xl border-white/10 bg-[#1e1b3a] text-white">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit challenge' : 'Create challenge'}</DialogTitle>
                    <DialogDescription className="text-slate-300">
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
                                className="border-white/10 bg-white/10 text-white placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                            <Label>Challenge habit</Label>
                            <div className="grid gap-3 sm:grid-cols-[72px_1fr]">
                                <Input
                                    aria-label="Habit icon"
                                    value={form.habitIcon}
                                    onChange={(event) => updateField('habitIcon', event.target.value)}
                                    maxLength={5}
                                    className="border-white/10 bg-white/10 text-center text-white placeholder:text-slate-400"
                                />
                                <Input
                                    value={form.habitTitle}
                                    onChange={(event) => updateField('habitTitle', event.target.value)}
                                    required
                                    maxLength={100}
                                    placeholder="e.g. Read 10 pages"
                                    className="border-white/10 bg-white/10 text-white placeholder:text-slate-400"
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <Select value={form.habitFrequency} onValueChange={(value) => updateField('habitFrequency', value)}>
                                    <SelectTrigger className="h-9 w-full border-white/10 bg-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-white/10 bg-[#1e1b3a] text-white">
                                        <SelectItem value="Daily">Daily</SelectItem>
                                        <SelectItem value="Weekly">Weekly</SelectItem>
                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={form.habitType} onValueChange={(value) => updateField('habitType', value)}>
                                    <SelectTrigger className="h-9 w-full border-white/10 bg-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-white/10 bg-[#1e1b3a] text-white">
                                        <SelectItem value="boolean">Boolean</SelectItem>
                                        <SelectItem value="numeric">Numeric</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    value={form.habitCategory}
                                    onChange={(event) => updateField('habitCategory', event.target.value)}
                                    maxLength={100}
                                    className="border-white/10 bg-white/10 text-white placeholder:text-slate-400"
                                />
                            </div>
                            {form.habitType === 'numeric' ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        value={form.habitTarget}
                                        onChange={(event) => updateField('habitTarget', event.target.value)}
                                        className="border-white/10 bg-white/10 text-white [color-scheme:dark]"
                                    />
                                    <Input
                                        value={form.habitUnit}
                                        onChange={(event) => updateField('habitUnit', event.target.value)}
                                        maxLength={50}
                                        placeholder="Unit"
                                        className="border-white/10 bg-white/10 text-white placeholder:text-slate-400"
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="challenge-description">Description</Label>
                            <textarea
                                id="challenge-description"
                                value={form.description}
                                onChange={(event) => updateField('description', event.target.value)}
                                rows={3}
                                maxLength={500}
                                className="w-full resize-none rounded-lg border border-white/10 bg-white/10 px-2.5 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
                                className="border-white/10 bg-white/10 text-white [color-scheme:dark]"
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
                                className="border-white/10 bg-white/10 text-white [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Reward</Label>
                            <div className="flex h-8 items-center rounded-lg border border-white/10 bg-white/10 px-2.5 text-sm text-white">
                                {calculatedReward} coins
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Visibility</Label>
                            <Select value={form.visibility} onValueChange={(value) => updateField('visibility', value)}>
                                <SelectTrigger className="h-9 w-full border-white/10 bg-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1e1b3a] text-white">
                                    <SelectItem value="public">Public</SelectItem>
                                    <SelectItem value="friends">Friends</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="border-white/10 bg-white/5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
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

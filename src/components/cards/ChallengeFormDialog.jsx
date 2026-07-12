import { useState } from 'react';
import { Loader2, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { ActionButton } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
    ConfirmationDialog,
    ConfirmationDialogAction,
    ConfirmationDialogCancel,
    ConfirmationDialogContent,
    ConfirmationDialogDescription,
    ConfirmationDialogFooter,
    ConfirmationDialogHeader,
    ConfirmationDialogTitle,
} from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const COINS_PER_CHALLENGE_DAY = 5;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_CHALLENGE_DURATION_DAYS = 92;

const ICONS = [
    '\uD83C\uDFAF', '\uD83D\uDCA7', '\uD83C\uDFC3', '\uD83D\uDCD6', '\uD83E\uDDD8', '\uD83E\uDD57',
    '\uD83D\uDCAA', '\uD83D\uDC83', '\u270D\uFE0F', '\uD83D\uDDE3\uFE0F', '\uD83C\uDFB5', '\uD83E\uDDE0',
    '\uD83D\uDEB4', '\uD83C\uDF4E', '\uD83D\uDE34', '\uD83E\uDDF9', '\uD83D\uDCBB', '\uD83D\uDCB8',
];

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'];

function toDateInputValue(date = new Date()) {
    const parsedDate = new Date(date);
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function addDaysToDateInput(dateValue, days) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return toDateInputValue();
    }

    date.setDate(date.getDate() + Number(days || 1));

    return toDateInputValue(date);
}

function calculateDurationDays(startsAt, endsAt) {
    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return 0;
    }

    return Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_IN_MS);
}

const INITIAL_CHALLENGE_FORM = {
    title: '',
    description: '',
    visibility: 'public',
    startsAt: toDateInputValue(),
    endsAt: addDaysToDateInput(toDateInputValue(), 30),
    habitTitle: '',
    habitIcon: '\uD83C\uDFAF',
    habitTarget: '',
    habitUnit: '',
    habitFrequency: 'Daily',
};

function buildChallengeForm(challenge) {
    if (!challenge) {
        return INITIAL_CHALLENGE_FORM;
    }

    return {
        title: challenge.title ?? '',
        description: challenge.description ?? '',
        visibility: challenge.visibility ?? 'public',
        startsAt: toDateInputValue(challenge.startsAt ?? new Date()),
        endsAt: challenge.endsAt
            ? toDateInputValue(challenge.endsAt)
            : addDaysToDateInput(challenge.startsAt ?? new Date(), challenge.durationDays ?? 30),
        habitTitle: challenge.habitTemplate?.title ?? challenge.habitTitle ?? '',
        habitIcon: challenge.habitTemplate?.icon ?? '\uD83C\uDFAF',
        habitTarget: challenge.habitTemplate?.target ? String(challenge.habitTemplate.target) : '',
        habitUnit: challenge.habitTemplate?.unit ?? '',
        habitFrequency: challenge.habitTemplate?.frequency ?? 'Daily',
    };
}

export function ChallengeFormDialog({ open, onOpenChange, onSubmit, onDelete, isSubmitting, isDeleting, challenge }) {
    const isEditing = Boolean(challenge);
    const [form, setForm] = useState(() => buildChallengeForm(challenge));
    const [formError, setFormError] = useState('');
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const durationDays = calculateDurationDays(form.startsAt, form.endsAt);
    const maxEndDate = addDaysToDateInput(form.startsAt, MAX_CHALLENGE_DURATION_DAYS);
    const calculatedReward = Math.max(durationDays, 0) * COINS_PER_CHALLENGE_DAY;
    function updateField(field, value) {
        setFormError('');
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    }

    function validateForm() {
        if (!form.title.trim()) {
            return 'Challenge name is required.';
        }

        if (!form.habitTitle.trim()) {
            return 'Habit name is required.';
        }

        if (form.habitTarget !== '') {
            const numericTarget = Number(form.habitTarget);

            if (!Number.isFinite(numericTarget) || numericTarget < 1) {
                return 'Goal must be a positive number.';
            }
        }

        if (!form.startsAt) {
            return 'Start date is required.';
        }

        if (!form.endsAt) {
            return 'End date is required.';
        }

        if (durationDays <= 0) {
            return 'End date must be after the start date.';
        }

        if (durationDays > MAX_CHALLENGE_DURATION_DAYS) {
            return 'Challenges can run for a maximum of 3 months.';
        }

        return '';
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const validationError = validateForm();

        if (validationError) {
            setFormError(validationError);
            return;
        }

        const numericTarget = Number(form.habitTarget);
        const hasGoal = form.habitTarget !== '' && Number.isFinite(numericTarget) && numericTarget >= 1;
        const payload = {
            title: form.title,
            description: form.description,
            frequency: form.habitFrequency.toLowerCase(),
            durationDays,
            visibility: form.visibility,
            startsAt: form.startsAt,
            habitTemplate: {
                title: form.habitTitle,
                icon: form.habitIcon || '\uD83C\uDFAF',
                type: hasGoal ? 'numeric' : 'boolean',
                frequency: form.habitFrequency,
            },
        };

        if (hasGoal) {
            payload.habitTemplate.target = numericTarget;
            if (form.habitUnit.trim()) {
                payload.habitTemplate.unit = form.habitUnit.trim();
            }
        }

        await onSubmit(payload, challenge);
    }

    function handleOpenChange(nextOpen) {
        if (!nextOpen) {
            setForm(buildChallengeForm(challenge));
            setFormError('');
            setIconPickerOpen(false);
        }

        onOpenChange(nextOpen);
    }

    async function handleConfirmDelete() {
        if (!challenge || !onDelete) {
            return;
        }

        setDeleteConfirmOpen(false);
        await onDelete(challenge);
    }

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="max-h-[88vh] overflow-y-auto rounded-2xl border-0 bg-theme-surface p-6 text-theme-text shadow-2xl sm:max-w-2xl sm:p-10">
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-theme-text">
                            {isEditing ? 'Edit Challenge' : 'Create Challenge'}
                        </DialogTitle>
                        <DialogDescription className="text-theme-text-soft">
                            Set up the Challenge and the Habit every participant will receive.
                        </DialogDescription>
                    </DialogHeader>

                <form
                    className="space-y-6"
                    onSubmit={handleSubmit}
                    onInvalid={(event) => event.preventDefault()}
                    noValidate
                >
                    <div className="space-y-4">
                        <div className="space-y-2.5">
                            <Label htmlFor="challenge-title" className="text-sm font-medium text-theme-text">
                                Challenge Name
                            </Label>
                            <Input
                                id="challenge-title"
                                value={form.title}
                                onChange={(event) => updateField('title', event.target.value)}
                                aria-required="true"
                                maxLength={120}
                                placeholder="e.g. 30 Day Reading Challenge"
                                className="h-12 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text caret-theme-accent placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-theme-accent/20"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="challenge-description" className="text-sm font-medium text-theme-text">
                                Description
                            </Label>
                            <textarea
                                id="challenge-description"
                                value={form.description}
                                onChange={(event) => updateField('description', event.target.value)}
                                rows={4}
                                maxLength={500}
                                placeholder="What should participants know?"
                                className="w-full resize-none rounded-2xl border border-theme-accent/20 bg-theme-surface-2/60 px-3 py-3 text-sm text-theme-text outline-none placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-3 focus:ring-theme-accent/20"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium text-theme-text">Visibility</Label>
                            <Select value={form.visibility} onValueChange={(value) => updateField('visibility', value)}>
                                <SelectTrigger className="!h-12 w-full rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text focus:ring-theme-accent/20 [&>svg]:text-theme-text [&>svg]:opacity-50">
                                    <SelectValue placeholder="Select Visibility" />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4} className="z-[100] w-[var(--radix-select-trigger-width)] rounded-xl border-theme-accent/20 bg-theme-surface">
                                    <SelectItem
                                        value="public"
                                        className="cursor-pointer text-theme-text focus:!bg-theme-accent/40 focus:!text-theme-text data-[state=checked]:text-theme-text [&_*]:!text-theme-text"
                                    >
                                        Public - Everyone Can Find and Join
                                    </SelectItem>
                                    <SelectItem
                                        value="friends"
                                        className="cursor-pointer text-theme-text focus:!bg-theme-accent/40 focus:!text-theme-text data-[state=checked]:text-theme-text [&_*]:!text-theme-text"
                                    >
                                        Private - Friends Only
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="space-y-2.5">
                                <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-theme-accent/20 bg-theme-surface-2/60 text-2xl transition-colors hover:border-theme-accent/40"
                                        >
                                            {form.habitIcon}
                                            <div className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-theme-surface bg-theme-accent text-theme-on-accent">
                                                <Plus size={12} strokeWidth={4} />
                                            </div>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-64 rounded-xl border-theme-accent/20 bg-theme-surface p-3 shadow-xl"
                                        align="start"
                                    >
                                        <p className="mb-2 text-xs font-medium text-theme-accent-soft">
                                            Choose an Icon
                                        </p>
                                        <div className="grid grid-cols-6 gap-1.5">
                                            {ICONS.map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => {
                                                        updateField('habitIcon', emoji);
                                                        setIconPickerOpen(false);
                                                    }}
                                                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                                                        form.habitIcon === emoji
                                                            ? 'bg-theme-accent ring-2 ring-theme-accent'
                                                            : 'hover:bg-theme-surface-2'
                                                    }`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between border-t border-theme-accent/20 pt-3">
                                            <p className="text-xs font-medium text-theme-accent-soft">
                                                Custom Emoji:
                                            </p>
                                            <Input
                                                value={form.habitIcon}
                                                onChange={(event) => updateField('habitIcon', event.target.value)}
                                                placeholder="\u2728"
                                                maxLength={5}
                                                className="h-8 w-14 rounded-lg border-theme-accent/40 bg-theme-surface-2/60 px-0 text-center text-lg text-theme-text focus:border-theme-accent"
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex-1 space-y-2.5">
                                <Input
                                    id="habit-name"
                                    value={form.habitTitle}
                                    onChange={(event) => updateField('habitTitle', event.target.value)}
                                    placeholder="e.g. Drink Water, Morning Run, Read..."
                                    aria-required="true"
                                    maxLength={100}
                                    className="h-12 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text caret-theme-accent placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-theme-accent/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium text-theme-text">
                                Goal <span className="font-normal text-theme-text-muted">(optional)</span>
                            </Label>
                            <div className="flex gap-3">
                                <Input
                                    id="habit-target"
                                    type="number"
                                    min={1}
                                    value={form.habitTarget}
                                    onChange={(event) => updateField('habitTarget', event.target.value)}
                                    placeholder="8"
                                    className="h-12 w-24 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text caret-theme-accent placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-theme-accent/20 [color-scheme:dark] [&::-webkit-inner-spin-button]:opacity-50"
                                />
                                <Input
                                    value={form.habitUnit}
                                    onChange={(event) => updateField('habitUnit', event.target.value)}
                                    placeholder="glasses, min, pages..."
                                    maxLength={50}
                                    className="h-12 flex-1 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text caret-theme-accent placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-theme-accent/20"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2.5">
                                <Label className="text-sm font-medium text-theme-text">Frequency</Label>
                                <Select value={form.habitFrequency} onValueChange={(value) => updateField('habitFrequency', value)}>
                                    <SelectTrigger className="!h-12 w-full rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text focus:ring-theme-accent/20 [&>svg]:text-theme-text [&>svg]:opacity-50">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" sideOffset={4} className="z-[100] w-[var(--radix-select-trigger-width)] rounded-xl border-theme-accent/20 bg-theme-surface">
                                        {FREQUENCIES.map((frequency) => (
                                            <SelectItem
                                                key={frequency}
                                                value={frequency}
                                                className="cursor-pointer text-theme-text focus:!bg-theme-accent/40 focus:!text-theme-text data-[state=checked]:text-theme-text [&_*]:!text-theme-text"
                                            >
                                                {frequency}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2.5">
                            <Label htmlFor="challenge-starts-at" className="text-sm font-medium text-theme-text">
                                Start Date
                            </Label>
                            <Input
                                id="challenge-starts-at"
                                type="date"
                                value={form.startsAt}
                                onChange={(event) => updateField('startsAt', event.target.value)}
                                aria-required="true"
                                lang="en"
                                className="h-12 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text focus:border-theme-accent focus:ring-theme-accent/20 [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="challenge-ends-at" className="text-sm font-medium text-theme-text">
                                End Date
                            </Label>
                            <Input
                                id="challenge-ends-at"
                                type="date"
                                min={form.startsAt}
                                max={maxEndDate}
                                value={form.endsAt}
                                onChange={(event) => updateField('endsAt', event.target.value)}
                                aria-required="true"
                                lang="en"
                                title="Challenges can run for a maximum of 3 months."
                                className="h-12 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text focus:border-theme-accent focus:ring-theme-accent/20 [color-scheme:dark]"
                            />
                            <p className="text-xs font-medium text-theme-text-soft">
                                Maximum Length is 3 Months.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-theme-surface-2/40 px-4 py-3 text-sm text-theme-text">
                        <span>
                            {Math.max(durationDays, 0)} Challenge Days
                        </span>
                        <span className="font-semibold text-theme-gold">
                            Reward: {calculatedReward} Coins
                        </span>
                    </div>
                    {durationDays > MAX_CHALLENGE_DURATION_DAYS ? (
                        <p className="rounded-xl bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                            Challenges can run for a maximum of 3 months.
                        </p>
                    ) : null}
                    {formError ? (
                        <p className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                            {formError}
                        </p>
                    ) : null}

                    <div className={`grid gap-3 ${isEditing ? 'sm:grid-cols-[auto_auto_1fr]' : 'sm:grid-cols-[auto_1fr]'}`}>
                        {isEditing ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeleteConfirmOpen(true)}
                                disabled={isSubmitting || isDeleting}
                                className="h-12 rounded-2xl border-theme-danger/30 bg-theme-danger/10 px-6 text-theme-danger hover:bg-theme-danger/20"
                            >
                                {isDeleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                                Delete
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting || isDeleting}
                            className="h-12 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 px-6 text-theme-text hover:bg-theme-surface-2"
                        >
                            Cancel
                        </Button>
                        <ActionButton
                            type="submit"
                            disabled={isSubmitting || isDeleting}
                            className="h-12 rounded-2xl bg-gradient-to-r from-theme-accent to-theme-accent text-base font-semibold text-theme-on-accent shadow-lg shadow-theme-bg/25 transition-all hover:from-theme-accent-strong hover:to-theme-accent-strong hover:shadow-theme-bg/40"
                        >
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                            {isEditing ? 'Save' : 'Create'}
                        </ActionButton>
                    </div>
                </form>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <ConfirmationDialogContent className="flex flex-col items-center p-7 text-center">
                    <ConfirmationDialogHeader className="flex w-full flex-col items-center justify-center space-y-3 text-center">
                        <ConfirmationDialogTitle className="w-full text-center text-2xl font-bold tracking-tight">
                            Delete challenge?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="flex flex-col gap-2 text-center text-sm leading-relaxed text-theme-text-soft sm:text-base">
                            <span className="break-words [overflow-wrap:anywhere]">
                                Are you sure you want to delete{' '}
                                <strong className="font-semibold text-theme-text">
                                    {challenge?.title}
                                </strong>
                                ? This cannot be undone.
                            </span>
                        </ConfirmationDialogDescription>
                    </ConfirmationDialogHeader>
                    <ConfirmationDialogFooter className="mt-6 w-full flex-col gap-3 sm:flex-col sm:space-x-0">
                        <ConfirmationDialogCancel className="mt-0 h-11 w-full rounded-xl border border-theme-text/10 bg-theme-surface-2 text-sm font-semibold text-theme-text hover:bg-theme-surface-2/80 hover:text-theme-text">
                            Keep challenge
                        </ConfirmationDialogCancel>
                        <ConfirmationDialogAction
                            className="h-11 w-full rounded-xl bg-theme-danger text-sm font-semibold text-white shadow-lg shadow-red-900/20 hover:bg-theme-danger/85"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TriangleAlert className="mr-2 h-4 w-4" />}
                            Yes, delete challenge
                        </ConfirmationDialogAction>
                    </ConfirmationDialogFooter>
                </ConfirmationDialogContent>
            </ConfirmationDialog>
        </>
    );
}

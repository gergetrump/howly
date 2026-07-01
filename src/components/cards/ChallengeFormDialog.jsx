import { useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { ActionButton } from '@/components/common';
import { Button } from '@/components/ui/button';
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

const ICONS = [
    '\uD83C\uDFAF', '\uD83D\uDCA7', '\uD83C\uDFC3', '\uD83D\uDCD6', '\uD83E\uDDD8', '\uD83E\uDD57',
    '\uD83D\uDCAA', '\uD83D\uDC83', '\u270D\uFE0F', '\uD83D\uDDE3\uFE0F', '\uD83C\uDFB5', '\uD83E\uDDE0',
    '\uD83D\uDEB4', '\uD83C\uDF4E', '\uD83D\uDE34', '\uD83E\uDDF9', '\uD83D\uDCBB', '\uD83D\uDCB8',
];

const UNITS = ['L', 'ml', 'min', 'hours', 'km', 'steps', 'times', 'pages', 'Custom'];
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'];
const CATEGORIES = ['Movement', 'Productivity', 'Nutrition', 'Connection'];

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
    frequency: 'daily',
    visibility: 'public',
    startsAt: toDateInputValue(),
    endsAt: addDaysToDateInput(toDateInputValue(), 30),
    habitTitle: '',
    habitIcon: '\uD83C\uDFAF',
    habitType: 'numeric',
    habitTarget: 1,
    habitUnit: '',
    customHabitUnit: '',
    habitFrequency: 'Daily',
    habitCategory: '',
    customHabitCategory: '',
};

function buildChallengeForm(challenge) {
    if (!challenge) {
        return INITIAL_CHALLENGE_FORM;
    }

    return {
        title: challenge.title ?? '',
        description: challenge.description ?? '',
        frequency: challenge.frequency ?? 'daily',
        visibility: challenge.visibility ?? 'public',
        startsAt: toDateInputValue(challenge.startsAt ?? new Date()),
        endsAt: challenge.endsAt
            ? toDateInputValue(challenge.endsAt)
            : addDaysToDateInput(challenge.startsAt ?? new Date(), challenge.durationDays ?? 30),
        habitTitle: challenge.habitTemplate?.title ?? challenge.habitTitle ?? '',
        habitIcon: challenge.habitTemplate?.icon ?? '\uD83C\uDFAF',
        habitType: challenge.habitTemplate?.type ?? 'numeric',
        habitTarget: challenge.habitTemplate?.target ?? 1,
        habitUnit: challenge.habitTemplate?.unit
            ? (UNITS.includes(challenge.habitTemplate.unit) ? challenge.habitTemplate.unit : 'Custom')
            : '',
        customHabitUnit: challenge.habitTemplate?.unit && !UNITS.includes(challenge.habitTemplate.unit)
            ? challenge.habitTemplate.unit
            : '',
        habitFrequency: challenge.habitTemplate?.frequency ?? 'Daily',
        habitCategory: challenge.habitTemplate?.category
            ? (CATEGORIES.includes(challenge.habitTemplate.category) ? challenge.habitTemplate.category : 'Custom')
            : '',
        customHabitCategory: challenge.habitTemplate?.category && !CATEGORIES.includes(challenge.habitTemplate.category)
            ? challenge.habitTemplate.category
            : '',
    };
}

export function ChallengeFormDialog({ open, onOpenChange, onSubmit, isSubmitting, challenge }) {
    const isEditing = Boolean(challenge);
    const [form, setForm] = useState(() => buildChallengeForm(challenge));
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const durationDays = calculateDurationDays(form.startsAt, form.endsAt);
    const calculatedReward = Math.max(durationDays, 0) * COINS_PER_CHALLENGE_DAY;
    const finalHabitUnit = form.habitUnit === 'Custom' ? form.customHabitUnit : form.habitUnit;
    const finalHabitCategory = form.habitCategory === 'Custom'
        ? form.customHabitCategory
        : form.habitCategory;
    const selectableCategories = useMemo(() => [...CATEGORIES, 'Custom'], []);
    const canSubmit = Boolean(
        form.title.trim()
            && form.habitTitle.trim()
            && form.habitFrequency
            && finalHabitCategory?.trim()
            && durationDays > 0
            && form.startsAt
            && form.endsAt
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
            durationDays,
            visibility: form.visibility,
            startsAt: form.startsAt,
            habitTemplate: {
                title: form.habitTitle,
                icon: form.habitIcon || '\uD83C\uDFAF',
                type: form.habitType,
                target: Number(form.habitTarget || 1),
                unit: finalHabitUnit,
                frequency: form.habitFrequency,
                category: finalHabitCategory || 'Challenge',
            },
        };

        await onSubmit(payload, challenge);
    }

    function handleOpenChange(nextOpen) {
        if (!nextOpen) {
            setForm(buildChallengeForm(challenge));
            setIconPickerOpen(false);
        }

        onOpenChange(nextOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="rounded-2xl border-0 bg-[#1e1b3a] p-10 text-white shadow-2xl sm:max-w-2xl">
                <DialogHeader className="text-center">
                    <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                        {isEditing ? 'Edit challenge' : 'Create challenge'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                        Set up the challenge and the habit every participant will receive.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="space-y-2.5">
                            <Label htmlFor="challenge-title" className="text-sm font-medium text-white">
                                Challenge name
                            </Label>
                            <Input
                                id="challenge-title"
                                value={form.title}
                                onChange={(event) => updateField('title', event.target.value)}
                                required
                                maxLength={120}
                                placeholder="e.g. 30 day reading challenge"
                                className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white caret-purple-400 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="challenge-description" className="text-sm font-medium text-white">
                                Description
                            </Label>
                            <textarea
                                id="challenge-description"
                                value={form.description}
                                onChange={(event) => updateField('description', event.target.value)}
                                rows={4}
                                maxLength={500}
                                placeholder="What should participants know?"
                                className="w-full resize-none rounded-2xl border border-purple-500/20 bg-[#2d2b55]/60 px-3 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-purple-500 focus:ring-3 focus:ring-purple-500/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="space-y-2.5">
                                <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-[#2d2b55]/60 text-2xl transition-colors hover:border-purple-500/40"
                                        >
                                            {form.habitIcon}
                                            <div className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#1e1b3a] bg-purple-500 text-white">
                                                <Plus size={12} strokeWidth={4} />
                                            </div>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-64 rounded-xl border-purple-500/20 bg-[#1e1b3a] p-3 shadow-xl"
                                        align="start"
                                    >
                                        <p className="mb-2 text-xs font-medium text-purple-300">
                                            Choose an icon
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
                                                            ? 'bg-purple-600 ring-2 ring-purple-400'
                                                            : 'hover:bg-[#2d2b55]'
                                                    }`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex items-center justify-between border-t border-purple-500/20 pt-3">
                                            <p className="text-xs font-medium text-purple-300">
                                                Custom Emoji:
                                            </p>
                                            <Input
                                                value={form.habitIcon}
                                                onChange={(event) => updateField('habitIcon', event.target.value)}
                                                placeholder="\u2728"
                                                maxLength={5}
                                                className="h-8 w-14 rounded-lg border-purple-500/40 bg-[#2d2b55]/60 px-0 text-center text-lg text-white focus:border-purple-500"
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
                                    required
                                    maxLength={100}
                                    className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white caret-purple-400 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2.5">
                                <Label htmlFor="habit-target" className="text-sm font-medium text-white">
                                    Target
                                </Label>
                                <Input
                                    id="habit-target"
                                    type="number"
                                    min={1}
                                    value={form.habitTarget}
                                    onChange={(event) => updateField('habitTarget', event.target.value)}
                                    className="h-12 w-full rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:border-purple-500 focus:ring-purple-500/20 [color-scheme:dark] [&::-webkit-inner-spin-button]:opacity-50"
                                />
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-sm font-medium text-white">Unit</Label>
                                <Select value={form.habitUnit} onValueChange={(value) => updateField('habitUnit', value)}>
                                    <SelectTrigger className="!h-12 w-full rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:ring-purple-500/20 [&>svg]:text-white [&>svg]:opacity-50">
                                        <SelectValue placeholder="Select unit" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" sideOffset={4} className="z-[100] w-[var(--radix-select-trigger-width)] rounded-xl border-purple-500/20 bg-[#1e1b3a]">
                                        {UNITS.map((unit) => (
                                            <SelectItem
                                                key={unit}
                                                value={unit}
                                                className="cursor-pointer text-white focus:!bg-purple-600/40 focus:!text-white data-[state=checked]:text-white [&_*]:!text-white"
                                            >
                                                {unit}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.habitUnit === 'Custom' ? (
                                <div className="col-span-2 space-y-2.5">
                                    <Label className="text-sm font-medium text-white">Custom Unit</Label>
                                    <Input
                                        value={form.customHabitUnit}
                                        onChange={(event) => updateField('customHabitUnit', event.target.value)}
                                        placeholder="e.g. push-ups"
                                        required
                                        maxLength={50}
                                        className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:border-purple-500 focus:ring-purple-500/20"
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2.5">
                                <Label className="text-sm font-medium text-white">Frequency</Label>
                                <Select value={form.habitFrequency} onValueChange={(value) => updateField('habitFrequency', value)}>
                                    <SelectTrigger className="!h-12 w-full rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:ring-purple-500/20 [&>svg]:text-white [&>svg]:opacity-50">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" sideOffset={4} className="z-[100] w-[var(--radix-select-trigger-width)] rounded-xl border-purple-500/20 bg-[#1e1b3a]">
                                        {FREQUENCIES.map((frequency) => (
                                            <SelectItem
                                                key={frequency}
                                                value={frequency}
                                                className="cursor-pointer text-white focus:!bg-purple-600/40 focus:!text-white data-[state=checked]:text-white [&_*]:!text-white"
                                            >
                                                {frequency}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2.5">
                                <Label className="text-sm font-medium text-white">Category</Label>
                                <Select value={form.habitCategory} onValueChange={(value) => updateField('habitCategory', value)}>
                                    <SelectTrigger className="!h-12 w-full rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:ring-purple-500/20 [&>svg]:text-white [&>svg]:opacity-50">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" sideOffset={4} className="z-[100] max-h-60 w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-xl border-purple-500/20 bg-[#1e1b3a]">
                                        {selectableCategories.map((category) => (
                                            <SelectItem
                                                key={category}
                                                value={category}
                                                className="cursor-pointer text-white focus:!bg-purple-600/40 focus:!text-white data-[state=checked]:text-white [&_*]:!text-white"
                                            >
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.habitCategory === 'Custom' ? (
                                <div className="col-span-2 space-y-2.5">
                                    <Label className="text-sm font-medium text-white">Custom Category</Label>
                                    <Input
                                        value={form.customHabitCategory}
                                        onChange={(event) => updateField('customHabitCategory', event.target.value)}
                                        placeholder="e.g. Finances, Learning"
                                        required
                                        maxLength={100}
                                        className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:border-purple-500 focus:ring-purple-500/20"
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2.5">
                            <Label htmlFor="challenge-starts-at" className="text-sm font-medium text-white">
                                Start date
                            </Label>
                            <Input
                                id="challenge-starts-at"
                                type="date"
                                value={form.startsAt}
                                onChange={(event) => updateField('startsAt', event.target.value)}
                                required
                                className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:border-purple-500 focus:ring-purple-500/20 [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="challenge-ends-at" className="text-sm font-medium text-white">
                                End date
                            </Label>
                            <Input
                                id="challenge-ends-at"
                                type="date"
                                min={form.startsAt}
                                value={form.endsAt}
                                onChange={(event) => updateField('endsAt', event.target.value)}
                                required
                                className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:border-purple-500 focus:ring-purple-500/20 [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-[#2d2b55]/40 px-4 py-3 text-sm text-slate-200">
                        <span>
                            {Math.max(durationDays, 0)} challenge days
                        </span>
                        <span className="font-semibold text-amber-200">
                            Reward: {calculatedReward} coins
                        </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                            className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 px-6 text-white hover:bg-[#2d2b55]"
                        >
                            Cancel
                        </Button>
                        <ActionButton
                            type="submit"
                            disabled={!canSubmit || isSubmitting}
                            className="h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition-all hover:from-purple-700 hover:to-purple-600 hover:shadow-purple-600/40"
                        >
                            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                            {isEditing ? 'Save' : 'Create'}
                        </ActionButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

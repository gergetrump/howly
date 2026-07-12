import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { PlanLimitDialog } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { createHabit, updateHabit } from '@/services/habitService';

const ICONS = [
  '🎯', '💧', '🏃', '📖', '🧘', '🥗',
  '💪', '💃', '✍️', '🗣️', '🎵', '🧠',
  '🚴', '🍎', '😴', '🧹', '💻', '💸',
];

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Custom'];

const DAYS_OF_WEEK = [
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 7 },
];

/* Modal for creating or editing a habit; validates input, calls the create/update API, and handles the free-plan habit limit. */
export function AddHabitModal({ open, onOpenChange, onHabitAdded, editHabit, prefill }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('🎯');
    const [target, setTarget] = useState('');
    const [unit, setUnit] = useState('');
    const [frequency, setFrequency] = useState('');
    const [customDays, setCustomDays] = useState([]);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [formError, setFormError] = useState('');
    const [limitPrompt, setLimitPrompt] = useState(null);
    const isFreeUser = user?.isPremium !== true && user?.role !== 'admin';

    useEffect(() => {
        if (open && editHabit) {
            setName(editHabit.title || '');
            setDescription(editHabit.description || '');
            setIcon(editHabit.icon || '🎯');
            setTarget(editHabit.target ? String(editHabit.target) : '');
            setUnit(editHabit.unit || '');
            setFrequency(editHabit.frequency || '');
            setCustomDays(editHabit.customDays || []);
            setFormError('');
        } else if (open && prefill) {
            setName(prefill.title || '');
            setDescription(prefill.description || '');
            setTarget(prefill.target ? String(prefill.target) : '');
            setUnit(prefill.unit || '');
            setFrequency(prefill.frequency || '');
            setCustomDays([]);
            setFormError('');
            setIcon(prefill.icon || '🎯');
        } else if (open && !editHabit) {
            setName('');
            setDescription('');
            setTarget('');
            setUnit('');
            setFrequency('');
            setCustomDays([]);
            setIcon('🎯');
            setFormError('');
        }
    }, [open, editHabit, prefill]);

    /* Validates the form and creates or updates the habit, redirecting free users to Premium when the habit limit is reached. */
    async function handleSubmit(e) {
        e.preventDefault();

        if (!name.trim()) {
            setFormError('Habit name is required.');
            return;
        }

        if (!editHabit && !description.trim()) {
            setFormError('Description is required.');
            return;
        }

        if (!frequency) {
            setFormError('Frequency is required.');
            return;
        }

        if (frequency === 'Custom' && customDays.length === 0) {
            setFormError('Choose at least one specific day.');
            return;
        }

        const data = {
            title: name,
            description: description.trim(),
            frequency,
            customDays,
            icon,
        };

        const numericTarget = Number(target);
        if (target !== '' && Number.isFinite(numericTarget) && numericTarget >= 1) {
            data.target = numericTarget;
            if (unit.trim()) data.unit = unit.trim();
        }

        if (!editHabit && prefill?.canonicalHabitKey) {
            data.canonicalHabitKey = prefill.canonicalHabitKey;
        }

        try {
            setFormError('');
            let result;
            if (editHabit) {
                result = await updateHabit(editHabit.id, data);
            } else {
                result = await createHabit(data);
            }
            if (onHabitAdded) onHabitAdded(result.data, !!editHabit);
            onOpenChange(false);
        } catch (error) {
            if (!editHabit && error.code === 'HABIT_LIMIT_REACHED') {
                onOpenChange(false);
                window.setTimeout(() => {
                    if (isFreeUser) {
                        navigate('/premium', {
                            state: {
                                message: error.message || 'You already reached the free habit limit. Upgrade to Premium to create more habits.',
                                returnTo: '/dashboard',
                            },
                        });
                    } else {
                        setLimitPrompt({
                            title: 'Habit limit reached',
                            message: error.message || 'You reached the habit limit for your current plan.',
                        });
                    }
                }, 0);
                return;
            }

            setFormError(error.message || (editHabit ? 'Failed to update habit' : 'Failed to create habit'));
            console.error(editHabit ? 'Failed to update habit' : 'Failed to create habit', error);
        }
    }

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl rounded-2xl bg-theme-surface p-10 border-0 text-theme-text shadow-2xl">
                <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-theme-text">
                    {editHabit ? 'Edit Habit' : 'Add Habit'}
                </h2>

                <form
                    onSubmit={handleSubmit}
                    onInvalid={(event) => event.preventDefault()}
                    className="space-y-6"
                    noValidate
                >
                    <div className="flex gap-4">
                        <div className="space-y-2.5">
                            <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-theme-accent/20 bg-theme-surface-2/60 text-2xl transition-colors hover:border-theme-accent/40"
                                    >
                                        {icon}
                                        <div className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-theme-accent border-2 border-theme-bg text-theme-on-accent">
                                            <Plus size={12} strokeWidth={4} />
                                        </div>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 rounded-xl border-theme-accent/20 bg-theme-surface p-3 shadow-xl"
                                    align="start"
                                >
                                    <p className="mb-2 text-xs font-medium text-theme-accent-soft">
                                        Choose an icon
                                    </p>
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {ICONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    setIcon(emoji);
                                                    setIconPickerOpen(false);
                                                }}
                                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                                                    icon === emoji
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
                                            value={icon}
                                            onChange={(e) => setIcon(e.target.value)}
                                            placeholder="✨"
                                            maxLength={5}
                                            className="h-8 w-14 text-center text-lg px-0 rounded-lg border-theme-accent/40 bg-theme-surface-2/60 focus:border-theme-accent text-theme-text"
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex-1 space-y-2.5">
                            <Input
                                id="habit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Drink Water, Morning Run, Read..."
                                aria-required="true"
                                maxLength={100}
                                className="h-12 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text caret-theme-accent placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-theme-accent/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <Label htmlFor="habit-description" className="text-sm font-medium text-theme-text">
                            Description
                        </Label>
                        <textarea
                            id="habit-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            placeholder="What does this habit mean to you?"
                            className="w-full resize-none rounded-2xl border border-theme-accent/20 bg-theme-surface-2/60 px-3 py-3 text-sm text-theme-text outline-none placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-3 focus:ring-theme-accent/20"
                        />
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-sm font-medium text-theme-text">
                            Goal <span className="font-normal text-theme-text-muted">(optional)</span>
                        </Label>
                        <div className="flex gap-3">
                            <Input
                                type="number"
                                min={1}
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                placeholder="8"
                                className="h-12 w-24 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text caret-theme-accent placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-theme-accent/20"
                            />
                            <Input
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="glasses, min, pages…"
                                maxLength={50}
                                className="h-12 flex-1 rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text caret-theme-accent placeholder:text-theme-text-muted focus:border-theme-accent focus:ring-theme-accent/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-sm font-medium text-theme-text">Frequency</Label>
                        <Select value={frequency} onValueChange={setFrequency}>
                            <SelectTrigger className="!h-12 w-full rounded-2xl border-theme-accent/20 bg-theme-surface-2/60 text-theme-text focus:ring-theme-accent/20 [&>svg]:opacity-50 [&>svg]:text-theme-text">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} className="rounded-xl border-theme-accent/20 bg-theme-surface w-[var(--radix-select-trigger-width)] z-[100]">
                                {FREQUENCIES.map((f) => (
                                    <SelectItem
                                        key={f}
                                        value={f}
                                        className="capitalize text-theme-text focus:!bg-theme-accent/40 focus:!text-theme-text data-[state=checked]:text-theme-text cursor-pointer [&_*]:!text-theme-text"
                                    >
                                        {f}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {frequency === 'Custom' && (
                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium text-theme-text">Specific Days</Label>
                            <div className="flex gap-2">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => {
                                            setCustomDays(prev =>
                                                prev.includes(day.value)
                                                    ? prev.filter(d => d !== day.value)
                                                    : [...prev, day.value]
                                            )
                                        }}
                                        className={`flex-1 h-10 rounded-xl text-sm font-medium transition-all ${
                                            customDays.includes(day.value)
                                                ? 'bg-theme-accent text-theme-on-accent shadow-md shadow-theme-accent/30'
                                                : 'bg-theme-surface-2/60 text-theme-text-soft hover:bg-theme-surface-2'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {formError ? (
                        <p className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                            {formError}
                        </p>
                    ) : null}

                    <Button
                        type="submit"
                        className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-theme-accent to-theme-accent-strong text-base font-semibold text-theme-text shadow-lg shadow-theme-accent/25 transition-all hover:from-theme-accent-strong hover:to-theme-accent-strong hover:shadow-theme-accent/40"
                    >
                        <Plus size={18} className="mr-2" />
                        {editHabit ? 'Update habit' : 'Add habit'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
        <PlanLimitDialog
            open={Boolean(limitPrompt)}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    setLimitPrompt(null);
                }
            }}
            title={limitPrompt?.title}
            message={limitPrompt?.message}
        />
        </>
    );
}

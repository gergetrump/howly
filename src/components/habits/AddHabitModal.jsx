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
import { useAuth } from '@/context/authContext';
import { createHabit, updateHabit } from '@/services/habitService';

const ICONS = [
  '🎯', '💧', '🏃', '📖', '🧘', '🥗',
  '💪', '💃', '✍️', '🗣️', '🎵', '🧠',
  '🚴', '🍎', '😴', '🧹', '💻', '💸',
];

const UNITS = ['L', 'ml', 'min', 'hours', 'km', 'steps', 'times', 'pages', 'Custom'];

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

export function AddHabitModal({ open, onOpenChange, onHabitAdded, editHabit, prefill, existingHabits = [] }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('🎯');
    const [target, setTarget] = useState('1');
    const [unit, setUnit] = useState('');
    const [customUnit, setCustomUnit] = useState('');
    const [frequency, setFrequency] = useState('');
    const [customDays, setCustomDays] = useState([]);
    const [goal, setGoal] = useState(null);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [formError, setFormError] = useState('');
    const [limitPrompt, setLimitPrompt] = useState(null);
    const isFreeUser = user?.isPremium !== true && user?.role !== 'admin';

    useEffect(() => {
        if (open && editHabit) {
            setName(editHabit.title || '');
            setDescription(editHabit.description || '');
            setTarget(String(editHabit.target || 1));
            setGoal(editHabit.goal ?? null);
            setIcon(editHabit.icon || '🎯');
            setFrequency(editHabit.frequency || '');
            setCustomDays(editHabit.customDays || []);
            setFormError('');

            if (UNITS.includes(editHabit.unit)) {
                setUnit(editHabit.unit);
                setCustomUnit('');
            } else if (editHabit.unit) {
                setUnit('Custom');
                setCustomUnit(editHabit.unit);
            } else {
                setUnit('');
            }
        } else if (open && prefill) {
            setName(prefill.title || '');
            setDescription(prefill.description || '');
            setTarget('1');
            setGoal(prefill.goal ?? null);
            setUnit('');
            setCustomUnit('');
            setFrequency(prefill.frequency || '');
            setCustomDays([]);
            setFormError('');
            setIcon(prefill.icon || '🎯');
        } else if (open && !editHabit) {
            setName('');
            setDescription('');
            setGoal(null);
            setTarget('1');
            setUnit('');
            setCustomUnit('');
            setFrequency('');
            setCustomDays([]);
            setIcon('🎯');
            setFormError('');
        }
    }, [open, editHabit, prefill]);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!name.trim() || !frequency) return;
        if (frequency === 'Custom' && customDays.length === 0) return;

        const finalUnit = unit === 'Custom' ? customUnit : unit;

        const data = {
            title: name,
            description: description.trim(),
            type: 'numeric',
            target: Number(target) || 1,
            unit: finalUnit,
            frequency,
            customDays,
            icon,
            goal: goal ?? null,
        };

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
            <DialogContent className="sm:max-w-xl rounded-2xl bg-[#1e1b3a] p-10 border-0 text-white shadow-2xl">
                <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-white">
                    {editHabit ? 'Edit Habit' : 'Add Habit'}
                </h2>
                {formError ? (
                    <p className="mb-4 rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {formError}
                    </p>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex gap-4">
                        <div className="space-y-2.5">
                            <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-[#2d2b55]/60 text-2xl transition-colors hover:border-purple-500/40"
                                    >
                                        {icon}
                                        <div className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 border-2 border-[#1e1b3a] text-white">
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
                                                    setIcon(emoji);
                                                    setIconPickerOpen(false);
                                                }}
                                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                                                    icon === emoji
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
                                            value={icon}
                                            onChange={(e) => setIcon(e.target.value)}
                                            placeholder="✨"
                                            maxLength={5}
                                            className="h-8 w-14 text-center text-lg px-0 rounded-lg border-purple-500/40 bg-[#2d2b55]/60 focus:border-purple-500 text-white"
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
                                required
                                maxLength={100}
                                className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white caret-purple-400 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <Label htmlFor="habit-description" className="text-sm font-medium text-white">
                            Description
                        </Label>
                        <textarea
                            id="habit-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            placeholder="What does this habit mean to you?"
                            className="w-full resize-none rounded-2xl border border-purple-500/20 bg-[#2d2b55]/60 px-3 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-purple-500 focus:ring-3 focus:ring-purple-500/20"
                        />
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
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                className="h-12 w-full rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:border-purple-500 focus:ring-purple-500/20 [color-scheme:dark] [&::-webkit-inner-spin-button]:opacity-50"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium text-white">Unit</Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger className="!h-12 w-full rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:ring-purple-500/20 [&>svg]:opacity-50 [&>svg]:text-white">
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4} className="rounded-xl border-purple-500/20 bg-[#1e1b3a] w-[var(--radix-select-trigger-width)] z-[100]">
                                    {UNITS.map((u) => (
                                        <SelectItem
                                            key={u}
                                            value={u}
                                            className="text-white focus:!bg-purple-600/40 focus:!text-white data-[state=checked]:text-white cursor-pointer [&_*]:!text-white"
                                        >
                                            {u}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {unit === 'Custom' && (
                            <div className="col-span-2 space-y-2.5">
                                <Label className="text-sm font-medium text-white">Custom Unit</Label>
                                <Input
                                    value={customUnit}
                                    onChange={(e) => setCustomUnit(e.target.value)}
                                    placeholder="e.g. push-ups"
                                    required={unit === 'Custom'}
                                    className="h-12 rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:border-purple-500 focus:ring-purple-500/20"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2.5">
                        <Label className="text-sm font-medium text-white">Frequency</Label>
                        <Select value={frequency} onValueChange={setFrequency}>
                            <SelectTrigger className="!h-12 w-full rounded-2xl border-purple-500/20 bg-[#2d2b55]/60 text-white focus:ring-purple-500/20 [&>svg]:opacity-50 [&>svg]:text-white">
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={4} className="rounded-xl border-purple-500/20 bg-[#1e1b3a] w-[var(--radix-select-trigger-width)] z-[100]">
                                {FREQUENCIES.map((f) => (
                                    <SelectItem
                                        key={f}
                                        value={f}
                                        className="capitalize text-white focus:!bg-purple-600/40 focus:!text-white data-[state=checked]:text-white cursor-pointer [&_*]:!text-white"
                                    >
                                        {f}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {frequency === 'Custom' && (
                        <div className="space-y-2.5">
                            <Label className="text-sm font-medium text-white">Specific Days</Label>
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
                                                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                                                : 'bg-[#2d2b55]/60 text-slate-300 hover:bg-[#2d2b55]'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition-all hover:from-purple-700 hover:to-purple-600 hover:shadow-purple-600/40"
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

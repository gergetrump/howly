import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CompanionAvatar } from '@/components/brand/CompanionAvatar';
import { COMPANIONS, DEFAULT_COMPANION_TYPE, getDefaultCompanionName } from '@/constants/companions';
import { selectCompanion } from '@/services/companionService';
import { cn } from '@/lib/utils';

function ChangeCompanionForm({ currentType, currentName, onSaved, onCancel }) {
    const [selectedType, setSelectedType] = useState(currentType ?? DEFAULT_COMPANION_TYPE);
    const [name, setName] = useState(() => currentName || getDefaultCompanionName(currentType ?? DEFAULT_COMPANION_TYPE));
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    function handleSelectType(type) {
        setSelectedType(type);
        setName(getDefaultCompanionName(type));
    }

    async function handleSave() {
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError('Please give your companion a name.');
            return;
        }

        setError('');
        setIsSaving(true);

        try {
            const response = await selectCompanion({ type: selectedType, name: trimmedName });
            onSaved?.(response?.data ?? null);
        } catch (err) {
            setError(err.message || 'Could not change your companion. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
            <div className="mt-4 flex justify-center">
                <CompanionAvatar type={selectedType} size="xl" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
                {COMPANIONS.map((companion) => (
                    <button
                        key={companion.type}
                        type="button"
                        onClick={() => handleSelectType(companion.type)}
                        aria-pressed={selectedType === companion.type}
                        className={cn(
                            'flex flex-col items-center gap-1 rounded-2xl border p-2 transition-all',
                            selectedType === companion.type
                                ? 'border-howly-primary bg-howly-primary/10 ring-2 ring-howly-primary/40'
                                : 'border-slate-600 bg-slate-800/60 hover:border-slate-500',
                        )}
                    >
                        <CompanionAvatar type={companion.type} size="sm" />
                        <span className="text-xs font-medium text-slate-200">{companion.label}</span>
                    </button>
                ))}
            </div>

            <div className="mt-5 space-y-2 text-left">
                <label htmlFor="change-companion-name" className="text-sm font-medium text-slate-200">
                    Name your companion
                </label>
                <input
                    id="change-companion-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={30}
                    placeholder="Howly"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-howly-primary"
                />
            </div>

            {error ? (
                <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-12 w-full rounded-full bg-howly-primary text-base font-semibold text-white shadow-lg shadow-howly-primary/25 hover:opacity-90 disabled:opacity-60"
                >
                    {isSaving ? 'Saving...' : 'Save companion'}
                </Button>
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="h-11 w-full rounded-full text-slate-300 hover:bg-white/5 hover:text-white"
                >
                    Cancel
                </Button>
            </div>
        </>
    );
}

export function ChangeCompanionDialog({ open, onOpenChange, currentType, currentName, onSaved }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-3xl border-0 bg-[#1e1b3a] p-8 text-white shadow-2xl sm:max-w-lg">
                <DialogHeader className="space-y-2 pt-2 text-left">
                    <DialogTitle className="text-2xl font-bold tracking-tight">Change your companion</DialogTitle>
                    <DialogDescription className="text-base text-slate-300">
                        Pick a new buddy and name it — your equipped items stay.
                    </DialogDescription>
                </DialogHeader>

                {open ? (
                    <ChangeCompanionForm
                        currentType={currentType}
                        currentName={currentName}
                        onSaved={onSaved}
                        onCancel={() => onOpenChange(false)}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

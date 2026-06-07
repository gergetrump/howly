import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { ActionButton, CardGrid } from '@/components/common';
import { ChallengeCard } from '@/components/cards/ChallengeCard.jsx';
import { Page, PageSection, Heading } from '@/components/layout';
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
import { useAuth } from '@/context/authContext';
import {
    acceptChallengeInvitation,
    createChallenge,
    getChallengeInvitations,
    getChallenges,
    joinChallenge,
    rejectChallengeInvitation,
} from '@/services/challengeService';
import { getMyHabits } from '@/services/habitService';
import { cn } from '@/lib/utils';

const INITIAL_CHALLENGE_FORM = {
    title: '',
    description: '',
    frequency: 'daily',
    durationDays: 30,
    visibility: 'public',
    habitId: '',
};

const COINS_PER_CHALLENGE_DAY = 5;

function normalizeHabits(response) {
    if (Array.isArray(response)) {
        return response;
    }

    return response?.data ?? [];
}

function getChallengeFromInvitation(invitation) {
    return typeof invitation?.challenge === 'object' ? invitation.challenge : null;
}

function getUserId(user) {
    return user?.id ?? user?._id;
}

function getChallengeReward(challenge) {
    return challenge?.coinReward ?? challenge?.reward ?? 0;
}

function hasPremiumMembership(user) {
    return user?.role === 'admin'
        || user?.isPremium === true
        || user?.premium === true
        || user?.subscriptionTier === 'premium'
        || user?.plan === 'premium';
}

function HabitPickerDialog({
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

                {hasHabits ? (
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {habits.map((habit) => {
                            const isSelected = selectedHabitId === habit.id;

                            return (
                                <button
                                    key={habit.id}
                                    type="button"
                                    onClick={() => onSelectedHabitIdChange(habit.id)}
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
                ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                        No habits available yet.
                    </div>
                )}

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

function CreateChallengeDialog({ open, onOpenChange, onCreate, isSubmitting, habits }) {
    const [form, setForm] = useState(INITIAL_CHALLENGE_FORM);
    const calculatedReward = Number(form.durationDays || 0) * COINS_PER_CHALLENGE_DAY;
    const selectedHabit = habits.find((habit) => habit.id === form.habitId);
    const canSubmit = Boolean(form.title.trim() && selectedHabit && Number(form.durationDays) > 0);

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

        await onCreate({
            ...form,
            habitTitle: selectedHabit.title,
            durationDays: Number(form.durationDays),
        });
    }

    function handleOpenChange(nextOpen) {
        if (!nextOpen) {
            setForm(INITIAL_CHALLENGE_FORM);
        }

        onOpenChange(nextOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xl rounded-2xl border-white/10 bg-[#1e1b3a] text-white">
                <DialogHeader>
                    <DialogTitle>Create challenge</DialogTitle>
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

                        <div className="space-y-2 sm:col-span-2">
                            <Label>Habit</Label>
                            {habits.length > 0 ? (
                                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                                    {habits.map((habit) => {
                                        const isSelected = form.habitId === habit.id;

                                        return (
                                            <button
                                                key={habit.id}
                                                type="button"
                                                onClick={() => updateField('habitId', habit.id)}
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
                            ) : (
                                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                                    No habits available yet.
                                </div>
                            )}
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
                            <Label>Frequency</Label>
                            <Select value={form.frequency} onValueChange={(value) => updateField('frequency', value)}>
                                <SelectTrigger className="h-9 w-full border-white/10 bg-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1e1b3a] text-white">
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
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
                            Create
                        </ActionButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export function ChallengesPage() {
    const { user } = useAuth();
    const [challenges, setChallenges] = useState([]);
    const [invitations, setInvitations] = useState({ incoming: [], outgoing: [] });
    const [habits, setHabits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [habitPickerAction, setHabitPickerAction] = useState(null);
    const [selectedHabitId, setSelectedHabitId] = useState('');
    const [busyAction, setBusyAction] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const userId = getUserId(user);
    const incomingInvitations = invitations.incoming ?? [];
    const hasHabits = habits.length > 0;
    const canCreateChallenges = hasPremiumMembership(user);
    const habitPickerTitle = habitPickerAction?.type === 'accept'
        ? 'Accept invitation'
        : 'Join challenge';

    const visibleChallenges = useMemo(() => challenges.filter(Boolean), [challenges]);

    async function loadChallengeData() {
        setIsLoading(true);
        setError('');

        try {
            const [challengeData, invitationData, habitData] = await Promise.all([
                getChallenges(),
                getChallengeInvitations(),
                getMyHabits({ limit: 100 }),
            ]);

            setChallenges(Array.isArray(challengeData) ? challengeData : []);
            setInvitations(invitationData ?? { incoming: [], outgoing: [] });
            setHabits(normalizeHabits(habitData));
        } catch (loadError) {
            setError(loadError.message || 'Failed to load challenges.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadChallengeData();
        }, 0);

        return () => window.clearTimeout(timerId);
    }, []);

    function openHabitPicker(action) {
        setError('');
        setNotice('');

        if (!hasHabits) {
            setNotice('Create a habit before joining a challenge.');
            return;
        }

        setSelectedHabitId(habits[0]?.id ?? '');
        setHabitPickerAction(action);
    }

    function closeHabitPicker() {
        if (!busyAction) {
            setHabitPickerAction(null);
            setSelectedHabitId('');
        }
    }

    async function handleCreateChallenge(formData) {
        setBusyAction('create');
        setError('');
        setNotice('');

        try {
            await createChallenge(formData);
            setNotice('Challenge created.');
            setIsCreateOpen(false);
            await loadChallengeData();
        } catch (createError) {
            setError(createError.message || 'Failed to create challenge.');
        } finally {
            setBusyAction('');
        }
    }

    async function handleConfirmHabitPicker() {
        if (!habitPickerAction || !selectedHabitId) {
            return;
        }

        setBusyAction(habitPickerAction.type);
        setError('');
        setNotice('');

        try {
            if (habitPickerAction.type === 'accept') {
                await acceptChallengeInvitation(habitPickerAction.invitationId, { habitId: selectedHabitId });
                setNotice('Invitation accepted.');
            } else {
                await joinChallenge(habitPickerAction.challengeId, { habitId: selectedHabitId });
                setNotice('Challenge joined.');
            }

            setHabitPickerAction(null);
            setSelectedHabitId('');
            await loadChallengeData();
        } catch (actionError) {
            setError(actionError.message || 'Challenge action failed.');
        } finally {
            setBusyAction('');
        }
    }

    async function handleRejectInvitation(invitationId) {
        setBusyAction(`reject-${invitationId}`);
        setError('');
        setNotice('');

        try {
            await rejectChallengeInvitation(invitationId);
            setNotice('Invitation rejected.');
            await loadChallengeData();
        } catch (rejectError) {
            setError(rejectError.message || 'Failed to reject invitation.');
        } finally {
            setBusyAction('');
        }
    }

    return (
        <Page theme="forest">
            <Heading title="Challenges" subtitle="Join friendly habit challenges." streakDays={user?.streakCount ?? user?.streak ?? 0} />

            <PageSection
                width="lg"
                align="center"
                title="Active challenges"
                actionLabel={canCreateChallenges ? 'Create challenge' : undefined}
                onAction={() => setIsCreateOpen(true)}
            >
                {error ? (
                    <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                        {error}
                    </div>
                ) : null}
                {notice ? (
                    <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                        {notice}
                    </div>
                ) : null}

                {isLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Loading challenges
                    </div>
                ) : null}

                {!isLoading && incomingInvitations.length > 0 ? (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-white">Invitations</h2>
                        <CardGrid columns={2}>
                            {incomingInvitations.map((invitation) => {
                                const challenge = getChallengeFromInvitation(invitation);

                                return (
                                    <ChallengeCard
                                        key={invitation.id}
                                        title={challenge?.title ?? 'Challenge invitation'}
                                        description={challenge?.description}
                                        habitTitle={challenge?.habitTitle}
                                        status={challenge?.status ?? invitation.status}
                                        visibility={challenge?.visibility}
                                        totalDays={challenge?.durationDays ?? 0}
                                        reward={getChallengeReward(challenge)}
                                        startsAt={challenge?.startsAt}
                                    >
                                        <ActionButton
                                            type="button"
                                            onClick={() => openHabitPicker({ type: 'accept', invitationId: invitation.id })}
                                            disabled={busyAction === 'accept'}
                                        >
                                            <Check className="size-4" aria-hidden="true" />
                                            Accept
                                        </ActionButton>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleRejectInvitation(invitation.id)}
                                            disabled={busyAction === `reject-${invitation.id}`}
                                            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                                        >
                                            {busyAction === `reject-${invitation.id}` ? (
                                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                            ) : (
                                                <X className="size-4" aria-hidden="true" />
                                            )}
                                            Reject
                                        </Button>
                                    </ChallengeCard>
                                );
                            })}
                        </CardGrid>
                    </div>
                ) : null}

                {!isLoading && visibleChallenges.length > 0 ? (
                    <CardGrid columns={2}>
                        {visibleChallenges.map((challenge) => {
                            const isOwnChallenge = userId && challenge.createdBy === userId;
                            const isJoinable = challenge.status !== 'completed' && challenge.status !== 'failed';

                            return (
                                <ChallengeCard
                                    key={challenge.id}
                                    title={challenge.title}
                                    description={challenge.description}
                                    habitTitle={challenge.habitTitle}
                                    status={challenge.status}
                                    visibility={challenge.visibility}
                                    totalDays={challenge.durationDays}
                                    reward={getChallengeReward(challenge)}
                                    startsAt={challenge.startsAt}
                                >
                                    {isOwnChallenge ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled
                                            className="border-white/20 bg-white/10 text-white"
                                        >
                                            Your challenge
                                        </Button>
                                    ) : (
                                        <ActionButton
                                            type="button"
                                            onClick={() => openHabitPicker({ type: 'join', challengeId: challenge.id })}
                                            disabled={!isJoinable || busyAction === 'join'}
                                        >
                                            Join
                                        </ActionButton>
                                    )}
                                </ChallengeCard>
                            );
                        })}
                    </CardGrid>
                ) : null}

                {!isLoading && visibleChallenges.length === 0 && incomingInvitations.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                        No challenges available.
                    </div>
                ) : null}
            </PageSection>

            <CreateChallengeDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onCreate={handleCreateChallenge}
                isSubmitting={busyAction === 'create'}
                habits={habits}
            />

            <HabitPickerDialog
                open={Boolean(habitPickerAction)}
                onOpenChange={closeHabitPicker}
                habits={habits}
                selectedHabitId={selectedHabitId}
                onSelectedHabitIdChange={setSelectedHabitId}
                onConfirm={handleConfirmHabitPicker}
                isSubmitting={busyAction === 'join' || busyAction === 'accept'}
                title={habitPickerTitle}
            />
        </Page>
    );
}

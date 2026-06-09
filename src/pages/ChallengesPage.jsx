import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { ActionButton, CardGrid } from '@/components/common';
import { ChallengeCard } from '@/components/cards/ChallengeCard.jsx';
import { ChallengeFormDialog } from '@/components/cards/ChallengeFormDialog.jsx';
import { ChallengeHabitPickerDialog } from '@/components/cards/ChallengeHabitPickerDialog.jsx';
import { ChallengeInvitationList } from '@/components/cards/ChallengeInvitationList.jsx';
import { Page, PageSection, Heading } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/authContext';
import {
    acceptChallengeInvitation,
    createChallenge,
    getChallengeInvitations,
    getChallenges,
    joinChallenge,
    rejectChallengeInvitation,
    updateChallenge,
} from '@/services/challengeService';
import { getMyHabits } from '@/services/habitService';

const CHALLENGE_TABS = [
    { value: 'active', label: 'Active challenges' },
    { value: 'friends', label: 'Friend challenges' },
    { value: 'public', label: 'Public challenges' },
];

function normalizeHabits(response) {
    if (Array.isArray(response)) {
        return response;
    }

    return response?.data ?? [];
}

function getUserId(user) {
    return user?.id ?? user?._id;
}

function getChallengeReward(challenge) {
    return challenge?.coinReward ?? challenge?.reward ?? 0;
}

function hasPremiumMembership(user) {
    return user?.role === 'admin' || user?.isPremium === true;
}

function canEditChallenge(challenge) {
    return challenge?.startsAt && new Date(challenge.startsAt).getTime() > Date.now();
}

function isUpgradeError(code) {
    return code === 'FREE_ACTIVE_CHALLENGE_LIMIT' || code === 'PREMIUM_REQUIRED';
}

function ChallengeAlert({ error, notice, onUpgrade }) {
    if (error) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
                <span>{error.message}</span>
                {isUpgradeError(error.code) ? (
                    <Button
                        type="button"
                        onClick={onUpgrade}
                        className="bg-white text-slate-950 hover:bg-slate-200"
                    >
                        Upgrade
                    </Button>
                ) : null}
            </div>
        );
    }

    if (notice) {
        return (
            <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {notice}
            </div>
        );
    }

    return null;
}

export function ChallengesPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('active');
    const [challenges, setChallenges] = useState([]);
    const [invitations, setInvitations] = useState({ incoming: [], outgoing: [] });
    const [habits, setHabits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [habitPickerAction, setHabitPickerAction] = useState(null);
    const [selectedHabitId, setSelectedHabitId] = useState('');
    const [busyAction, setBusyAction] = useState('');
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState('');

    const userId = getUserId(user);
    const incomingInvitations = invitations.incoming ?? [];
    const hasHabits = habits.length > 0;
    const canCreateChallenges = hasPremiumMembership(user);
    const currentTabLabel = CHALLENGE_TABS.find((tab) => tab.value === activeTab)?.label ?? 'Challenges';
    const habitPickerTitle = habitPickerAction?.type === 'accept'
        ? 'Accept invitation'
        : 'Join challenge';

    const visibleChallenges = useMemo(() => challenges.filter(Boolean), [challenges]);

    const loadChallengeData = useCallback(async (scope) => {
        setIsLoading(true);
        setError(null);

        try {
            const [challengeData, invitationData, habitData] = await Promise.all([
                getChallenges({ scope }),
                getChallengeInvitations(),
                getMyHabits({ limit: 100 }),
            ]);

            setChallenges(Array.isArray(challengeData) ? challengeData : []);
            setInvitations(invitationData ?? { incoming: [], outgoing: [] });
            setHabits(normalizeHabits(habitData));
        } catch (loadError) {
            setError({ message: loadError.message || 'Failed to load challenges.', code: loadError.code });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadChallengeData(activeTab);
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [activeTab, loadChallengeData]);

    function showActionError(actionError, fallbackMessage) {
        setError({ message: actionError.message || fallbackMessage, code: actionError.code });
    }

    function handleUpgradeClick() {
        setError(null);
        setNotice('Premium checkout will be connected later.');
    }

    function openCreateDialog() {
        setEditingChallenge(null);
        setIsFormOpen(true);
    }

    function openEditDialog(challenge) {
        setEditingChallenge(challenge);
        setIsFormOpen(true);
    }

    function closeFormDialog(nextOpen) {
        setIsFormOpen(nextOpen);

        if (!nextOpen) {
            setEditingChallenge(null);
        }
    }

    function openHabitPicker(action) {
        setError(null);
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

    async function handleSubmitChallenge(formData, challenge) {
        setBusyAction(challenge ? 'edit' : 'create');
        setError(null);
        setNotice('');

        try {
            if (challenge) {
                await updateChallenge(challenge.id, formData);
                setNotice('Challenge updated.');
            } else {
                await createChallenge(formData);
                setNotice('Challenge created.');
            }

            closeFormDialog(false);
            await loadChallengeData(activeTab);
        } catch (submitError) {
            showActionError(submitError, challenge ? 'Failed to update challenge.' : 'Failed to create challenge.');
        } finally {
            setBusyAction('');
        }
    }

    async function handleConfirmHabitPicker() {
        if (!habitPickerAction || !selectedHabitId) {
            return;
        }

        setBusyAction(habitPickerAction.type);
        setError(null);
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
            await loadChallengeData(activeTab);
        } catch (actionError) {
            showActionError(actionError, 'Challenge action failed.');
        } finally {
            setBusyAction('');
        }
    }

    async function handleRejectInvitation(invitationId) {
        setBusyAction(`reject-${invitationId}`);
        setError(null);
        setNotice('');

        try {
            await rejectChallengeInvitation(invitationId);
            setNotice('Invitation rejected.');
            await loadChallengeData(activeTab);
        } catch (rejectError) {
            showActionError(rejectError, 'Failed to reject invitation.');
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
                title={currentTabLabel}
                actionLabel={canCreateChallenges ? 'Create challenge' : undefined}
                onAction={openCreateDialog}
            >
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full border border-white/10 bg-white/10 text-white">
                        {CHALLENGE_TABS.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="text-white/70 data-active:!bg-white/20 data-active:!text-white"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <ChallengeAlert error={error} notice={notice} onUpgrade={handleUpgradeClick} />

                {isLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Loading challenges
                    </div>
                ) : null}

                {!isLoading && activeTab === 'active' && incomingInvitations.length > 0 ? (
                    <ChallengeInvitationList
                        invitations={incomingInvitations}
                        busyAction={busyAction}
                        onAccept={(invitationId) => openHabitPicker({ type: 'accept', invitationId })}
                        onReject={handleRejectInvitation}
                    />
                ) : null}

                {!isLoading && visibleChallenges.length > 0 ? (
                    <CardGrid columns={2}>
                        {visibleChallenges.map((challenge) => {
                            const isOwnChallenge = userId && challenge.createdBy === userId;
                            const isJoinable = challenge.status !== 'completed' && challenge.status !== 'failed';
                            const shouldShowJoin = !isOwnChallenge && activeTab !== 'active';

                            return (
                                <ChallengeCard
                                    key={challenge.id}
                                    title={challenge.title}
                                    description={challenge.description}
                                    habitTitle={challenge.habitTitle}
                                    status={challenge.status}
                                    visibility={challenge.visibility}
                                    participants={challenge.participantCount ?? 0}
                                    totalDays={challenge.durationDays}
                                    reward={getChallengeReward(challenge)}
                                    startsAt={challenge.startsAt}
                                >
                                    {isOwnChallenge ? (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled
                                                className="border-white/20 bg-white/10 text-white"
                                            >
                                                Your challenge
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => openEditDialog(challenge)}
                                                disabled={!canEditChallenge(challenge)}
                                                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                                            >
                                                <Pencil className="size-4" aria-hidden="true" />
                                                Edit
                                            </Button>
                                        </>
                                    ) : null}
                                    {!isOwnChallenge && activeTab === 'active' ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled
                                            className="border-white/20 bg-white/10 text-white"
                                        >
                                            Active
                                        </Button>
                                    ) : null}
                                    {shouldShowJoin ? (
                                        <ActionButton
                                            type="button"
                                            onClick={() => openHabitPicker({ type: 'join', challengeId: challenge.id })}
                                            disabled={!isJoinable || busyAction === 'join'}
                                        >
                                            Join
                                        </ActionButton>
                                    ) : null}
                                </ChallengeCard>
                            );
                        })}
                    </CardGrid>
                ) : null}

                {!isLoading && visibleChallenges.length === 0 && (activeTab !== 'active' || incomingInvitations.length === 0) ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
                        No challenges available.
                    </div>
                ) : null}
            </PageSection>

            <ChallengeFormDialog
                key={editingChallenge?.id ?? 'create'}
                open={isFormOpen}
                onOpenChange={closeFormDialog}
                onSubmit={handleSubmitChallenge}
                isSubmitting={busyAction === 'create' || busyAction === 'edit'}
                habits={habits}
                challenge={editingChallenge}
            />

            <ChallengeHabitPickerDialog
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

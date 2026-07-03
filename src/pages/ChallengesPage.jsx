import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Pencil, UserPlus } from 'lucide-react';
import { ActionButton, CardGrid, PlanLimitDialog } from '@/components/common';
import { ChallengeCard } from '@/components/cards/ChallengeCard.jsx';
import { ChallengeFormDialog } from '@/components/cards/ChallengeFormDialog.jsx';
import { ChallengeInviteDialog } from '@/components/cards/ChallengeInviteDialog.jsx';
import { ChallengeInvitationList } from '@/components/cards/ChallengeInvitationList.jsx';
import { Page, PageSection, Heading } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/authContext';
import {
    acceptChallengeInvitation,
    createChallenge,
    createChallengeInvitation,
    getChallengeInvitations,
    getChallenges,
    joinChallenge,
    rejectChallengeInvitation,
    updateChallenge,
} from '@/services/challengeService';
import { getFriends } from '@/services/socialApi';
import { getCurrentUserPlan } from '@/services/userService';

const CHALLENGE_TABS = [
    { value: 'active', label: 'Active challenges' },
    { value: 'friends', label: 'Friend challenges' },
    { value: 'public', label: 'Public challenges' },
];

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

function isActiveChallenge(challenge) {
    return challenge
        && challenge.status !== 'completed'
        && challenge.status !== 'failed'
        && challenge.endsAt
        && new Date(challenge.endsAt).getTime() > Date.now();
}

function isUpgradeError(code) {
    return code === 'FREE_ACTIVE_CHALLENGE_LIMIT' || code === 'PREMIUM_REQUIRED';
}

function getChallengePremiumPrompt(code) {
    if (code === 'FREE_ACTIVE_CHALLENGE_LIMIT') {
        return 'You reached the free active challenge limit. Upgrade to Premium to join up to 5 active challenges.';
    }

    return 'Creating your own challenges is a Premium feature. Upgrade to create challenges and invite friends.';
}

function isPlanLimitError(code) {
    return code === 'PREMIUM_ACTIVE_CHALLENGE_LIMIT' || code === 'PREMIUM_ACTIVE_CREATED_LIMIT';
}

function isAlreadyJoinedError(code) {
    return code === 'CHALLENGE_ALREADY_JOINED';
}

function getChallengeLimitPrompt(code, backendMessage) {
    if (code === 'PREMIUM_ACTIVE_CREATED_LIMIT') {
        return {
            title: 'Challenge creation limit reached',
            message: backendMessage || 'You reached the active challenge creation limit for your current plan.',
        };
    }

    return {
        title: 'Challenge limit reached',
        message: backendMessage || 'You reached the active challenge limit for your current plan.',
    };
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
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('active');
    const [challenges, setChallenges] = useState([]);
    const [invitations, setInvitations] = useState({ incoming: [], outgoing: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [busyAction, setBusyAction] = useState('');
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState('');
    const [limitPrompt, setLimitPrompt] = useState(null);
    const [inviteChallenge, setInviteChallenge] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selectedFriendIds, setSelectedFriendIds] = useState([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [planInfo, setPlanInfo] = useState(null);

    const userId = getUserId(user);
    const incomingInvitations = invitations.incoming ?? [];
    const canCreateChallenges = hasPremiumMembership(user);
    const isFreeUser = !canCreateChallenges;
    const currentTabLabel = CHALLENGE_TABS.find((tab) => tab.value === activeTab)?.label ?? 'Challenges';

    const visibleChallenges = useMemo(() => challenges.filter(Boolean), [challenges]);

    const loadChallengeData = useCallback(async (scope) => {
        setIsLoading(true);
        setError(null);

        try {
            const [challengeData, invitationData] = await Promise.all([
                getChallenges({ scope }),
                getChallengeInvitations(),
            ]);

            setChallenges(Array.isArray(challengeData) ? challengeData : []);
            setInvitations(invitationData ?? { incoming: [], outgoing: [] });
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
        if (isFreeUser && isUpgradeError(actionError.code)) {
            navigate('/premium', {
                state: {
                    message: getChallengePremiumPrompt(actionError.code),
                    returnTo: '/challenges',
                },
            });
            return;
        }

        if (!isFreeUser && isPlanLimitError(actionError.code)) {
            setLimitPrompt(getChallengeLimitPrompt(actionError.code, actionError.message));
            return;
        }

        if (isAlreadyJoinedError(actionError.code)) {
            setNotice(actionError.message || 'You are already participating in this challenge.');
            return;
        }

        setError({ message: actionError.message || fallbackMessage, code: actionError.code });
    }

    function handleUpgradeClick() {
        setError(null);
        setNotice('');
        navigate('/premium', {
            state: {
                message: getChallengePremiumPrompt(error?.code),
                returnTo: '/challenges',
            },
        });
    }

    async function openCreateDialog() {
        if (isFreeUser) {
            navigate('/premium', {
                state: {
                    message: getChallengePremiumPrompt('PREMIUM_REQUIRED'),
                    returnTo: '/challenges',
                },
            });
            return;
        }

        setError(null);
        setNotice('');
        setBusyAction('create-precheck');

        try {
            const [mineChallenges, latestPlanInfo] = await Promise.all([
                getChallenges({ mine: true }),
                planInfo ? Promise.resolve(planInfo) : getCurrentUserPlan(),
            ]);

            if (!planInfo) {
                setPlanInfo(latestPlanInfo);
            }

            const maxCreatedChallenges = latestPlanInfo?.currentPlan?.limits?.maxActiveCreatedChallenges;
            const activeCreatedCount = Array.isArray(mineChallenges)
                ? mineChallenges.filter(isActiveChallenge).length
                : 0;

            if (maxCreatedChallenges !== undefined && activeCreatedCount >= maxCreatedChallenges) {
                setLimitPrompt(getChallengeLimitPrompt(
                    'PREMIUM_ACTIVE_CREATED_LIMIT',
                    `You can only create ${maxCreatedChallenges} active challenge${maxCreatedChallenges === 1 ? '' : 's'} at a time. Finish your current challenge before creating another one.`
                ));
                return;
            }

            setEditingChallenge(null);
            setIsFormOpen(true);
        } catch (createCheckError) {
            setError({ message: createCheckError.message || 'Could not check challenge limits.' });
        } finally {
            setBusyAction('');
        }
    }

    function openEditDialog(challenge) {
        setEditingChallenge(challenge);
        setIsFormOpen(true);
    }

    async function openInviteDialog(challenge) {
        setInviteChallenge(challenge);
        setSelectedFriendIds([]);
        setInviteError('');
        setIsLoadingFriends(true);

        try {
            const friendData = await getFriends();
            setFriends(friendData ?? []);
        } catch (friendError) {
            setInviteError(friendError.message || 'Failed to load friends.');
        } finally {
            setIsLoadingFriends(false);
        }
    }

    function closeInviteDialog(nextOpen) {
        if (!nextOpen) {
            setInviteChallenge(null);
            setSelectedFriendIds([]);
            setInviteError('');
        }
    }

    function toggleInviteFriendId(friendId) {
        if (!friendId) {
            return;
        }

        setSelectedFriendIds((currentFriendIds) => (
            currentFriendIds.includes(friendId)
                ? currentFriendIds.filter((currentFriendId) => currentFriendId !== friendId)
                : [...currentFriendIds, friendId]
        ));
    }

    function closeFormDialog(nextOpen) {
        setIsFormOpen(nextOpen);

        if (!nextOpen) {
            setEditingChallenge(null);
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

    async function handleJoinChallenge(challengeId) {
        setBusyAction('join');
        setError(null);
        setNotice('');

        try {
            await joinChallenge(challengeId);
            setNotice('Challenge joined.');
            await loadChallengeData(activeTab);
        } catch (actionError) {
            showActionError(actionError, 'Failed to join challenge.');
        } finally {
            setBusyAction('');
        }
    }

    async function handleAcceptInvitation(invitationId) {
        setBusyAction(`accept-${invitationId}`);
        setError(null);
        setNotice('');

        try {
            await acceptChallengeInvitation(invitationId);
            setNotice('Invitation accepted.');
            await loadChallengeData(activeTab);
        } catch (actionError) {
            showActionError(actionError, 'Failed to accept invitation.');
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

    async function handleSendChallengeInvitation() {
        if (!inviteChallenge || selectedFriendIds.length === 0) {
            return;
        }

        setBusyAction('invite');
        setInviteError('');
        setNotice('');
        setError(null);

        try {
            const results = await Promise.allSettled(
                selectedFriendIds.map((friendId) => createChallengeInvitation(inviteChallenge.id, friendId))
            );
            const sentCount = results.filter((result) => result.status === 'fulfilled').length;
            const failedResults = results.filter((result) => result.status === 'rejected');

            if (sentCount > 0) {
                setNotice(sentCount === 1 ? 'Challenge invitation sent.' : `${sentCount} challenge invitations sent.`);
                await loadChallengeData(activeTab);
            }

            if (failedResults.length > 0) {
                setInviteError(
                    failedResults.length === selectedFriendIds.length
                        ? failedResults[0].reason?.message || 'Challenge invitations could not be sent.'
                        : `${sentCount} sent, ${failedResults.length} could not be sent.`
                );
                return;
            }

            closeInviteDialog(false);
        } catch (inviteActionError) {
            setInviteError(inviteActionError.message || 'Challenge invitation could not be sent.');
        } finally {
            setBusyAction('');
        }
    }

    return (
        <Page theme="forest">
            <Heading title="Challenges" subtitle="Join friendly habit challenges." streakDays={user?.streakCount ?? user?.streak ?? 0} />

            <PageSection
                width="full"
                align="center"
                title={currentTabLabel}
                actionLabel="Create challenge"
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
                        onAccept={handleAcceptInvitation}
                        onReject={handleRejectInvitation}
                    />
                ) : null}

                {!isLoading && visibleChallenges.length > 0 ? (
                    <CardGrid columns={2}>
                        {visibleChallenges.map((challenge) => {
                            const isOwnChallenge = userId && challenge.createdBy === userId;
                            const hasJoined = Boolean(challenge.viewerParticipantStatus && challenge.viewerParticipantStatus !== 'left');
                            const isJoinable = challenge.status !== 'completed' && challenge.status !== 'failed';
                            const shouldShowJoin = !isOwnChallenge && !hasJoined && activeTab !== 'active';
                            const shouldShowJoined = !isOwnChallenge && hasJoined && activeTab !== 'active';
                            const editLocked = !canEditChallenge(challenge);

                            return (
                                <ChallengeCard
                                    key={challenge.id}
                                    title={challenge.title}
                                    description={challenge.description}
                                    habitTitle={challenge.habitTitle}
                                    category={challenge.habitTemplate?.category}
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
                                            <span
                                                className="inline-flex"
                                                title={editLocked ? 'Challenge already started' : undefined}
                                            >
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => openEditDialog(challenge)}
                                                    disabled={editLocked}
                                                    className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                                                >
                                                    <Pencil className="size-4" aria-hidden="true" />
                                                    Edit
                                                </Button>
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => openInviteDialog(challenge)}
                                                disabled={busyAction === 'invite'}
                                                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                                            >
                                                <UserPlus className="size-4" aria-hidden="true" />
                                                Invite
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
                                    {shouldShowJoined ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled
                                            className="border-white/20 bg-white/10 text-white"
                                        >
                                            Joined
                                        </Button>
                                    ) : null}
                                    {shouldShowJoin ? (
                                        <ActionButton
                                            type="button"
                                            onClick={() => handleJoinChallenge(challenge.id)}
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
                challenge={editingChallenge}
            />

            <ChallengeInviteDialog
                open={Boolean(inviteChallenge)}
                onOpenChange={closeInviteDialog}
                challenge={inviteChallenge}
                friends={friends}
                selectedFriendIds={selectedFriendIds}
                onToggleFriendId={toggleInviteFriendId}
                onInvite={handleSendChallengeInvitation}
                isLoading={isLoadingFriends}
                isSubmitting={busyAction === 'invite'}
                error={inviteError}
            />

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
        </Page>
    );
}

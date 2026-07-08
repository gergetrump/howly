import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleHelp, Loader2, Pencil, Trophy, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ActionButton, CardGrid, PlanLimitDialog } from '@/components/common';
import { ChallengeCategoryChips } from '@/components/challenges/ChallengeCategoryChips.jsx';
import { ChallengeCard } from '@/components/cards/ChallengeCard.jsx';
import { ChallengeFormDialog } from '@/components/cards/ChallengeFormDialog.jsx';
import { ChallengeInviteDialog } from '@/components/cards/ChallengeInviteDialog.jsx';
import { ChallengeInvitationList } from '@/components/cards/ChallengeInvitationList.jsx';
import { Page, PageSection, Heading } from '@/components/layout';
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
import { NotificationBanner } from '@/components/ui/notification-banner.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/authContext';
import {
    acceptChallengeInvitation,
    claimChallengeReward,
    createChallenge,
    createChallengeInvitation,
    getChallengeInvitations,
    getChallenges,
    joinChallenge,
    leaveChallenge,
    rejectChallengeInvitation,
    updateChallenge,
} from '@/services/challengeService';
import { getFriends } from '@/services/socialApi';
import { getCurrentUserPlan } from '@/services/userService';
import { getTaxonomyCategories } from '@/services/taxonomyService';

const CHALLENGE_TABS = [
    { value: 'active', label: 'Active Challenges' },
    { value: 'friends', label: 'Friend Challenges' },
    { value: 'public', label: 'Public Challenges' },
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

function isRewardAvailable(challenge) {
    return challenge?.status === 'completed' || new Date(challenge?.endsAt ?? 0).getTime() <= Date.now();
}

function isActiveChallenge(challenge) {
    return challenge
        && challenge.status !== 'completed'
        && challenge.status !== 'failed'
        && challenge.endsAt
        && new Date(challenge.endsAt).getTime() > Date.now();
}

function getInvitationChallengeId(invitation) {
    return typeof invitation?.challenge === 'object'
        ? invitation.challenge?.id
        : invitation?.challenge;
}

function isChallengeNotificationAvailable(notificationJump, { challenges = [], invitations = { incoming: [], outgoing: [] } } = {}) {
    const challengeId = notificationJump?.challengeId ?? notificationJump?.metadata?.challengeId;
    const invitationId = notificationJump?.invitationId;
    const allInvitations = [
        ...(invitations.incoming ?? []),
        ...(invitations.outgoing ?? []),
    ];

    return Boolean(
        (challengeId && challenges.some((challenge) => challenge?.id === challengeId))
        || (invitationId && allInvitations.some((invitation) => invitation.id === invitationId))
        || (challengeId && allInvitations.some((invitation) => getInvitationChallengeId(invitation) === challengeId))
    );
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme-danger/30 bg-theme-danger/10 p-4 text-sm text-theme-danger">
                <span>{error.message}</span>
                {isUpgradeError(error.code) ? (
                    <Button
                        type="button"
                        onClick={onUpgrade}
                        className="bg-theme-invert text-theme-invert-text hover:bg-theme-invert/85"
                    >
                        Upgrade
                    </Button>
                ) : null}
            </div>
        );
    }

    if (notice) {
        return (
            <div className="rounded-xl border border-theme-success/30 bg-theme-success/10 p-4 text-sm text-theme-success">
                {notice}
            </div>
        );
    }

    return null;
}

function ChallengeInfoPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-full border border-theme-text/10 bg-theme-surface text-theme-text transition hover:bg-theme-text/20 hover:text-theme-text"
                    aria-label="How do challenges work?"
                >
                    <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                className="z-[120] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-theme-text/10 bg-theme-bg/95 p-4 text-left text-xs leading-snug text-theme-text shadow-xl shadow-theme-bg/30"
            >
                <p className="text-sm font-bold text-theme-text">How Challenges Work</p>
                <div className="mt-3 space-y-3">
                    <div>
                        <p className="font-semibold text-theme-accent-soft">Find or Get Invited</p>
                        <p>Public Challenges can be found by everyone. Friend Challenges are visible to friends. Direct invitations always work, even for private Challenges.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-theme-accent-soft">Join and Track</p>
                        <p>After joining, the Challenge adds its Habit to your dashboard. Completing that Habit counts as progress for the Challenge.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-theme-accent-soft">Progress and Rewards</p>
                        <p>Each completed Challenge day increases your progress. When the Challenge is over, you can claim Coins if you completed at least one day.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-theme-accent-soft">Leaving</p>
                        <p>Leaving removes the Challenge from your active limit, but you will not receive its reward later.</p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function ChallengesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('active');
    const [challenges, setChallenges] = useState([]);
    const [invitations, setInvitations] = useState({ incoming: [], outgoing: [] });
    const [pendingNotificationJump, setPendingNotificationJump] = useState(() => (
        location.state?.notificationJump?.type === 'challenge_invitation_received'
            ? location.state.notificationJump
            : null
    ));
    const [banner, setBanner] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [busyAction, setBusyAction] = useState('');
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState('');
    const [limitPrompt, setLimitPrompt] = useState(null);
    const [leaveConfirmChallenge, setLeaveConfirmChallenge] = useState(null);
    const [inviteChallenge, setInviteChallenge] = useState(null);
    const [friends, setFriends] = useState([]);
    const [selectedFriendIds, setSelectedFriendIds] = useState([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [planInfo, setPlanInfo] = useState(null);
    const [taxonomyCategories, setTaxonomyCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const hasInitializedCategoryFromUrl = useRef(false);

    const userId = getUserId(user);
    const incomingInvitations = invitations.incoming ?? [];
    const canCreateChallenges = hasPremiumMembership(user);
    const isFreeUser = !canCreateChallenges;
    const currentTabLabel = CHALLENGE_TABS.find((tab) => tab.value === activeTab)?.label ?? 'Challenges';

    const categoryOptions = useMemo(() => ([
        { label: 'All', value: 'all' },
        ...taxonomyCategories.map((category) => ({
            label: category.label,
            value: category.key,
        })),
    ]), [taxonomyCategories]);

    const categoryLabelByKey = useMemo(
        () => new Map(taxonomyCategories.map((category) => [category.key, category.label])),
        [taxonomyCategories],
    );

    const selectedCategoryLabel = selectedCategory === 'all'
        ? 'All'
        : (categoryLabelByKey.get(selectedCategory) ?? selectedCategory);

    const visibleChallenges = useMemo(() => challenges.filter(Boolean), [challenges]);

    const loadChallengeData = useCallback(async (
        scope,
        { categoryKey = 'all', showLoading = true, showError = true } = {},
    ) => {
        if (showLoading) {
            setIsLoading(true);
        }
        if (showError) {
            setError(null);
        }

        try {
            const challengeParams = { scope };

            if (scope === 'public' && categoryKey !== 'all') {
                challengeParams.categoryKey = categoryKey;
            }

            const [challengeData, invitationData] = await Promise.all([
                getChallenges(challengeParams),
                getChallengeInvitations(),
            ]);

            const nextChallenges = Array.isArray(challengeData) ? challengeData : [];
            const nextInvitations = invitationData ?? { incoming: [], outgoing: [] };

            setChallenges(nextChallenges);
            setInvitations(nextInvitations);

            return { challenges: nextChallenges, invitations: nextInvitations };
        } catch (loadError) {
            if (showError) {
                setError({ message: loadError.message || 'Failed to load challenges.', code: loadError.code });
            }
            return null;
        } finally {
            if (showLoading) {
                setIsLoading(false);
            }
        }
    }, []);

    const refreshCurrentChallenges = useCallback((options = {}) => (
        loadChallengeData(activeTab, {
            categoryKey: activeTab === 'public' ? selectedCategory : 'all',
            ...options,
        })
    ), [activeTab, loadChallengeData, selectedCategory]);

    useEffect(() => {
        let isCancelled = false;

        async function loadTaxonomyCategories() {
            try {
                const categories = await getTaxonomyCategories();
                if (!isCancelled) {
                    setTaxonomyCategories(Array.isArray(categories) ? categories : []);
                }
            } catch {
                if (!isCancelled) {
                    setTaxonomyCategories([]);
                }
            }
        }

        loadTaxonomyCategories();

        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!taxonomyCategories.length || hasInitializedCategoryFromUrl.current) {
            return;
        }

        const requestedCategory = searchParams.get('category');

        if (requestedCategory && taxonomyCategories.some((category) => category.key === requestedCategory)) {
            setSelectedCategory(requestedCategory);
        }

        hasInitializedCategoryFromUrl.current = true;
    }, [searchParams, taxonomyCategories]);

    function handleCategoryChange(nextCategory) {
        setSelectedCategory(nextCategory);

        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);

            if (nextCategory === 'all') {
                nextParams.delete('category');
            } else {
                nextParams.set('category', nextCategory);
            }

            return nextParams;
        }, { replace: true });
    }

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadChallengeData(activeTab, {
                categoryKey: activeTab === 'public' ? selectedCategory : 'all',
            });
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [activeTab, selectedCategory, loadChallengeData]);

    useEffect(() => {
        const nextJump = location.state?.notificationJump;

        if (nextJump?.type !== 'challenge_invitation_received') {
            return undefined;
        }

        const timerId = window.setTimeout(() => {
            setPendingNotificationJump(nextJump);
            setActiveTab('active');
            navigate('/challenges', { replace: true, state: null });
        }, 0);

        return () => window.clearTimeout(timerId);
    }, [location.state, navigate]);

    useEffect(() => {
        if (!pendingNotificationJump) {
            return undefined;
        }

        let isCancelled = false;

        async function validateNotificationJump() {
            setActiveTab('active');

            const latestData = await loadChallengeData('active', {
                showLoading: false,
                showError: false,
            });

            if (isCancelled) {
                return;
            }

            if (latestData && !isChallengeNotificationAvailable(pendingNotificationJump, latestData)) {
                setBanner({
                    variant: 'unavailable',
                    eyebrow: 'Notification link unavailable',
                    title: 'Challenge not found',
                });
            }

            setPendingNotificationJump(null);
        }

        validateNotificationJump();

        return () => {
            isCancelled = true;
        };
    }, [loadChallengeData, pendingNotificationJump]);

    useEffect(() => {
        function refreshChallengeData() {
            refreshCurrentChallenges({ showLoading: false, showError: false });
        }

        window.addEventListener('howly:notifications-updated', refreshChallengeData);

        return () => {
            window.removeEventListener('howly:notifications-updated', refreshChallengeData);
        };
    }, [refreshCurrentChallenges]);

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
            toast(actionError.message || 'You are already participating in this challenge.');
            return;
        }

        toast.error(actionError.message || fallbackMessage);
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
                toast.success('Your challenge has been updated.');
            } else {
                await createChallenge(formData);
                toast.success('Your challenge has been created.');
            }

            closeFormDialog(false);
            await refreshCurrentChallenges();
        } catch (submitError) {
            showActionError(submitError, challenge ? "We couldn't update your challenge. Please try again." : "We couldn't create your challenge. Please try again.");
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
            toast.success("You've joined the challenge.");
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, "We couldn't join the challenge. Please try again.");
        } finally {
            setBusyAction('');
        }
    }

    async function handleLeaveChallenge(challengeId) {
        setBusyAction(`leave-${challengeId}`);
        setError(null);
        setNotice('');

        try {
            await leaveChallenge(challengeId);
            toast.success("You've left the challenge.");
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, "We couldn't leave the challenge. Please try again.");
        } finally {
            setBusyAction('');
        }
    }

    async function handleClaimReward(challengeId) {
        setBusyAction(`reward-${challengeId}`);
        setError(null);
        setNotice('');

        try {
            const result = await claimChallengeReward(challengeId);
            toast.success(`You claimed your reward of ${result.rewardCoins ?? 0} coins.`);
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, actionError.message || "We couldn't claim your reward. Please try again.");
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
            toast.success("You've accepted the invitation.");
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, "We couldn't accept the invitation. Please try again.");
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
            toast.success("You've declined the invitation.");
            await refreshCurrentChallenges();
        } catch (rejectError) {
            showActionError(rejectError, "We couldn't decline the invitation. Please try again.");
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
                toast.success(sentCount === 1 ? 'Your invitation has been sent.' : `All ${sentCount} invitations have been sent.`);
                await refreshCurrentChallenges();
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

            {banner && (
                <div className="fixed right-6 top-24 z-[9999] w-[min(92vw,24rem)]">
                    <NotificationBanner
                        variant={banner.variant}
                        eyebrow={banner.eyebrow}
                        title={banner.title}
                        icon={<Trophy className="size-5" aria-hidden="true" />}
                        onClose={() => setBanner(null)}
                        autoCloseMs={6000}
                        className="px-4 py-3"
                    />
                </div>
            )}

            <PageSection
                width="full"
                align="center"
                title={currentTabLabel}
                actionLabel="Create Challenge"
                onAction={openCreateDialog}
                titleAction={<ChallengeInfoPopover />}
            >
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full border border-theme-text/10 bg-theme-surface text-theme-text">
                        {CHALLENGE_TABS.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="!text-theme-text-soft data-active:!bg-theme-text/20 data-active:!text-theme-text"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {activeTab === 'public' && categoryOptions.length > 1 ? (
                    <ChallengeCategoryChips
                        options={categoryOptions}
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        disabled={isLoading}
                    />
                ) : null}

                <ChallengeAlert error={error} notice={notice} onUpgrade={handleUpgradeClick} />

                {isLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4 text-sm text-theme-text">
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
                            const shouldShowLeave = hasJoined && isJoinable;
                            const rewardAvailable = hasJoined && isRewardAvailable(challenge);
                            const rewardClaimed = Boolean(challenge.viewerParticipantRewardClaimed);
                            const completedDays = challenge.viewerParticipantDaysCompleted ?? 0;
                            const editLocked = !canEditChallenge(challenge);

                            const categoryLabel = categoryLabelByKey.get(challenge.taxonomy?.categoryKey)
                                ?? challenge.habitTemplate?.category;

                            return (
                                <ChallengeCard
                                    key={challenge.id}
                                    title={challenge.title}
                                    description={challenge.description}
                                    habitTitle={challenge.habitTitle}
                                    category={categoryLabel}
                                    recommendationReason={challenge.recommendationReason}
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
                                                className="border-theme-text/20 bg-theme-text/10 text-theme-text"
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
                                                    className="border-theme-text/20 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
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
                                                className="border-theme-text/20 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
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
                                            className="border-theme-text/20 bg-theme-text/10 text-theme-text"
                                        >
                                            Active
                                        </Button>
                                    ) : null}
                                    {shouldShowJoined ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled
                                            className="border-theme-text/20 bg-theme-text/10 text-theme-text"
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
                                    {shouldShowLeave ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setLeaveConfirmChallenge(challenge)}
                                            disabled={busyAction === `leave-${challenge.id}`}
                                            className="border-theme-danger/30 bg-theme-danger/10 text-theme-danger hover:bg-theme-danger/20"
                                        >
                                            Leave
                                        </Button>
                                    ) : null}
                                    {rewardAvailable && !rewardClaimed && completedDays >= 1 ? (
                                        <ActionButton
                                            type="button"
                                            onClick={() => handleClaimReward(challenge.id)}
                                            disabled={busyAction === `reward-${challenge.id}`}
                                        >
                                            Claim {challenge.viewerParticipantPendingRewardCoins ?? 0} coins
                                        </ActionButton>
                                    ) : null}
                                    {rewardAvailable && !rewardClaimed && completedDays < 1 ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled
                                            title="You need to complete at least one challenge day to receive a reward."
                                            className="border-theme-text/20 bg-theme-text/10 text-theme-text-soft"
                                        >
                                            No reward: 0 days
                                        </Button>
                                    ) : null}
                                    {rewardAvailable && rewardClaimed ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled
                                            className="border-theme-success/30 bg-theme-success/10 text-theme-success"
                                        >
                                            Claimed {challenge.viewerParticipantRewardCoins ?? 0} coins
                                        </Button>
                                    ) : null}
                                </ChallengeCard>
                            );
                        })}
                    </CardGrid>
                ) : null}

                {!isLoading && visibleChallenges.length === 0 && (activeTab !== 'active' || incomingInvitations.length === 0) ? (
                    <div className="rounded-xl border border-theme-text/10 bg-theme-text/5 p-6 text-center text-sm text-theme-text-soft">
                        {activeTab === 'public' && selectedCategory !== 'all'
                            ? `No public ${selectedCategoryLabel} challenges yet.`
                            : 'No challenges available.'}
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

            <ConfirmationDialog
                open={Boolean(leaveConfirmChallenge)}
                onOpenChange={(open) => { if (!open) setLeaveConfirmChallenge(null); }}
            >
                <ConfirmationDialogContent>
                    <ConfirmationDialogHeader className="space-y-3 text-center">
                        <ConfirmationDialogTitle className="text-xl font-bold">
                            Leave this challenge?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="text-sm text-theme-text-soft">
                            Are you sure you want to leave “{leaveConfirmChallenge?.title}”?
                        </ConfirmationDialogDescription>
                    </ConfirmationDialogHeader>
                    <ConfirmationDialogFooter className="mt-4 gap-3">
                        <ConfirmationDialogCancel className="border-theme-text/15 bg-theme-text/10 text-theme-text hover:bg-theme-text/20 hover:text-theme-text">
                            Cancel
                        </ConfirmationDialogCancel>
                        <ConfirmationDialogAction
                            className="bg-theme-danger text-white hover:bg-theme-danger/90"
                            onClick={() => { if (leaveConfirmChallenge) handleLeaveChallenge(leaveConfirmChallenge.id); }}
                        >
                            Leave challenge
                        </ConfirmationDialogAction>
                    </ConfirmationDialogFooter>
                </ConfirmationDialogContent>
            </ConfirmationDialog>
        </Page>
    );
}

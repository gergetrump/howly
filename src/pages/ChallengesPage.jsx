import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, CircleHelp, Loader2, Pencil, Trophy, TriangleAlert, UserPlus, UsersRound } from 'lucide-react';
import { ActionButton, CardGrid, PlanLimitDialog } from '@/components/common';
import { ChallengeCategoryChips } from '@/components/challenges/ChallengeCategoryChips.jsx';
import { appTabsListFullWidthClassName, appTabsTriggerClassName } from '@/components/cards/cardStyles';
import { ChallengeCard } from '@/components/cards/ChallengeCard.jsx';
import { ChallengeFormDialog } from '@/components/cards/ChallengeFormDialog.jsx';
import { ChallengeInviteDialog } from '@/components/cards/ChallengeInviteDialog.jsx';
import { ChallengeInvitationList } from '@/components/cards/ChallengeInvitationList.jsx';
import { Page, PageSection, Heading } from '@/components/layout';
import { UserAvatar } from '@/components/social/UserProfileTrigger.jsx';
import { UserPreviewDialog } from '@/components/social/UserPreviewDialog.jsx';
import {
    getDisplayName,
    getSocialErrorMessage,
    getUsername,
    hasUserBlockedMe,
    isBlockedByRelationship,
    isUserBlockedByMe,
    sameId,
} from '@/components/social/socialHelpers.js';
import { Button } from '@/components/ui/button';
import { NotificationBanner } from '@/components/ui/notification-banner.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/context/authContext';
import {
    acceptChallengeInvitation,
    claimChallengeReward,
    createChallenge,
    createChallengeInvitation,
    deleteChallenge,
    getChallengeParticipants,
    getChallengeInvitations,
    getChallenges,
    joinChallenge,
    leaveChallenge,
    rejectChallengeInvitation,
    updateChallenge,
    waitForChallengeTaxonomy,
} from '@/services/challengeService';
import {
    acceptFriendRequest,
    blockUser,
    getBlockedUsers,
    getBlockers,
    getFriendRequests,
    getFriends,
    sendFriendRequest,
    unblockUser,
} from '@/services/socialApi';
import { getCurrentUserPlan } from '@/services/userService';
import { getTaxonomyCategories } from '@/services/taxonomyService';

const CHALLENGE_TABS = [
    { value: 'active', label: 'Active Challenges' },
    { value: 'friends', label: 'Friend Challenges' },
    { value: 'public', label: 'Public Challenges' },
    { value: 'past', label: 'Past Challenges' },
];
const CHALLENGE_TAB_VALUES = new Set(CHALLENGE_TABS.map((tab) => tab.value));
const CHALLENGE_PAGE_SIZE = 20;
const PAST_CHALLENGE_STATUSES = new Set(['completed', 'failed']);

function getUserId(user) {
    return user?.id ?? user?._id;
}

function getParticipantUser(participant) {
    return typeof participant?.user === 'object' && participant.user
        ? participant.user
        : null;
}

function normalizeListPage(response) {
    if (Array.isArray(response)) {
        return response;
    }

    return response?.items ?? [];
}

function normalizeFriendRequestsResponse(requestsResponse) {
    return {
        incoming: normalizeListPage(requestsResponse?.incoming ?? []),
        outgoing: normalizeListPage(requestsResponse?.outgoing ?? []),
    };
}

function normalizeChallengePage(response) {
    if (Array.isArray(response)) {
        return {
            items: response,
            hasMore: false,
            nextOffset: response.length,
        };
    }

    return {
        items: response?.items ?? [],
        hasMore: response?.hasMore === true,
        nextOffset: Number.isInteger(response?.nextOffset)
            ? response.nextOffset
            : (response?.items?.length ?? 0),
    };
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

function isPastChallengeStatus(status) {
    return PAST_CHALLENGE_STATUSES.has(status);
}

function isActiveChallenge(challenge) {
    return challenge
        && !isPastChallengeStatus(challenge.status)
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

function ChallengeAlert({ error, onUpgrade }) {
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

function ChallengeParticipantsBadge({
    challenge,
    participants = [],
    isLoading = false,
    error = '',
    onLoad,
    onOpenProfile,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const closeTimerRef = useRef(null);
    const participantCount = challenge?.participantCount ?? 0;
    const participantUsers = participants.map(getParticipantUser).filter(Boolean);

    function clearCloseTimer() {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }

    function openParticipants() {
        clearCloseTimer();
        setIsOpen(true);
        onLoad?.(challenge?.id);
    }

    function scheduleClose() {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, 120);
    }

    useEffect(() => () => {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
        }
    }, []);

    return (
        <Popover
            open={isOpen}
            onOpenChange={(nextOpen) => {
                setIsOpen(nextOpen);

                if (nextOpen) {
                    onLoad?.(challenge?.id);
                }
            }}
        >
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-6 items-center gap-1 rounded-full border border-theme-text/15 bg-theme-text/10 px-2.5 py-0.5 text-xs font-semibold text-theme-text transition hover:bg-theme-text/15"
                    onMouseEnter={openParticipants}
                    onMouseLeave={scheduleClose}
                    onFocus={openParticipants}
                    onBlur={scheduleClose}
                >
                    <UsersRound className="size-3" aria-hidden="true" />
                    {participantCount} joined
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                onOpenAutoFocus={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => event.preventDefault()}
                onMouseEnter={openParticipants}
                onMouseLeave={scheduleClose}
                className="z-[130] w-64 rounded-xl border border-theme-text/10 bg-theme-surface p-2 text-theme-text shadow-xl shadow-theme-bg/30"
            >
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                    Joined users
                </p>
                {isLoading ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-sm text-theme-text-soft">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Loading users
                    </div>
                ) : error ? (
                    <p className="px-2 py-3 text-sm text-theme-danger">{error}</p>
                ) : participantUsers.length > 0 ? (
                    <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                        {participantUsers.map((participantUser) => (
                            <button
                                key={participantUser.id ?? participantUser._id}
                                type="button"
                                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-theme-text/10"
                                onClick={() => {
                                    setIsOpen(false);
                                    onOpenProfile?.(participantUser);
                                }}
                            >
                                <UserAvatar user={participantUser} className="size-9" />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-theme-text">
                                        {getDisplayName(participantUser)}
                                    </span>
                                    <span className="block truncate text-xs text-theme-text-soft">
                                        @{getUsername(participantUser)}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="px-2 py-3 text-sm text-theme-text-soft">No joined users yet.</p>
                )}
            </PopoverContent>
        </Popover>
    );
}

function readTabFromSearchParams(searchParams) {
    const requestedTab = searchParams.get('tab');
    return requestedTab && CHALLENGE_TAB_VALUES.has(requestedTab) ? requestedTab : 'active';
}

export function ChallengesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(() => readTabFromSearchParams(searchParams));
    const [challenges, setChallenges] = useState([]);
    const [hasMoreChallenges, setHasMoreChallenges] = useState(false);
    const [isLoadingMoreChallenges, setIsLoadingMoreChallenges] = useState(false);
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
    const [limitPrompt, setLimitPrompt] = useState(null);
    const [inviteChallenge, setInviteChallenge] = useState(null);
    const [pendingLeaveChallenge, setPendingLeaveChallenge] = useState(null);
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockers, setBlockers] = useState([]);
    const [selectedProfileUser, setSelectedProfileUser] = useState(null);
    const [isProfileActionBusy, setIsProfileActionBusy] = useState(false);
    const [participantsByChallengeId, setParticipantsByChallengeId] = useState({});
    const [participantLoadingByChallengeId, setParticipantLoadingByChallengeId] = useState({});
    const [participantErrorsByChallengeId, setParticipantErrorsByChallengeId] = useState({});
    const [selectedFriendIds, setSelectedFriendIds] = useState([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [planInfo, setPlanInfo] = useState(null);
    const [taxonomyCategories, setTaxonomyCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const hasInitializedCategoryFromUrl = useRef(false);
    const challengesLoadedCountRef = useRef(CHALLENGE_PAGE_SIZE);

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
            const challengeParams = {
                scope,
                limit: CHALLENGE_PAGE_SIZE,
                offset: 0,
            };

            if (scope === 'public' && categoryKey !== 'all') {
                challengeParams.categoryKey = categoryKey;
            }

            const [challengeData, invitationData] = await Promise.all([
                getChallenges(challengeParams),
                getChallengeInvitations(),
            ]);

            const challengePage = normalizeChallengePage(challengeData);
            const nextChallenges = challengePage.items;
            const nextInvitations = invitationData ?? { incoming: [], outgoing: [] };

            setChallenges(nextChallenges);
            setHasMoreChallenges(challengePage.hasMore);
            challengesLoadedCountRef.current = Math.max(challengePage.nextOffset, nextChallenges.length);
            setInvitations(nextInvitations);
            setParticipantsByChallengeId({});
            setParticipantErrorsByChallengeId({});

            return { challenges: nextChallenges, invitations: nextInvitations };
        } catch {
            if (showError) {
                setError(null);
                setChallenges([]);
                setHasMoreChallenges(false);
                challengesLoadedCountRef.current = 0;
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

    const refreshChallengeTaxonomyInBackground = useCallback((challengeId) => {
        void waitForChallengeTaxonomy(challengeId).then((updatedChallenge) => {
            if (!updatedChallenge) {
                return;
            }

            setChallenges((previous) => previous.map((entry) => (
                entry?.id === challengeId ? { ...entry, ...updatedChallenge } : entry
            )));
        });
    }, []);

    const handleLoadMoreChallenges = useCallback(async () => {
        if (isLoadingMoreChallenges || !hasMoreChallenges) {
            return;
        }

        setIsLoadingMoreChallenges(true);
        setError(null);

        try {
            const currentOffset = challengesLoadedCountRef.current;
            const challengeParams = {
                scope: activeTab,
                limit: CHALLENGE_PAGE_SIZE,
                offset: currentOffset,
            };

            if (activeTab === 'public' && selectedCategory !== 'all') {
                challengeParams.categoryKey = selectedCategory;
            }

            const response = await getChallenges(challengeParams);
            const challengePage = normalizeChallengePage(response);

            setChallenges((currentChallenges) => {
                const seenChallengeIds = new Set(currentChallenges.map((challenge) => challenge?.id).filter(Boolean));
                const nextItems = challengePage.items.filter((challenge) => {
                    if (!challenge?.id || seenChallengeIds.has(challenge.id)) {
                        return false;
                    }

                    seenChallengeIds.add(challenge.id);
                    return true;
                });

                return [...currentChallenges, ...nextItems];
            });

            challengesLoadedCountRef.current = Math.max(
                challengePage.nextOffset,
                currentOffset + challengePage.items.length,
            );
            setHasMoreChallenges(challengePage.hasMore);
        } catch (loadMoreError) {
            setError({ message: loadMoreError.message || 'More challenges could not be loaded.' });
        } finally {
            setIsLoadingMoreChallenges(false);
        }
    }, [activeTab, hasMoreChallenges, isLoadingMoreChallenges, selectedCategory]);

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
        setActiveTab(readTabFromSearchParams(searchParams));
    }, [searchParams]);

    useEffect(() => {
        if (!taxonomyCategories.length || hasInitializedCategoryFromUrl.current) {
            return undefined;
        }

        const requestedCategory = searchParams.get('category');
        let timerId;

        if (requestedCategory && taxonomyCategories.some((category) => category.key === requestedCategory)) {
            timerId = window.setTimeout(() => {
                setSelectedCategory(requestedCategory);
            }, 0);
        }

        hasInitializedCategoryFromUrl.current = true;

        return () => {
            if (timerId) {
                window.clearTimeout(timerId);
            }
        };
    }, [searchParams, taxonomyCategories]);

    function handleTabChange(nextTab) {
        setActiveTab(nextTab);

        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);

            if (nextTab === 'active') {
                nextParams.delete('tab');
            } else {
                nextParams.set('tab', nextTab);
            }

            return nextParams;
        }, { replace: true });
    }

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

    const refreshProfileContext = useCallback(async () => {
        try {
            const [friendData, requestData, blockedData, blockerData] = await Promise.all([
                getFriends(),
                getFriendRequests(),
                getBlockedUsers(),
                getBlockers(),
            ]);

            setFriends(friendData ?? []);
            setFriendRequests(normalizeFriendRequestsResponse(requestData));
            setBlockedUsers(blockedData ?? []);
            setBlockers(blockerData ?? []);
        } catch {
            setFriendRequests({ incoming: [], outgoing: [] });
            setBlockedUsers([]);
            setBlockers([]);
        }
    }, []);

    useEffect(() => {
        void refreshProfileContext();
    }, [refreshProfileContext]);

    async function loadChallengeParticipants(challengeId) {
        if (
            !challengeId
            || participantsByChallengeId[challengeId]
            || participantLoadingByChallengeId[challengeId]
        ) {
            return;
        }

        setParticipantLoadingByChallengeId((currentLoading) => ({
            ...currentLoading,
            [challengeId]: true,
        }));
        setParticipantErrorsByChallengeId((currentErrors) => ({
            ...currentErrors,
            [challengeId]: '',
        }));

        try {
            const response = await getChallengeParticipants(challengeId);
            setParticipantsByChallengeId((currentParticipants) => ({
                ...currentParticipants,
                [challengeId]: response?.participants ?? [],
            }));
        } catch (participantError) {
            setParticipantErrorsByChallengeId((currentErrors) => ({
                ...currentErrors,
                [challengeId]: participantError.message || 'Failed to load users.',
            }));
        } finally {
            setParticipantLoadingByChallengeId((currentLoading) => ({
                ...currentLoading,
                [challengeId]: false,
            }));
        }
    }

    function getProfileRelationship(profileUser) {
        const profileUserId = profileUser?.id ?? profileUser?._id;

        if (!profileUserId) {
            return { status: 'unknown' };
        }

        if (sameId(profileUserId, user?.id) || sameId(profileUserId, user?._id)) {
            return { status: 'self' };
        }

        const friendship = friends.find(({ friend }) => sameId(friend?.id ?? friend?._id, profileUserId));

        if (friendship) {
            return { status: 'friends', friendshipId: friendship.id };
        }

        const incomingRequest = friendRequests.incoming?.find((request) => (
            sameId(request.requester?.id ?? request.requester?._id, profileUserId)
        ));

        if (incomingRequest) {
            return { status: 'incoming', requestId: incomingRequest.id };
        }

        const outgoingRequest = friendRequests.outgoing?.find((request) => (
            sameId(request.recipient?.id ?? request.recipient?._id, profileUserId)
        ));

        if (outgoingRequest) {
            return { status: 'outgoing', requestId: outgoingRequest.id };
        }

        return { status: 'none' };
    }

    async function handleSendProfileFriendRequest(profileUser) {
        const profileUserId = profileUser?.id ?? profileUser?._id;

        if (!profileUserId) {
            return;
        }

        setIsProfileActionBusy(true);
        clearChallengeFeedback();

        try {
            const request = await sendFriendRequest(profileUserId);

            setFriendRequests((currentRequests) => ({
                incoming: currentRequests.incoming ?? [],
                outgoing: [request, ...(currentRequests.outgoing ?? [])],
            }));
            setSelectedProfileUser(null);
            showChallengeToast('Your friend request has been sent.');
            void refreshProfileContext();
        } catch (profileError) {
            toast.error(getSocialErrorMessage(profileError, profileUser));
        } finally {
            setIsProfileActionBusy(false);
        }
    }

    async function handleAcceptProfileFriendRequest(requestId) {
        if (!requestId) {
            return;
        }

        setIsProfileActionBusy(true);
        clearChallengeFeedback();

        try {
            const response = await acceptFriendRequest(requestId);

            setFriendRequests((currentRequests) => ({
                incoming: (currentRequests.incoming ?? []).filter((request) => request.id !== requestId),
                outgoing: currentRequests.outgoing ?? [],
            }));
            setFriends((currentFriends) => [response.friendship, ...currentFriends]);
            setSelectedProfileUser(null);
            showChallengeToast("You've accepted the friend request.");
            void refreshProfileContext();
        } catch (profileError) {
            toast.error(getSocialErrorMessage(profileError));
        } finally {
            setIsProfileActionBusy(false);
        }
    }

    async function handleBlockProfileUser(profileUserId) {
        if (!profileUserId) {
            return;
        }

        setIsProfileActionBusy(true);
        clearChallengeFeedback();

        try {
            await blockUser(profileUserId);
            setSelectedProfileUser(null);
            showChallengeToast("You've blocked this user.");
            await refreshProfileContext();
        } catch (profileError) {
            toast.error(getSocialErrorMessage(profileError));
        } finally {
            setIsProfileActionBusy(false);
        }
    }

    async function handleUnblockProfileUser(profileUserId) {
        if (!profileUserId) {
            return;
        }

        setIsProfileActionBusy(true);
        clearChallengeFeedback();

        try {
            await unblockUser(profileUserId);
            showChallengeToast("You've unblocked this user.");
            await refreshProfileContext();
        } catch (profileError) {
            toast.error(getSocialErrorMessage(profileError));
        } finally {
            setIsProfileActionBusy(false);
        }
    }

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
            toast(actionError.message || "You're already participating in this challenge.");
            return;
        }

        toast.error(actionError.message || fallbackMessage);
    }

    function refreshChallengeNotifications() {
        window.dispatchEvent(new Event('howly:notifications-updated'));
    }

    function showChallengeToast(message) {
        toast.success(message);
        refreshChallengeNotifications();
    }

    function clearChallengeFeedback() {
        setError(null);
        setBanner(null);
    }

    function handleUpgradeClick() {
        setError(null);
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

        clearChallengeFeedback();
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
        clearChallengeFeedback();

        try {
            let savedChallenge;

            if (challenge) {
                const response = await updateChallenge(challenge.id, formData);
                savedChallenge = response?.challenge;
                showChallengeToast('Your challenge has been updated.');
            } else {
                const response = await createChallenge(formData);
                savedChallenge = response?.challenge;
                showChallengeToast('Your challenge has been created.');
            }

            closeFormDialog(false);
            await refreshCurrentChallenges();

            if (savedChallenge && !savedChallenge.taxonomy?.categoryKey) {
                refreshChallengeTaxonomyInBackground(savedChallenge.id);
            }
        } catch (submitError) {
            showActionError(submitError, challenge ? "We couldn't update your challenge. Please try again." : "We couldn't create your challenge. Please try again.");
        } finally {
            setBusyAction('');
        }
    }

    async function handleJoinChallenge(challengeId) {
        setBusyAction('join');
        clearChallengeFeedback();

        try {
            await joinChallenge(challengeId);
            showChallengeToast("You've joined the challenge.");
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, "We couldn't join the challenge. Please try again.");
        } finally {
            setBusyAction('');
        }
    }

    async function handleLeaveChallenge(challengeId) {
        setBusyAction(`leave-${challengeId}`);
        clearChallengeFeedback();

        try {
            await leaveChallenge(challengeId);
            showChallengeToast("You've left the challenge.");
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, "We couldn't leave the challenge. Please try again.");
        } finally {
            setBusyAction('');
        }
    }

    async function handleDeleteChallenge(challenge) {
        if (!challenge) {
            return;
        }

        setBusyAction(`delete-${challenge.id}`);
        clearChallengeFeedback();

        try {
            await deleteChallenge(challenge.id);
            showChallengeToast('Your challenge has been deleted.');
            closeFormDialog(false);
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, "We couldn't delete your challenge. Please try again.");
        } finally {
            setBusyAction('');
        }
    }

    async function confirmLeaveChallenge() {
        const challenge = pendingLeaveChallenge;

        if (!challenge) {
            return;
        }

        setPendingLeaveChallenge(null);
        await handleLeaveChallenge(challenge.id);
    }

    async function handleClaimReward(challengeId) {
        setBusyAction(`reward-${challengeId}`);
        clearChallengeFeedback();

        try {
            await claimChallengeReward(challengeId);
            showChallengeToast("You've claimed your reward.");
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, actionError.message || "We couldn't claim your reward. Please try again.");
        } finally {
            setBusyAction('');
        }
    }

    async function handleAcceptInvitation(invitationId) {
        setBusyAction(`accept-${invitationId}`);
        clearChallengeFeedback();

        try {
            await acceptChallengeInvitation(invitationId);
            showChallengeToast("You've accepted the invitation.");
            await refreshCurrentChallenges();
        } catch (actionError) {
            showActionError(actionError, "We couldn't accept the invitation. Please try again.");
        } finally {
            setBusyAction('');
        }
    }

    async function handleRejectInvitation(invitationId) {
        setBusyAction(`reject-${invitationId}`);
        clearChallengeFeedback();

        try {
            await rejectChallengeInvitation(invitationId);
            showChallengeToast("You've declined the invitation.");
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
        clearChallengeFeedback();

        try {
            const results = await Promise.allSettled(
                selectedFriendIds.map((friendId) => createChallengeInvitation(inviteChallenge.id, friendId))
            );
            const sentCount = results.filter((result) => result.status === 'fulfilled').length;
            const failedResults = results.filter((result) => result.status === 'rejected');

            if (sentCount > 0) {
                showChallengeToast(sentCount === 1 ? 'Your invitation has been sent.' : 'Your invitations have been sent.');
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

    const isSelectedUserBlocked = selectedProfileUser
        ? isBlockedByRelationship(selectedProfileUser, blockedUsers, blockers)
        : false;
    const isSelectedUserBlockedByMe = selectedProfileUser
        ? isUserBlockedByMe(selectedProfileUser, blockedUsers)
        : false;
    const hasSelectedUserBlockedMe = selectedProfileUser
        ? hasUserBlockedMe(selectedProfileUser, blockers)
        : false;

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
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className={appTabsListFullWidthClassName}>
                        {CHALLENGE_TABS.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className={appTabsTriggerClassName}
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

                <ChallengeAlert error={error} onUpgrade={handleUpgradeClick} />

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
                    <>
                    <CardGrid columns={2}>
                        {visibleChallenges.map((challenge) => {
                            const isOwnChallenge = userId && challenge.createdBy === userId;
                            const hasJoined = Boolean(challenge.viewerParticipantStatus && challenge.viewerParticipantStatus !== 'left');
                            const isJoinable = !isPastChallengeStatus(challenge.status);
                            const isPastTab = activeTab === 'past';
                            const shouldShowJoin = !isPastTab && !isOwnChallenge && !hasJoined && activeTab !== 'active';
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
                                    habitIcon={challenge.habitTemplate?.icon}
                                    habitTitle={challenge.habitTitle}
                                    category={categoryLabel}
                                    recommendationReason={challenge.recommendationReason}
                                    status={challenge.status}
                                    visibility={challenge.visibility}
                                    participants={challenge.participantCount ?? 0}
                                    participantsSlot={(
                                        <ChallengeParticipantsBadge
                                            challenge={challenge}
                                            participants={participantsByChallengeId[challenge.id] ?? []}
                                            isLoading={participantLoadingByChallengeId[challenge.id] === true}
                                            error={participantErrorsByChallengeId[challenge.id]}
                                            onLoad={loadChallengeParticipants}
                                            onOpenProfile={setSelectedProfileUser}
                                        />
                                    )}
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
                                            {!isPastTab ? (
                                                <>
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
                                            onClick={() => setPendingLeaveChallenge(challenge)}
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

                    {hasMoreChallenges ? (
                        <div className="flex justify-center">
                            <ActionButton
                                type="button"
                                className="gap-2 px-5"
                                disabled={isLoadingMoreChallenges}
                                onClick={handleLoadMoreChallenges}
                            >
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                {isLoadingMoreChallenges ? 'Loading...' : 'Load more'}
                            </ActionButton>
                        </div>
                    ) : null}
                    </>
                ) : null}

                {!isLoading && visibleChallenges.length === 0 && (activeTab !== 'active' || incomingInvitations.length === 0) ? (
                    <div className="rounded-xl border border-theme-text/10 bg-theme-text/5 p-6 text-center text-sm text-theme-text-soft">
                        {activeTab === 'past'
                            ? 'No past challenges available.'
                            : activeTab === 'public' && selectedCategory !== 'all'
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
                onDelete={handleDeleteChallenge}
                isSubmitting={busyAction === 'create' || busyAction === 'edit'}
                isDeleting={Boolean(editingChallenge && busyAction === `delete-${editingChallenge.id}`)}
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

            <UserPreviewDialog
                user={selectedProfileUser}
                relationship={getProfileRelationship(selectedProfileUser)}
                busy={isProfileActionBusy}
                isBlocked={isSelectedUserBlocked}
                isBlockedByMe={isSelectedUserBlockedByMe}
                hasBlockedCurrentUser={hasSelectedUserBlockedMe}
                onClose={() => setSelectedProfileUser(null)}
                onAddFriend={handleSendProfileFriendRequest}
                onAcceptRequest={handleAcceptProfileFriendRequest}
                onBlock={handleBlockProfileUser}
                onUnblock={handleUnblockProfileUser}
            />

            <ConfirmationDialog
                open={Boolean(pendingLeaveChallenge)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setPendingLeaveChallenge(null);
                    }
                }}
            >
                <ConfirmationDialogContent className="flex flex-col items-center p-7 text-center">
                    <ConfirmationDialogHeader className="flex w-full flex-col items-center justify-center space-y-3 text-center">
                        <ConfirmationDialogTitle className="w-full text-center text-2xl font-bold tracking-tight">
                            Leave challenge?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="flex flex-col gap-2 text-center text-sm leading-relaxed text-theme-text-soft sm:text-base">
                            <span className="break-words [overflow-wrap:anywhere]">
                                Are you sure you want to leave{' '}
                                <strong className="font-semibold text-theme-text">
                                    {pendingLeaveChallenge?.title}
                                </strong>
                                ? You will lose all of your rewards for this challenge.
                            </span>
                        </ConfirmationDialogDescription>
                    </ConfirmationDialogHeader>
                    <ConfirmationDialogFooter className="mt-6 w-full flex-col gap-3 sm:flex-col sm:space-x-0">
                        <ConfirmationDialogCancel className="mt-0 h-11 w-full rounded-xl border border-theme-text/10 bg-theme-surface-2 text-sm font-semibold text-theme-text hover:bg-theme-surface-2/80 hover:text-theme-text">
                            Keep challenge
                        </ConfirmationDialogCancel>
                        <ConfirmationDialogAction
                            className="h-11 w-full rounded-xl bg-theme-danger text-sm font-semibold text-white shadow-lg shadow-red-900/20 hover:bg-theme-danger/85"
                            onClick={confirmLeaveChallenge}
                        >
                            <TriangleAlert className="mr-2 h-4 w-4" />
                            Yes, leave challenge
                        </ConfirmationDialogAction>
                    </ConfirmationDialogFooter>
                </ConfirmationDialogContent>
            </ConfirmationDialog>
        </Page>
    );
}

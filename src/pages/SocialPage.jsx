import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { Page, Heading } from '@/components/layout';
import { FriendsPanel } from '@/components/social/FriendsPanel.jsx';
import { ReactionUsersDialog } from '@/components/social/ReactionUsersDialog.jsx';
import { SocialFeed } from '@/components/social/SocialFeed.jsx';
import { UserPreviewDialog } from '@/components/social/UserPreviewDialog.jsx';
import { NotificationBanner } from '@/components/ui/notification-banner.jsx';
import {
    getSocialErrorMessage,
    getDisplayName,
    hasUserBlockedMe,
    isBlockedByRelationship,
    isUserBlockedByMe,
    sameId,
} from '@/components/social/socialHelpers.js';
import {
    acceptFriendRequest,
    deleteFriend,
    getFriendRequests,
    getFriends,
    getSocialFeed,
    getMilestoneReactions,
    rejectFriendRequest,
    reactToMilestone,
    sendFriendRequest,
    blockUser,
    unblockUser,
    getBlockedUsers,
    getBlockers,
} from '@/services/socialApi';
import { searchUsers } from '@/services/userApi';
import { deleteStory, getStoryLikes, toggleStoryLike } from '@/services/storyApi';
import { useAuth } from '@/context/authContext';

const SOCIAL_REFRESH_INTERVAL_MS = 10000;
const SOCIAL_FEED_PAGE_SIZE = 10;
const FRIEND_PAGE_SIZE = 10;
const FRIEND_REQUEST_PAGE_SIZE = 10;
const OUTGOING_REQUEST_LOOKUP_LIMIT = 50;

export function SocialPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [hasMoreFriends, setHasMoreFriends] = useState(false);
    const [isLoadingMoreFriends, setIsLoadingMoreFriends] = useState(false);
    const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
    const [hasMoreIncomingRequests, setHasMoreIncomingRequests] = useState(false);
    const [isLoadingMoreIncomingRequests, setIsLoadingMoreIncomingRequests] = useState(false);
    const [feed, setFeed] = useState([]);
    const [hasMoreFeed, setHasMoreFeed] = useState(false);
    const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockers, setBlockers] = useState([]);
    const [usernameQuery, setUsernameQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [busyRequestId, setBusyRequestId] = useState(null);
    const [busyFriendId, setBusyFriendId] = useState(null);
    const [busyPostId, setBusyPostId] = useState(null);
    const [activePanel, setActivePanel] = useState('friends');
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [selectedProfileUser, setSelectedProfileUser] = useState(null);
    const [banner, setBanner] = useState(null);
    const location = useLocation();
    // Capture notification jump state once. Query params alone should not
    // replay the scroll/highlight behavior after reloads or normal navigation.
    const [notificationJump, setNotificationJump] = useState(() => location.state?.notificationJump ?? null);
    const targetStoryId = notificationJump?.storyId ?? null;
    const targetPostId = notificationJump?.postId ?? null;
    const targetCommentId = notificationJump?.commentId ?? null;
    const targetCommentToken = notificationJump?.token ?? null;
    const targetNotificationType = notificationJump?.type ?? null;
    const targetActorId = notificationJump?.actorId ?? null;
    const targetMetadata = notificationJump?.metadata ?? {};
    const targetFriendRequestId = notificationJump?.requestId ?? null;
    const targetFeedPostId = targetStoryId ?? targetPostId;
    const requiresInteractionValidation = targetNotificationType === 'story_liked'
        || targetNotificationType === 'milestone_reacted';
    const notificationSearchParams = new URLSearchParams(location.search);
    const hasNotificationQuery = notificationSearchParams.has('storyId')
        || notificationSearchParams.has('commentId')
        || notificationSearchParams.has('postId');
    const pendingFriendRequestCount = requests.incoming?.length ?? 0;
    const selectedFeedPost = selectedReaction?.post?.id
        ? feed.find((post) => post.id === selectedReaction.post.id)
        : null;
    const selectedReactionPost = selectedReaction?.post?.id
        ? {
            ...(selectedFeedPost ?? selectedReaction.post),
            reactions: selectedReaction.post.reactions
                ?? selectedFeedPost?.reactions
                ?? [],
        }
        : null;
    const hasScrolledRef = useRef(false);
    const refreshPromiseRef = useRef(null);
    const feedLoadedCountRef = useRef(SOCIAL_FEED_PAGE_SIZE);
    const friendsLoadedCountRef = useRef(FRIEND_PAGE_SIZE);
    const incomingRequestsLoadedCountRef = useRef(FRIEND_REQUEST_PAGE_SIZE);

    function normalizeFeedResponse(feedResponse) {
        if (Array.isArray(feedResponse)) {
            return {
                items: feedResponse,
                hasMore: false,
                nextOffset: feedResponse.length,
            };
        }

        return {
            items: feedResponse?.items ?? [],
            hasMore: feedResponse?.hasMore === true,
            nextOffset: Number.isInteger(feedResponse?.nextOffset)
                ? feedResponse.nextOffset
                : (feedResponse?.items?.length ?? 0),
        };
    }

    function normalizeListPage(response) {
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

    function normalizeFriendRequestsResponse(requestsResponse) {
        const incoming = normalizeListPage(requestsResponse?.incoming ?? []);
        const outgoing = normalizeListPage(requestsResponse?.outgoing ?? []);

        return {
            incoming,
            outgoing,
        };
    }

    const handleLoadMoreFeed = useCallback(async () => {
        if (isLoadingMoreFeed || !hasMoreFeed) {
            return;
        }

        setIsLoadingMoreFeed(true);
        setError('');

        try {
            const currentOffset = feedLoadedCountRef.current;
            const feedResponse = await getSocialFeed({
                limit: SOCIAL_FEED_PAGE_SIZE,
                offset: currentOffset,
            });
            const nextPage = normalizeFeedResponse(feedResponse);

            setFeed((currentFeed) => {
                const seenPostKeys = new Set(currentFeed.map((post) => `${post.type}:${post.id}`));
                const nextItems = nextPage.items.filter((post) => {
                    const key = `${post.type}:${post.id}`;

                    if (seenPostKeys.has(key)) {
                        return false;
                    }

                    seenPostKeys.add(key);
                    return true;
                });
                const nextFeed = [...currentFeed, ...nextItems];

                return nextFeed;
            });
            feedLoadedCountRef.current = Math.max(nextPage.nextOffset, currentOffset + nextPage.items.length);
            setHasMoreFeed(nextPage.hasMore);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoadingMoreFeed(false);
        }
    }, [hasMoreFeed, isLoadingMoreFeed]);

    const handleLoadMoreFriends = useCallback(async () => {
        if (isLoadingMoreFriends || !hasMoreFriends) {
            return;
        }

        setIsLoadingMoreFriends(true);
        setError('');

        try {
            const currentOffset = friendsLoadedCountRef.current;
            const friendsResponse = await getFriends({
                limit: FRIEND_PAGE_SIZE,
                offset: currentOffset,
            });
            const nextPage = normalizeListPage(friendsResponse);

            setFriends((currentFriends) => {
                const seenIds = new Set(currentFriends.map((friendship) => friendship.id));
                const nextItems = nextPage.items.filter((friendship) => {
                    if (seenIds.has(friendship.id)) {
                        return false;
                    }

                    seenIds.add(friendship.id);
                    return true;
                });

                return [...currentFriends, ...nextItems];
            });
            friendsLoadedCountRef.current = Math.max(nextPage.nextOffset, currentOffset + nextPage.items.length);
            setHasMoreFriends(nextPage.hasMore);
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
        } finally {
            setIsLoadingMoreFriends(false);
        }
    }, [hasMoreFriends, isLoadingMoreFriends]);

    const handleLoadMoreIncomingRequests = useCallback(async () => {
        if (isLoadingMoreIncomingRequests || !hasMoreIncomingRequests) {
            return;
        }

        setIsLoadingMoreIncomingRequests(true);
        setError('');

        try {
            const currentOffset = incomingRequestsLoadedCountRef.current;
            const requestsResponse = await getFriendRequests({
                incomingLimit: FRIEND_REQUEST_PAGE_SIZE,
                incomingOffset: currentOffset,
                outgoingLimit: OUTGOING_REQUEST_LOOKUP_LIMIT,
                outgoingOffset: 0,
            });
            const nextRequests = normalizeFriendRequestsResponse(requestsResponse);

            setRequests((currentRequests) => {
                const seenIncomingIds = new Set((currentRequests.incoming ?? []).map((request) => request.id));
                const nextIncoming = nextRequests.incoming.items.filter((request) => {
                    if (seenIncomingIds.has(request.id)) {
                        return false;
                    }

                    seenIncomingIds.add(request.id);
                    return true;
                });

                return {
                    incoming: [...(currentRequests.incoming ?? []), ...nextIncoming],
                    outgoing: nextRequests.outgoing.items.length
                        ? nextRequests.outgoing.items
                        : (currentRequests.outgoing ?? []),
                };
            });
            incomingRequestsLoadedCountRef.current = Math.max(
                nextRequests.incoming.nextOffset,
                currentOffset + nextRequests.incoming.items.length,
            );
            setHasMoreIncomingRequests(nextRequests.incoming.hasMore);
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
        } finally {
            setIsLoadingMoreIncomingRequests(false);
        }
    }, [hasMoreIncomingRequests, isLoadingMoreIncomingRequests]);

    function getProfileRelationship(profileUser) {
        if (!profileUser) {
            return { status: 'unknown' };
        }

        if (sameId(profileUser.id, user?.id) || sameId(profileUser.id, user?._id)) {
            return { status: 'self' };
        }

        const friendship = friends.find(({ friend }) => sameId(friend?.id, profileUser.id));

        if (friendship) {
            return { status: 'friends', friendshipId: friendship.id };
        }

        const incomingRequest = requests.incoming?.find((request) => sameId(request.requester?.id, profileUser.id));

        if (incomingRequest) {
            return { status: 'incoming', requestId: incomingRequest.id };
        }

        const outgoingRequest = requests.outgoing?.find((request) => sameId(request.recipient?.id, profileUser.id));

        if (outgoingRequest) {
            return { status: 'outgoing', requestId: outgoingRequest.id };
        }

        return { status: 'none' };
    }

    const refreshSocialData = useCallback(({ showLoading = false, silent = false } = {}) => {
        if (showLoading) {
            setIsLoading(true);
        }

        if (!silent) {
            setError('');
        }

        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        let request;
        request = (async () => {
            try {
                const feedLimit = Math.max(feedLoadedCountRef.current, SOCIAL_FEED_PAGE_SIZE);
                const friendsLimit = Math.max(friendsLoadedCountRef.current, FRIEND_PAGE_SIZE);
                const incomingRequestsLimit = Math.max(incomingRequestsLoadedCountRef.current, FRIEND_REQUEST_PAGE_SIZE);
                const [friendsData, requestsData, feedData, blockedData, blockersData] = await Promise.all([
                    getFriends({ limit: friendsLimit, offset: 0 }),
                    getFriendRequests({
                        incomingLimit: incomingRequestsLimit,
                        incomingOffset: 0,
                        outgoingLimit: OUTGOING_REQUEST_LOOKUP_LIMIT,
                        outgoingOffset: 0,
                    }),
                    getSocialFeed({ limit: feedLimit, offset: 0 }),
                    getBlockedUsers(),
                    getBlockers(),
                ]);
                const nextFeed = normalizeFeedResponse(feedData);
                const nextFriends = normalizeListPage(friendsData);
                const nextRequests = normalizeFriendRequestsResponse(requestsData);

                setFriends(nextFriends.items);
                setHasMoreFriends(nextFriends.hasMore);
                friendsLoadedCountRef.current = Math.max(nextFriends.nextOffset, FRIEND_PAGE_SIZE);
                setRequests({
                    incoming: nextRequests.incoming.items,
                    outgoing: nextRequests.outgoing.items,
                });
                setHasMoreIncomingRequests(nextRequests.incoming.hasMore);
                incomingRequestsLoadedCountRef.current = Math.max(nextRequests.incoming.nextOffset, FRIEND_REQUEST_PAGE_SIZE);
                setFeed(nextFeed.items);
                setHasMoreFeed(nextFeed.hasMore);
                feedLoadedCountRef.current = Math.max(nextFeed.nextOffset, SOCIAL_FEED_PAGE_SIZE);
                setBlockedUsers(blockedData ?? []);
                setBlockers(blockersData ?? []);
                window.dispatchEvent(new Event('howly:social-requests-updated'));

                return {
                    friends: nextFriends.items,
                    requests: {
                        incoming: nextRequests.incoming.items,
                        outgoing: nextRequests.outgoing.items,
                    },
                    feed: nextFeed.items,
                    blockedUsers: blockedData ?? [],
                    blockers: blockersData ?? [],
                };
            } catch (err) {
                if (!silent) {
                    setError(err.message);
                }
                return null;
            } finally {
                if (refreshPromiseRef.current === request) {
                    refreshPromiseRef.current = null;
                }
                setIsLoading(false);
            }
        })();

        refreshPromiseRef.current = request;
        return request;
    }, []);

    const showUnavailableNotificationBanner = useCallback((title) => {
        setBanner({
            variant: 'unavailable',
            eyebrow: 'Notification link unavailable',
            title,
        });
    }, []);

    // Clean notification-only URL/state immediately after the state above has
    // captured the one-time jump intent.
    useEffect(() => {
        if (location.state?.notificationJump || hasNotificationQuery) {
            navigate('/social', { replace: true, state: null });
        }
    }, [hasNotificationQuery, location.state, navigate]);

    useEffect(() => {
        const nextJump = location.state?.notificationJump;
        if (!nextJump || nextJump.token === notificationJump?.token) return undefined;

        const timer = window.setTimeout(() => {
            setNotificationJump(nextJump);
            hasScrolledRef.current = false;
            navigate('/social', { replace: true, state: null });
        }, 0);

        return () => window.clearTimeout(timer);
    }, [location.state, navigate, notificationJump?.token]);

    useEffect(() => {
        if (targetNotificationType !== 'friend_request_received' || !targetFriendRequestId) return undefined;

        let isCancelled = false;

        async function validateFriendRequestNotification() {
            const latestData = await refreshSocialData({ silent: true });

            if (isCancelled) {
                return;
            }

            const requestExists = [
                ...(latestData?.requests?.incoming ?? []),
                ...(latestData?.requests?.outgoing ?? []),
            ].some((request) => request.id === targetFriendRequestId);

            if (!requestExists) {
                showUnavailableNotificationBanner('Friend request not found');
            }

            setNotificationJump(null);
        }

        validateFriendRequestNotification();

        return () => {
            isCancelled = true;
        };
    }, [
        refreshSocialData,
        showUnavailableNotificationBanner,
        targetFriendRequestId,
        targetNotificationType,
    ]);

    // After the feed loads, scroll the target card into view.
    // Uses a ref guard so the scroll never re-fires from background feed polls.
    useEffect(() => {
        if (!targetFeedPostId || feed.length === 0 || hasScrolledRef.current) return;
        hasScrolledRef.current = true;
        let cancelled = false;
        const cleanupEvents = [];

        function cancelPendingJump() {
            cancelled = true;
        }

        ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((eventName) => {
            window.addEventListener(eventName, cancelPendingJump, { once: true, passive: true, capture: true });
            cleanupEvents.push(() => window.removeEventListener(eventName, cancelPendingJump, { capture: true }));
        });

        const timer = setTimeout(() => {
            if (cancelled) return;
            const selector = targetStoryId
                ? `[data-story-id="${targetStoryId}"]`
                : `[data-post-id="${targetFeedPostId}"]`;
            const el = document.querySelector(selector);
            el?.scrollIntoView({ behavior: 'auto', block: 'center' });
            if (!targetCommentId && !requiresInteractionValidation) {
                setNotificationJump(null);
            }
        }, 150);
        return () => {
            cancelled = true;
            cleanupEvents.forEach((cleanup) => cleanup());
            clearTimeout(timer);
        };
    }, [targetFeedPostId, targetStoryId, targetCommentId, requiresInteractionValidation, feed]);

    // If a notification deep-link target is not in the loaded feed,
    // show a temporary unavailable-post notice and clear the jump state.
    useEffect(() => {
        if (!targetFeedPostId || isLoading || isLoadingMoreFeed) return undefined;

        const targetExists = feed.some((post) => {
            if (targetStoryId) {
                return post.type === 'story' && post.id === targetStoryId;
            }

            return post.id === targetFeedPostId;
        });

        if (!targetExists && hasMoreFeed) {
            void handleLoadMoreFeed();
            return undefined;
        }

        if (!targetExists) {
            const timer = window.setTimeout(() => {
                showUnavailableNotificationBanner('This post is no longer available');
                setNotificationJump(null);
            }, 0);

            return () => window.clearTimeout(timer);
        }

        return undefined;
    }, [
        targetFeedPostId,
        targetStoryId,
        isLoading,
        isLoadingMoreFeed,
        feed,
        hasMoreFeed,
        handleLoadMoreFeed,
        showUnavailableNotificationBanner,
    ]);

    useEffect(() => {
        if (
            targetNotificationType !== 'story_liked'
            || !targetStoryId
            || !targetActorId
            || isLoading
        ) {
            return undefined;
        }

        const storyExists = feed.some((post) => post.type === 'story' && post.id === targetStoryId);
        if (!storyExists) return undefined;

        let isCurrent = true;
        let clearTimer = null;

        getStoryLikes(targetStoryId)
            .then((likers = []) => {
                if (!isCurrent) return;

                const likeExists = likers.some((liker) => (
                    sameId(liker?.id, targetActorId) || sameId(liker?._id, targetActorId)
                ));

                if (!likeExists) {
                    showUnavailableNotificationBanner('Like not found');
                    setNotificationJump(null);
                    return;
                }

                clearTimer = window.setTimeout(() => {
                    setNotificationJump(null);
                }, 250);
            })
            .catch(() => {
                if (!isCurrent) return;
                showUnavailableNotificationBanner('Like not found');
                setNotificationJump(null);
            });

        return () => {
            isCurrent = false;
            window.clearTimeout(clearTimer);
        };
    }, [
        targetNotificationType,
        targetStoryId,
        targetActorId,
        isLoading,
        feed,
        showUnavailableNotificationBanner,
    ]);

    useEffect(() => {
        if (
            targetNotificationType !== 'milestone_reacted'
            || !targetPostId
            || !targetActorId
            || isLoading
        ) {
            return undefined;
        }

        const targetPost = feed.find((post) => post.id === targetPostId);
        if (!targetPost) return undefined;

        const expectedEmojis = Array.isArray(targetMetadata?.emojis) && targetMetadata.emojis.length
            ? targetMetadata.emojis
            : [targetMetadata?.emoji].filter(Boolean);
        const actorReactions = (targetPost.reactions ?? []).filter((reaction) => (
            sameId(reaction?.user?.id, targetActorId) || sameId(reaction?.user?._id, targetActorId)
        ));
        const reactionExists = expectedEmojis.length
            ? expectedEmojis.every((emoji) => actorReactions.some((reaction) => reaction.emoji === emoji))
            : actorReactions.length > 0;

        if (!reactionExists) {
            showUnavailableNotificationBanner('Reaction not found');
            setNotificationJump(null);
            return undefined;
        }

        const clearTimer = window.setTimeout(() => {
            setNotificationJump(null);
        }, 250);

        return () => window.clearTimeout(clearTimer);
    }, [
        targetNotificationType,
        targetPostId,
        targetActorId,
        targetMetadata,
        isLoading,
        feed,
        showUnavailableNotificationBanner,
    ]);

    function handleActivePanelChange(nextPanel) {
        setActivePanel(nextPanel);
        setError('');

        if (nextPanel === 'requests') {
            void refreshSocialData({ silent: true });
        }
    }

    const handleTargetCommentHandled = useCallback(() => {
        setNotificationJump(null);
    }, []);

    const handleTargetCommentUnavailable = useCallback(() => {
        showUnavailableNotificationBanner('Comment not found');
        setNotificationJump(null);
    }, [showUnavailableNotificationBanner]);

    function addOutgoingRequest(request) {
        setRequests((currentRequests) => ({
            incoming: currentRequests.incoming ?? [],
            outgoing: [request, ...(currentRequests.outgoing ?? [])],
        }));
    }

    function acceptRequestLocally(requestId, friendship) {
        incomingRequestsLoadedCountRef.current = Math.max(0, incomingRequestsLoadedCountRef.current - 1);
        setRequests((currentRequests) => ({
            incoming: (currentRequests.incoming ?? []).filter((request) => request.id !== requestId),
            outgoing: currentRequests.outgoing ?? [],
        }));
        friendsLoadedCountRef.current += 1;
        setFriends((currentFriends) => [friendship, ...currentFriends]);
        setActivePanel('friends');
        window.dispatchEvent(new Event('howly:social-requests-updated'));
        window.dispatchEvent(new Event('howly:notifications-updated'));
        void refreshSocialData({ silent: true });
    }

    async function sendRequestToUser(targetUser, { closeProfile = false } = {}) {
        setIsSubmitting(true);
        setError('');

        try {
            const request = await sendFriendRequest(targetUser.id);

            addOutgoingRequest(request);
            toast.success('Your friend request has been sent.');
            window.dispatchEvent(new Event('howly:social-requests-updated'));
            void refreshSocialData({ silent: true });

            if (closeProfile) {
                setSelectedProfileUser(null);
            }
        } catch (err) {
            toast.error(getSocialErrorMessage(err, targetUser));
        } finally {
            setIsSubmitting(false);
        }
    }

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void refreshSocialData({ showLoading: true });
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [refreshSocialData]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (!document.hidden) {
                void refreshSocialData({ silent: true });
            }
        }, SOCIAL_REFRESH_INTERVAL_MS);

        function handleWindowFocus() {
            void refreshSocialData({ silent: true });
        }

        function handleVisibilityChange() {
            if (!document.hidden) {
                void refreshSocialData({ silent: true });
            }
        }

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshSocialData]);

    useEffect(() => {
        function handleFriendRequestsRefreshed(event) {
            if (event.detail) {
                const nextRequests = normalizeFriendRequestsResponse(event.detail);
                setRequests({
                    incoming: nextRequests.incoming.items,
                    outgoing: nextRequests.outgoing.items,
                });
                setHasMoreIncomingRequests(nextRequests.incoming.hasMore);
                incomingRequestsLoadedCountRef.current = Math.max(nextRequests.incoming.nextOffset, FRIEND_REQUEST_PAGE_SIZE);
            }
        }

        window.addEventListener('howly:social-requests-refreshed', handleFriendRequestsRefreshed);

        return () => {
            window.removeEventListener('howly:social-requests-refreshed', handleFriendRequestsRefreshed);
        };
    }, []);

    async function handleSearchUsers(event) {
        event.preventDefault();

        if (!usernameQuery.trim()) {
            setError('Enter a username to search');
            return;
        }

        setIsSearching(true);
        setError('');

        try {
            const users = await searchUsers(usernameQuery.trim());
            setSearchResults(users ?? []);

            if (!users?.length) {
                setError('Hmm, that didn\'t work. Check if the username is correct.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSearching(false);
        }
    }

    async function handleSendFriendRequest(user) {
        await sendRequestToUser(user);
    }

    async function handleSendProfileFriendRequest(profileUser) {
        await sendRequestToUser(profileUser, { closeProfile: true });
    }

    async function handleAcceptProfileFriendRequest(requestId) {
        setBusyRequestId(requestId);
        setError('');

        try {
            const response = await acceptFriendRequest(requestId);

            acceptRequestLocally(requestId, response.friendship);
            toast.success("You're now friends!");
            setSelectedProfileUser(null);
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
        } finally {
            setBusyRequestId(null);
        }
    }

    async function handleAcceptRequest(requestId) {
        setBusyRequestId(requestId);
        setError('');

        try {
            const response = await acceptFriendRequest(requestId);

            acceptRequestLocally(requestId, response.friendship);
            toast.success("You're now friends!");
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
        } finally {
            setBusyRequestId(null);
        }
    }

    async function handleRejectRequest(requestId) {
        setBusyRequestId(requestId);
        setError('');

        try {
            await rejectFriendRequest(requestId);
            toast.success("You've declined the friend request.");
            incomingRequestsLoadedCountRef.current = Math.max(0, incomingRequestsLoadedCountRef.current - 1);
            setRequests((currentRequests) => ({
                incoming: (currentRequests.incoming ?? []).filter((request) => request.id !== requestId),
                outgoing: currentRequests.outgoing ?? [],
            }));
            window.dispatchEvent(new Event('howly:social-requests-updated'));
            window.dispatchEvent(new Event('howly:notifications-updated'));
            void refreshSocialData({ silent: true });
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
        } finally {
            setBusyRequestId(null);
        }
    }

    async function handleDeleteFriend(friendshipId, friend) {
        setBusyFriendId(friendshipId);
        setError('');

        try {
            await deleteFriend(friendshipId);
            toast.success("You've removed this friend.");
            friendsLoadedCountRef.current = Math.max(0, friendsLoadedCountRef.current - 1);
            setFriends((currentFriends) => currentFriends.filter((friendship) => friendship.id !== friendshipId));
            setFeed((currentFeed) => currentFeed.filter((post) => !sameId(post.user?.id, friend?.id)));
            void refreshSocialData({ silent: true });
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
        } finally {
            setBusyFriendId(null);
        }
    }

    async function handleToggleStoryLike(post) {
        setBusyPostId(post.id);
        setError('');

        try {
            const response = await toggleStoryLike(post.id);
            const updatedStory = { type: 'story', ...response.story };

            setFeed((currentFeed) =>
                currentFeed.map((feedPost) =>
                    feedPost.id === post.id ? updatedStory : feedPost,
                ),
            );
            setSelectedReaction((currentReaction) => {
                if (currentReaction?.post?.id !== post.id) {
                    return currentReaction;
                }

                const currentUserId = user?.id ?? user?._id;
                const currentReactions = currentReaction.post.reactions ?? [];
                const nextReactions = response.liked
                    ? currentReactions.some((reaction) => sameId(reaction.user?.id, currentUserId))
                        ? currentReactions
                        : [...currentReactions, {
                            emoji: '💜',
                            user: { ...user, id: currentUserId },
                        }]
                    : currentReactions.filter((reaction) => !sameId(reaction.user?.id, currentUserId));

                return {
                    post: {
                        ...updatedStory,
                        reactions: nextReactions,
                    },
                };
            });
            return response;
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
            return null;
        } finally {
            setBusyPostId(null);
        }
    }

    async function handleOpenStoryLikes(post, loadedLikers = []) {
        if (!post.likeCount) {
            return;
        }

        setSelectedReaction({
            post: {
                ...post,
                type: 'story',
                reactions: (loadedLikers ?? []).map((liker) => ({
                    emoji: '💜',
                    user: liker,
                })),
            },
        });
    }

    const handleLoadReactionUsers = useCallback(async (post, pagination) => {
        if (post.type === 'story') {
            const response = await getStoryLikes(post.id, pagination);

            if (Array.isArray(response)) {
                return response.map((liker) => ({ emoji: '💜', user: liker }));
            }

            return {
                ...response,
                items: (response?.items ?? []).map((liker) => ({ emoji: '💜', user: liker })),
            };
        }

        return getMilestoneReactions(post.id, pagination);
    }, []);

    async function handleDeleteStory(post) {
        await deleteStory(post.id);
        setFeed((currentFeed) =>
            currentFeed.filter(
                (feedPost) => !(feedPost.type === 'story' && feedPost.id === post.id),
            ),
        );
    }

    async function handleReactToMilestone(post, emoji) {
        setBusyPostId(post.id);
        setError('');

        try {
            const response = await reactToMilestone(post.id, emoji);

            setFeed((currentFeed) =>
                currentFeed.map((feedPost) =>
                    feedPost.id === post.id ? response.milestonePost : feedPost,
                ),
            );
            setSelectedReaction((currentReaction) =>
                currentReaction?.post?.id === post.id
                    ? { post: response.milestonePost }
                    : currentReaction,
            );
            return response;
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
            return null;
        } finally {
            setBusyPostId(null);
        }
    }

    async function handleReactFromDialog(post, emoji) {
        if (post.type === 'story') {
            return handleToggleStoryLike(post);
        }

        return handleReactToMilestone(post, emoji);
    }

    async function handleBlockUser(targetUserId) {
        try {
            setIsSubmitting(true);
            setError('');
            await blockUser(targetUserId);
            toast.success("You've blocked this user.");
            const blockedData = await getBlockedUsers();
            setBlockedUsers(blockedData ?? []);
            void refreshSocialData({ silent: true });
            setSelectedProfileUser(null);
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleUnblockUser(targetUserId) {
        try {
            setIsSubmitting(true);
            setError('');
            await unblockUser(targetUserId);
            toast.success("You've unblocked this user.");
            const blockedData = await getBlockedUsers();
            setBlockedUsers(blockedData ?? []);
        } catch (err) {
            toast.error(getSocialErrorMessage(err));
        } finally {
            setIsSubmitting(false);
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
        <Page theme="forest" contentClassName="max-w-[112rem]">
            <Heading title="Friends" subtitle="See what your friends are building." streakDays={user?.streak ?? 0} />

            {banner && (
                <div className="fixed right-6 top-24 z-[9999] w-[min(92vw,24rem)]">
                    <NotificationBanner
                        variant={banner.variant}
                        eyebrow={banner.eyebrow}
                        title={banner.title}
                        icon={<LockKeyhole className="size-5" aria-hidden="true" />}
                        onClose={() => setBanner(null)}
                        autoCloseMs={6000}
                        className="px-4 py-3"
                    >
                        {banner.message}
                    </NotificationBanner>
                </div>
            )}

            <div className="mx-auto grid w-full max-w-[98rem] gap-14 lg:grid-cols-[minmax(0,64rem)_minmax(25.5rem,26rem)] lg:items-start lg:justify-center xl:gap-24">
                <SocialFeed
                    feed={feed}
                    isLoading={isLoading}
                    busyPostId={busyPostId}
                    currentUserId={user?.id}
                    hasMore={hasMoreFeed}
                    isLoadingMore={isLoadingMoreFeed}
                    onLoadMore={handleLoadMoreFeed}
                    onReact={handleReactToMilestone}
                    onOpenReactions={(feedPost) => setSelectedReaction({ post: feedPost })}
                    onToggleStoryLike={handleToggleStoryLike}
                    onOpenStoryLikes={handleOpenStoryLikes}
                    onDeleteStory={handleDeleteStory}
                    onOpenProfile={setSelectedProfileUser}
                    blockedUsers={blockedUsers}
                    blockers={blockers}
                    targetStoryId={targetStoryId}
                    targetCommentId={targetCommentId}
                    targetCommentToken={targetCommentToken}
                    onTargetCommentHandled={handleTargetCommentHandled}
                    onTargetCommentUnavailable={handleTargetCommentUnavailable}
                />

                <FriendsPanel
                    activePanel={activePanel}
                    friends={friends}
                    requests={requests}
                    hasMoreFriends={hasMoreFriends}
                    isLoadingMoreFriends={isLoadingMoreFriends}
                    hasMoreIncomingRequests={hasMoreIncomingRequests}
                    isLoadingMoreIncomingRequests={isLoadingMoreIncomingRequests}
                    usernameQuery={usernameQuery}
                    searchResults={searchResults}
                    pendingFriendRequestCount={pendingFriendRequestCount}
                    error={error}
                    isLoading={isLoading}
                    isSearching={isSearching}
                    isSubmitting={isSubmitting}
                    busyRequestId={busyRequestId}
                    busyFriendId={busyFriendId}
                    onActivePanelChange={handleActivePanelChange}
                    onUsernameQueryChange={setUsernameQuery}
                    onSearchUsers={handleSearchUsers}
                    onSendFriendRequest={handleSendFriendRequest}
                    onAcceptRequest={handleAcceptRequest}
                    onRejectRequest={handleRejectRequest}
                    onLoadMoreFriends={handleLoadMoreFriends}
                    onLoadMoreIncomingRequests={handleLoadMoreIncomingRequests}
                    onDeleteFriend={handleDeleteFriend}
                    onBlockUser={handleBlockUser}
                    onOpenProfile={setSelectedProfileUser}
                    getRelationship={getProfileRelationship}
                />
            </div>

            <ReactionUsersDialog
                reaction={selectedReactionPost ? { post: selectedReactionPost } : null}
                busy={isSubmitting || busyPostId === selectedReactionPost?.id}
                currentUserId={user?.id}
                onClose={() => setSelectedReaction(null)}
                onSelectUser={(reactionUser) => {
                    setSelectedReaction(null);
                    setSelectedProfileUser(reactionUser);
                }}
                onAddFriend={handleSendProfileFriendRequest}
                onReact={handleReactFromDialog}
                onLoadUsers={handleLoadReactionUsers}
                getRelationship={getProfileRelationship}
            />
            <UserPreviewDialog
                user={selectedProfileUser}
                relationship={getProfileRelationship(selectedProfileUser)}
                busy={isSubmitting || busyRequestId !== null}
                isBlocked={isSelectedUserBlocked}
                isBlockedByMe={isSelectedUserBlockedByMe}
                hasBlockedCurrentUser={hasSelectedUserBlockedMe}
                onClose={() => setSelectedProfileUser(null)}
                onAddFriend={handleSendProfileFriendRequest}
                onAcceptRequest={handleAcceptProfileFriendRequest}
                onBlock={handleBlockUser}
                onUnblock={handleUnblockUser}
            />
        </Page>
    );
}

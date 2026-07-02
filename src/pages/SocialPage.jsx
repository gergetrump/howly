import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Page, Heading } from '@/components/layout';
import { FriendsPanel } from '@/components/social/FriendsPanel.jsx';
import { ReactionUsersDialog } from '@/components/social/ReactionUsersDialog.jsx';
import { SocialFeed } from '@/components/social/SocialFeed.jsx';
import { UserPreviewDialog } from '@/components/social/UserPreviewDialog.jsx';
import {
    getSocialErrorMessage,
    getDisplayName,
    isBlockedByRelationship,
    sameId,
} from '@/components/social/socialHelpers.js';
import {
    acceptFriendRequest,
    deleteFriend,
    getFriendRequests,
    getFriends,
    getSocialFeed,
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

export function SocialPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
    const [feed, setFeed] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockers, setBlockers] = useState([]);
    const [usernameQuery, setUsernameQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [busyRequestId, setBusyRequestId] = useState(null);
    const [busyFriendId, setBusyFriendId] = useState(null);
    const [busyPostId, setBusyPostId] = useState(null);
    const [activePanel, setActivePanel] = useState('friends');
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [selectedProfileUser, setSelectedProfileUser] = useState(null);
    const location = useLocation();
    // Capture notification jump state once. Query params alone should not
    // replay the scroll/highlight behavior after reloads or normal navigation.
    const [notificationJump, setNotificationJump] = useState(() => location.state?.notificationJump ?? null);
    const targetStoryId = notificationJump?.storyId ?? null;
    const targetCommentId = notificationJump?.commentId ?? null;
    const targetCommentToken = notificationJump?.token ?? null;
    const notificationSearchParams = new URLSearchParams(location.search);
    const hasNotificationQuery = notificationSearchParams.has('storyId') || notificationSearchParams.has('commentId');
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
                const [friendsData, requestsData, feedData, blockedData, blockersData] = await Promise.all([
                    getFriends(),
                    getFriendRequests(),
                    getSocialFeed(),
                    getBlockedUsers(),
                    getBlockers(),
                ]);

                setFriends(friendsData ?? []);
                setRequests(requestsData ?? { incoming: [], outgoing: [] });
                setFeed(feedData ?? []);
                setBlockedUsers(blockedData ?? []);
                setBlockers(blockersData ?? []);
                window.dispatchEvent(new Event('howly:social-requests-updated'));
            } catch (err) {
                if (!silent) {
                    setError(err.message);
                }
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

    // After the feed loads, scroll the target story card into view.
    // Uses a ref guard so the scroll never re-fires from background feed polls.
    useEffect(() => {
        if (!targetStoryId || feed.length === 0 || hasScrolledRef.current) return;
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
            const el = document.querySelector(`[data-story-id="${targetStoryId}"]`);
            el?.scrollIntoView({ behavior: 'auto', block: 'center' });
        }, 150);
        return () => {
            cancelled = true;
            cleanupEvents.forEach((cleanup) => cleanup());
            clearTimeout(timer);
        };
    }, [targetStoryId, feed]);

    function handleActivePanelChange(nextPanel) {
        setActivePanel(nextPanel);

        if (nextPanel === 'requests') {
            void refreshSocialData({ silent: true });
        }
    }

    const handleTargetCommentHandled = useCallback(() => {
        setNotificationJump(null);
    }, []);

    function addOutgoingRequest(request) {
        setRequests((currentRequests) => ({
            incoming: currentRequests.incoming ?? [],
            outgoing: [request, ...(currentRequests.outgoing ?? [])],
        }));
    }

    function acceptRequestLocally(requestId, friendship) {
        setRequests((currentRequests) => ({
            incoming: (currentRequests.incoming ?? []).filter((request) => request.id !== requestId),
            outgoing: currentRequests.outgoing ?? [],
        }));
        setFriends((currentFriends) => [friendship, ...currentFriends]);
        setNotice('Friend request accepted');
        setActivePanel('friends');
        window.dispatchEvent(new Event('howly:social-requests-updated'));
        void refreshSocialData({ silent: true });
    }

    async function sendRequestToUser(targetUser, { closeProfile = false } = {}) {
        setIsSubmitting(true);
        setError('');
        setNotice('');

        try {
            const request = await sendFriendRequest(targetUser.id);

            addOutgoingRequest(request);
            setNotice(`Friend request sent to ${getDisplayName(targetUser)}`);
            window.dispatchEvent(new Event('howly:social-requests-updated'));
            void refreshSocialData({ silent: true });

            if (closeProfile) {
                setSelectedProfileUser(null);
            }
        } catch (err) {
            setError(getSocialErrorMessage(err, targetUser));
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
                setRequests(event.detail);
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
        setNotice('');

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
        setNotice('');

        try {
            const response = await acceptFriendRequest(requestId);

            acceptRequestLocally(requestId, response.friendship);
            setSelectedProfileUser(null);
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setBusyRequestId(null);
        }
    }

    async function handleAcceptRequest(requestId) {
        setBusyRequestId(requestId);
        setError('');
        setNotice('');

        try {
            const response = await acceptFriendRequest(requestId);

            acceptRequestLocally(requestId, response.friendship);
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setBusyRequestId(null);
        }
    }

    async function handleRejectRequest(requestId) {
        setBusyRequestId(requestId);
        setError('');
        setNotice('');

        try {
            await rejectFriendRequest(requestId);
            setRequests((currentRequests) => ({
                incoming: (currentRequests.incoming ?? []).filter((request) => request.id !== requestId),
                outgoing: currentRequests.outgoing ?? [],
            }));
            setNotice('Friend request rejected');
            window.dispatchEvent(new Event('howly:social-requests-updated'));
            void refreshSocialData({ silent: true });
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setBusyRequestId(null);
        }
    }

    async function handleDeleteFriend(friendshipId, friend) {
        setBusyFriendId(friendshipId);
        setError('');
        setNotice('');

        try {
            await deleteFriend(friendshipId);
            setFriends((currentFriends) => currentFriends.filter((friendship) => friendship.id !== friendshipId));
            setFeed((currentFeed) => currentFeed.filter((post) => !sameId(post.user?.id, friend?.id)));
            setNotice(`${getDisplayName(friend)} removed from your friends`);
            void refreshSocialData({ silent: true });
        } catch (err) {
            setError(getSocialErrorMessage(err));
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
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setBusyPostId(null);
        }
    }

    async function handleOpenStoryLikes(post, loadedLikers = []) {
        if (!post.likeCount) {
            return;
        }

        setBusyPostId(post.id);
        setError('');

        try {
            const likers = loadedLikers.length === post.likeCount
                ? loadedLikers
                : await getStoryLikes(post.id);

            setSelectedReaction({
                post: {
                    ...post,
                    type: 'story',
                    reactions: (likers ?? []).map((liker) => ({
                        emoji: '💜',
                        user: liker,
                    })),
                },
            });
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setBusyPostId(null);
        }
    }

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
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setBusyPostId(null);
        }
    }

    async function handleReactFromDialog(post, emoji) {
        if (post.type === 'story') {
            await handleToggleStoryLike(post);
            return;
        }

        await handleReactToMilestone(post, emoji);
    }

    async function handleBlockUser(targetUserId) {
        try {
            setIsSubmitting(true);
            setError('');
            await blockUser(targetUserId);
            const blockedData = await getBlockedUsers();
            setBlockedUsers(blockedData ?? []);
            void refreshSocialData({ silent: true });
            setSelectedProfileUser(null);
            setNotice('User blocked successfully.');
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleUnblockUser(targetUserId) {
        try {
            setIsSubmitting(true);
            setError('');
            await unblockUser(targetUserId);
            const blockedData = await getBlockedUsers();
            setBlockedUsers(blockedData ?? []);
            setNotice('User unblocked successfully.');
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    const isSelectedUserBlocked = selectedProfileUser
        ? isBlockedByRelationship(selectedProfileUser, blockedUsers, blockers)
        : false;

    return (
        <Page theme="forest" contentClassName="max-w-[112rem]">
            <Heading title="Social" subtitle="See what your friends are building." streakDays={user?.streak ?? 0} />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,22rem)] lg:items-start xl:gap-12">
                <SocialFeed
                    feed={feed}
                    isLoading={isLoading}
                    busyPostId={busyPostId}
                    currentUserId={user?.id}
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
                />

                <FriendsPanel
                    activePanel={activePanel}
                    friends={friends}
                    requests={requests}
                    usernameQuery={usernameQuery}
                    searchResults={searchResults}
                    pendingFriendRequestCount={pendingFriendRequestCount}
                    notice={notice}
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
                getRelationship={getProfileRelationship}
            />
            <UserPreviewDialog
                user={selectedProfileUser}
                relationship={getProfileRelationship(selectedProfileUser)}
                busy={isSubmitting || busyRequestId !== null}
                isBlocked={isSelectedUserBlocked}
                onClose={() => setSelectedProfileUser(null)}
                onAddFriend={handleSendProfileFriendRequest}
                onAcceptRequest={handleAcceptProfileFriendRequest}
                onBlock={handleBlockUser}
                onUnblock={handleUnblockUser}
            />
        </Page>
    );
}

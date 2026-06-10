import { useEffect, useState } from 'react';
import { Page, Heading } from '@/components/layout';
import { FriendsPanel } from '@/components/social/FriendsPanel.jsx';
import { ReactionUsersDialog } from '@/components/social/ReactionUsersDialog.jsx';
import { SocialFeed } from '@/components/social/SocialFeed.jsx';
import { UserPreviewDialog } from '@/components/social/UserPreviewDialog.jsx';
import { getSocialErrorMessage, getDisplayName, sameId } from '@/components/social/socialHelpers.js';
import {
    acceptFriendRequest,
    deleteFriend,
    getFriendRequests,
    getFriends,
    getSocialFeed,
    rejectFriendRequest,
    reactToMilestone,
    sendFriendRequest,
} from '@/services/socialApi';
import { searchUsers } from '@/services/userApi';
import { useAuth } from '@/context/authContext';

export function SocialPage() {
    const { user } = useAuth();
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
    const [feed, setFeed] = useState([]);
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
    const pendingFriendRequestCount = requests.incoming?.length ?? 0;

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

    async function loadSocialData() {
        setError('');

        try {
            const [friendsData, requestsData, feedData] = await Promise.all([
                getFriends(),
                getFriendRequests(),
                getSocialFeed(),
            ]);

            setFriends(friendsData ?? []);
            setRequests(requestsData ?? { incoming: [], outgoing: [] });
            setFeed(feedData ?? []);
            window.dispatchEvent(new Event('howly:social-requests-updated'));
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        let isMounted = true;

        Promise.all([
            getFriends(),
            getFriendRequests(),
            getSocialFeed(),
        ])
            .then(([friendsData, requestsData, feedData]) => {
                if (!isMounted) {
                    return;
                }

                setFriends(friendsData ?? []);
                setRequests(requestsData ?? { incoming: [], outgoing: [] });
                setFeed(feedData ?? []);
                window.dispatchEvent(new Event('howly:social-requests-updated'));
            })
            .catch((err) => {
                if (isMounted) {
                    setError(err.message);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
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
        setIsSubmitting(true);
        setError('');
        setNotice('');

        try {
            await sendFriendRequest(user.id);
            setUsernameQuery('');
            setSearchResults([]);
            setNotice(`Friend request sent to ${getDisplayName(user)}`);
            await loadSocialData();
        } catch (err) {
            setError(getSocialErrorMessage(err, user));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSendProfileFriendRequest(profileUser) {
        setIsSubmitting(true);
        setError('');
        setNotice('');

        try {
            await sendFriendRequest(profileUser.id);
            setNotice(`Friend request sent to ${getDisplayName(profileUser)}`);
            await loadSocialData();
            setSelectedProfileUser(null);
        } catch (err) {
            setError(getSocialErrorMessage(err, profileUser));
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAcceptProfileFriendRequest(requestId) {
        setBusyRequestId(requestId);
        setError('');
        setNotice('');

        try {
            await acceptFriendRequest(requestId);
            setNotice('Friend request accepted');
            await loadSocialData();
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
            await acceptFriendRequest(requestId);
            setNotice('Friend request accepted');
            await loadSocialData();
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
            setNotice('Friend request rejected');
            await loadSocialData();
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
            setNotice(`${getDisplayName(friend)} removed from your friends`);
            await loadSocialData();
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setBusyFriendId(null);
        }
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
        } catch (err) {
            setError(getSocialErrorMessage(err));
        } finally {
            setBusyPostId(null);
        }
    }

    return (
        <Page theme="forest">
            <Heading title="Social" subtitle="See what your friends are building." streakDays={user?.streak ?? 0} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
                <SocialFeed
                    feed={feed}
                    isLoading={isLoading}
                    busyPostId={busyPostId}
                    onReact={handleReactToMilestone}
                    onOpenReactions={(feedPost) => setSelectedReaction({ post: feedPost })}
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
                    onActivePanelChange={setActivePanel}
                    onUsernameQueryChange={setUsernameQuery}
                    onSearchUsers={handleSearchUsers}
                    onSendFriendRequest={handleSendFriendRequest}
                    onAcceptRequest={handleAcceptRequest}
                    onRejectRequest={handleRejectRequest}
                    onDeleteFriend={handleDeleteFriend}
                    onOpenProfile={setSelectedProfileUser}
                    getRelationship={getProfileRelationship}
                />
            </div>

            <ReactionUsersDialog
                reaction={selectedReaction}
                busy={isSubmitting}
                onClose={() => setSelectedReaction(null)}
                onSelectUser={(reactionUser) => {
                    setSelectedReaction(null);
                    setSelectedProfileUser(reactionUser);
                }}
                onAddFriend={handleSendProfileFriendRequest}
                getRelationship={getProfileRelationship}
            />
            <UserPreviewDialog
                user={selectedProfileUser}
                relationship={getProfileRelationship(selectedProfileUser)}
                busy={isSubmitting || busyRequestId !== null}
                onClose={() => setSelectedProfileUser(null)}
                onAddFriend={handleSendProfileFriendRequest}
                onAcceptRequest={handleAcceptProfileFriendRequest}
            />
        </Page>
    );
}

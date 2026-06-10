import { useEffect, useState } from 'react';
import { Check, MoreVertical, Send, Trash2, X } from 'lucide-react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { CardGrid, ReactionButton } from '@/components/common';
import { FeedPostCard, FriendCard } from '@/components/cards';
import { Page, PageSection, Heading } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    ConfirmationDialog,
    ConfirmationDialogContent,
    ConfirmationDialogDescription,
    ConfirmationDialogFooter,
    ConfirmationDialogHeader,
    ConfirmationDialogTitle,
} from '@/components/ui/confirmation-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    acceptFriendRequest,
    deleteFriend,
    getFriendRequests,
    getFriends,
    getSocialFeed,
    likeMilestone,
    rejectFriendRequest,
    sendFriendRequest,
    unlikeMilestone,
} from '@/services/socialApi';
import { searchUsers } from '@/services/userApi';
import { useAuth } from '@/context/authContext';

function getDisplayName(user) {
    return user?.firstName || user?.username || 'Howly friend';
}

function getUsername(user) {
    return user?.username || 'friend';
}

function buildMilestoneMessage(post) {
    const habitTitle = post?.habit?.title || 'a habit';
    return `${getDisplayName(post?.user)} kept ${habitTitle} going for ${post?.streakDays} days`;
}

function getSocialErrorMessage(error, user) {
    switch (error.code) {
        case 'FRIEND_REQUEST_TO_SELF':
            return 'You cannot send a friend request to yourself';
        case 'FRIEND_REQUEST_RECIPIENT_NOT_FOUND':
            return 'Hmm, that didn\'t work. Check if the username is correct';
        case 'USERS_ALREADY_FRIENDS':
            return `You and ${getDisplayName(user)} are already friends`;
        case 'PENDING_FRIEND_REQUEST_EXISTS':
            return `Friend request to ${getDisplayName(user)} is already sent. Let's wait a bit`;
        case 'PENDING_FRIEND_REQUEST_NOT_FOUND':
            return 'That friend request is no longer available';
        case 'FRIENDSHIP_NOT_FOUND':
            return 'That friend is no longer in your friend list';
        case 'MILESTONE_POST_NOT_FOUND':
            return 'That milestone is no longer available';
        case 'CANNOT_LIKE_OWN_MILESTONE':
            return 'You cannot like your own milestone';
        default:
            return error.message;
    }
}

function EmptyState({ children }) {
    return (
        <Card className="border-theme-text/10 bg-theme-text/8 text-theme-text shadow-xl shadow-black/20 backdrop-blur">
            <CardContent>
                <p className="text-sm text-theme-text-soft">{children}</p>
            </CardContent>
        </Card>
    );
}

function FriendRequestCard({ request, busy, onAccept, onReject }) {
    return (
        <Card className="border-theme-text/10 bg-theme-text/8 text-theme-text shadow-xl shadow-black/20 backdrop-blur">
            <CardContent className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{getDisplayName(request.requester)}</h3>
                    <p className="truncate text-sm text-theme-text-soft">@{getUsername(request.requester)}</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="icon"
                        className="bg-theme-success text-theme-on-success hover:bg-theme-success/85"
                        aria-label="Accept friend request"
                        disabled={busy}
                        onClick={() => onAccept(request.id)}
                    >
                        <Check aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        className="border border-theme-text/15 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
                        aria-label="Reject friend request"
                        disabled={busy}
                        onClick={() => onReject(request.id)}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function FriendActions({ friend, friendshipId, busy, onDelete }) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const friendName = getDisplayName(friend);

    return (
        <div className="flex items-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text"
                        aria-label={`Open actions for ${friendName}`}
                        disabled={busy}
                    >
                        <MoreVertical aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 border-theme-text/20 bg-theme-bg text-theme-text-soft">
                    <DropdownMenuItem
                        className="cursor-pointer focus:bg-theme-surface focus:text-theme-text"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete friend
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmationDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <ConfirmationDialogContent className="border-0 bg-theme-surface p-8 text-theme-text shadow-2xl sm:max-w-md">
                    <ConfirmationDialogHeader className="space-y-3 text-center">
                        <ConfirmationDialogTitle className="text-xl font-bold">
                            Remove this friend?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="text-sm text-theme-text-soft">
                            Are you sure you want to remove this friend?
                        </ConfirmationDialogDescription>
                    </ConfirmationDialogHeader>
                    <ConfirmationDialogFooter className="mt-4 gap-3 sm:justify-center">
                        <AlertDialogPrimitive.Cancel asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="border-theme-text/15 bg-theme-text/10 text-theme-text hover:bg-theme-text/20 hover:text-theme-text"
                            >
                                Cancel
                            </Button>
                        </AlertDialogPrimitive.Cancel>
                        <AlertDialogPrimitive.Action asChild>
                            <Button
                                type="button"
                                className="bg-theme-danger text-white hover:bg-theme-danger/85"
                                disabled={busy}
                                onClick={() => onDelete(friendshipId, friend)}
                            >
                                Delete friend
                            </Button>
                        </AlertDialogPrimitive.Action>
                    </ConfirmationDialogFooter>
                </ConfirmationDialogContent>
            </ConfirmationDialog>
        </div>
    );
}

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

    async function handleToggleLike(post) {
        setBusyPostId(post.id);
        setError('');

        try {
            const response = post.likedByCurrentUser
                ? await unlikeMilestone(post.id)
                : await likeMilestone(post.id);

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

            <PageSection title="Add Friend" width="md">
                <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearchUsers}>
                    <Input
                        value={usernameQuery}
                        placeholder="Search username"
                        className="border-theme-text/20 bg-theme-text/10 text-theme-text placeholder:text-theme-text-soft"
                        disabled={isSearching}
                        onChange={(event) => setUsernameQuery(event.target.value)}
                    />
                    <Button
                        type="submit"
                        className="bg-theme-invert text-theme-invert-text hover:bg-theme-invert/85"
                        disabled={isSearching}
                    >
                        <Send aria-hidden="true" />
                        Search
                    </Button>
                </form>
                {searchResults.length ? (
                    <div className="grid gap-2">
                        {searchResults.map((user) => (
                            <Card
                                key={user.id}
                                className="border-theme-text/10 bg-theme-text/8 text-theme-text shadow-xl shadow-black/20 backdrop-blur"
                            >
                                <CardContent className="flex flex-wrap items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate font-semibold">{getDisplayName(user)}</h3>
                                        <p className="truncate text-sm text-theme-text-soft">@{getUsername(user)}</p>
                                    </div>
                                    <Button
                                        type="button"
                                        className="bg-theme-invert text-theme-invert-text hover:bg-theme-invert/85"
                                        disabled={isSubmitting}
                                        onClick={() => handleSendFriendRequest(user)}
                                    >
                                        <Send aria-hidden="true" />
                                        Add
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : null}
                {notice ? <p className="text-sm text-theme-success">{notice}</p> : null}
                {error ? <p className="text-sm text-red-900">{error}</p> : null}
            </PageSection>

            <PageSection title="Friend Requests">
                {isLoading ? (
                    <EmptyState>Loading requests</EmptyState>
                ) : requests.incoming?.length ? (
                    <CardGrid>
                        {requests.incoming.map((request) => (
                            <FriendRequestCard
                                key={request.id}
                                request={request}
                                busy={busyRequestId === request.id}
                                onAccept={handleAcceptRequest}
                                onReject={handleRejectRequest}
                            />
                        ))}
                    </CardGrid>
                ) : (
                    <EmptyState>No pending requests</EmptyState>
                )}
            </PageSection>

            <PageSection title="Friends">
                {isLoading ? (
                    <EmptyState>Loading friends</EmptyState>
                ) : friends.length ? (
                    <CardGrid>
                        {friends.map(({ id, friend }) => (
                            <FriendCard
                                key={id}
                                name={getDisplayName(friend)}
                                username={getUsername(friend)}
                                streakDays={friend?.streak ?? 0}
                                action={(
                                    <FriendActions
                                        friend={friend}
                                        friendshipId={id}
                                        busy={busyFriendId === id}
                                        onDelete={handleDeleteFriend}
                                    />
                                )}
                            />
                        ))}
                    </CardGrid>
                ) : (
                    <EmptyState>No friends yet</EmptyState>
                )}
            </PageSection>

            <PageSection title="Friend Feed">
                {isLoading ? (
                    <EmptyState>Loading feed</EmptyState>
                ) : feed.length ? (
                    <CardGrid>
                        {feed.map((post) => (
                            <FeedPostCard
                                key={post.id}
                                authorName={getDisplayName(post.user)}
                                companionName={getDisplayName(post.user)}
                                message={buildMilestoneMessage(post)}
                            >
                                <ReactionButton
                                    liked={post.likedByCurrentUser}
                                    count={post.likeCount}
                                    label="Like milestone"
                                    disabled={busyPostId === post.id}
                                    onClick={() => handleToggleLike(post)}
                                />
                            </FeedPostCard>
                        ))}
                    </CardGrid>
                ) : (
                    <EmptyState>No milestones today</EmptyState>
                )}
            </PageSection>
        </Page>
    );
}

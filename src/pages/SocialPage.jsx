import { useEffect, useState } from 'react';
import { Check, MoreVertical, Plus, Send, Trash2, X } from 'lucide-react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { CardGrid } from '@/components/common';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

function getDisplayName(user) {
    return user?.firstName || user?.username || 'Howly friend';
}

function getUsername(user) {
    return user?.username || 'friend';
}

function sameId(firstId, secondId) {
    return firstId?.toString?.() === secondId?.toString?.();
}

function buildMilestoneTitle(post) {
    const habitTitle = post?.habit?.title || 'Habit';
    const habitFrequency = post?.habit?.frequency || 'Habit';

    return `Unlocked a ${post?.streakDays}-day milestone in ${habitFrequency} ${habitTitle}!`;
}

function formatRelativeTime(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));

    if (elapsedMinutes < 1) {
        return 'Just now';
    }

    if (elapsedMinutes === 1) {
        return '1 minute ago';
    }

    if (elapsedMinutes < 60) {
        return `${elapsedMinutes} minutes ago`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);

    if (elapsedHours === 1) {
        return '1 hour ago';
    }

    if (elapsedHours < 24) {
        return `${elapsedHours} hours ago`;
    }

    const elapsedDays = Math.floor(elapsedHours / 24);

    if (elapsedDays === 1) {
        return '1 day ago';
    }

    if (elapsedDays < 7) {
        return `${elapsedDays} days ago`;
    }

    const elapsedWeeks = Math.floor(elapsedDays / 7);

    return elapsedWeeks === 1 ? '1 week ago' : `${elapsedWeeks} weeks ago`;
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
        case 'MILESTONE_REACTION_INVALID':
            return 'Choose one of the available milestone reactions';
        case 'CANNOT_LIKE_OWN_MILESTONE':
            return 'You cannot like your own milestone';
        default:
            return error.message;
    }
}

function EmptyState({ children }) {
    return (
        <Card className="border-white/10 bg-white/8 text-slate-200 shadow-xl shadow-slate-950/20 backdrop-blur">
            <CardContent>
                <p className="text-sm text-slate-300">{children}</p>
            </CardContent>
        </Card>
    );
}

function UserAvatar({ user, className = 'size-12' }) {
    const name = getDisplayName(user);
    const initial = name.trim().charAt(0).toUpperCase() || '?';

    return (
        <div className={`flex ${className} shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-300 text-lg font-bold text-slate-950`}>
            {user?.profilePictureUrl ? (
                <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
            ) : (
                initial
            )}
        </div>
    );
}

function FriendRequestCard({ request, busy, onAccept, onReject }) {
    return (
        <Card className="border-white/10 bg-white/8 text-slate-100 shadow-xl shadow-slate-950/20 backdrop-blur">
            <CardContent className="flex flex-wrap items-center gap-3">
                <UserAvatar user={request.requester} />

                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{getDisplayName(request.requester)}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="truncate text-sm text-slate-300">@{getUsername(request.requester)}</p>
                        <p className="shrink-0 text-sm font-medium text-slate-200">
                            🔥 {request.requester?.streak ?? 0} days
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="icon"
                        className="bg-emerald-700 text-white hover:bg-emerald-600"
                        aria-label="Accept friend request"
                        disabled={busy}
                        onClick={() => onAccept(request.id)}
                    >
                        <Check aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        className="border border-white/15 bg-white/10 text-slate-100 hover:bg-white/20"
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
                        className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                        aria-label={`Open actions for ${friendName}`}
                        disabled={busy}
                    >
                        <MoreVertical aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 border-slate-800 bg-slate-950 text-slate-300">
                    <DropdownMenuItem
                        className="cursor-pointer focus:bg-slate-800 focus:text-white"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete friend
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmationDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <ConfirmationDialogContent className="border-0 bg-[#1e1b3a] p-8 text-white shadow-2xl sm:max-w-md">
                    <ConfirmationDialogHeader className="space-y-3 text-center">
                        <ConfirmationDialogTitle className="text-xl font-bold">
                            Remove this friend?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="text-sm text-slate-300">
                            Are you sure you want to remove this friend?
                        </ConfirmationDialogDescription>
                    </ConfirmationDialogHeader>
                    <ConfirmationDialogFooter className="mt-4 gap-3 sm:justify-center">
                        <AlertDialogPrimitive.Cancel asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                            >
                                Cancel
                            </Button>
                        </AlertDialogPrimitive.Cancel>
                        <AlertDialogPrimitive.Action asChild>
                            <Button
                                type="button"
                                className="bg-red-500 text-white hover:bg-red-400"
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

function MilestoneReactionPicker({ post, busy, onReact, onOpenReactions }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
                {MILESTONE_REACTION_EMOJIS.map((emoji) => {
                    const isSelected = post.currentUserReaction === emoji;

                    return (
                        <button
                            key={emoji}
                            type="button"
                            className={`flex size-9 items-center justify-center rounded-full text-lg transition hover:bg-white/10 ${isSelected ? 'bg-violet-400/25 ring-1 ring-violet-200/60' : ''}`}
                            aria-label={`React with ${emoji}`}
                            aria-pressed={isSelected}
                            disabled={busy}
                            onClick={() => onReact(post, emoji)}
                        >
                            {emoji}
                        </button>
                    );
                })}
            </div>

            {post.reactionCounts?.length ? (
                <div className="flex flex-wrap gap-2">
                    {post.reactionCounts.map((reaction) => (
                        <button
                            key={reaction.emoji}
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-slate-100 transition hover:bg-white/20"
                            onClick={() => onOpenReactions(post)}
                        >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.count}</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function ReactionUsersDialog({
    reaction,
    busy,
    onClose,
    onSelectUser,
    onAddFriend,
    getRelationship,
}) {
    const users = reaction?.post?.reactions ?? [];

    return (
        <Dialog open={Boolean(reaction)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="border-white/10 bg-[#24213d] text-white shadow-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Reactions
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                        People who reacted to this milestone
                    </DialogDescription>
                </DialogHeader>

                <div className="grid max-h-[23rem] gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                    {users.length ? users.map((reactionUser) => {
                        const relationship = getRelationship(reactionUser.user);
                        const canAddFriend = relationship.status === 'none';
                        const isSelf = relationship.status === 'self';

                        return (
                            <div
                                key={`${reactionUser.emoji}-${reactionUser.user?.id}`}
                                className="flex items-center gap-3 rounded-xl bg-white/8 p-3 text-left"
                            >
                                <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition hover:bg-white/8"
                                    onClick={() => onSelectUser(reactionUser.user)}
                                >
                                    <UserAvatar user={reactionUser.user} className="size-11" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{getDisplayName(reactionUser.user)}</p>
                                        <p className="truncate text-sm text-slate-300">@{getUsername(reactionUser.user)}</p>
                                    </div>
                                    <span className="text-xl" aria-hidden="true">{reactionUser.emoji || '💜'}</span>
                                </button>

                                {!isSelf ? (
                                    <Button
                                        type="button"
                                        size="icon"
                                        className={canAddFriend
                                            ? 'size-9 shrink-0 rounded-full bg-violet-500 text-white hover:bg-violet-400'
                                            : 'size-9 shrink-0 rounded-full bg-white/10 text-slate-400 hover:bg-white/10'}
                                        aria-label={`Add ${getDisplayName(reactionUser.user)} as friend`}
                                        disabled={!canAddFriend || busy}
                                        onClick={() => onAddFriend(reactionUser.user)}
                                    >
                                        <Plus aria-hidden="true" />
                                    </Button>
                                ) : null}
                            </div>
                        );
                    }) : (
                        <p className="text-sm text-slate-300">No reactions yet</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function UserPreviewDialog({
    user,
    relationship,
    busy,
    onClose,
    onAddFriend,
    onAcceptRequest,
}) {
    const isOpen = Boolean(user);

    function renderAction() {
        if (!user || relationship.status === 'self') {
            return null;
        }

        if (relationship.status === 'friends') {
            return (
                <Button type="button" disabled className="bg-white/10 text-slate-200">
                    Friends
                </Button>
            );
        }

        if (relationship.status === 'outgoing') {
            return (
                <Button type="button" disabled className="bg-white/10 text-slate-200">
                    Request sent
                </Button>
            );
        }

        if (relationship.status === 'incoming') {
            return (
                <Button
                    type="button"
                    className="bg-emerald-700 text-white hover:bg-emerald-600"
                    disabled={busy}
                    onClick={() => onAcceptRequest(relationship.requestId)}
                >
                    Accept request
                </Button>
            );
        }

        return (
            <Button
                type="button"
                className="bg-violet-500 text-white hover:bg-violet-400"
                disabled={busy}
                onClick={() => onAddFriend(user)}
            >
                <Plus aria-hidden="true" />
                Add friend
            </Button>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="border-white/10 bg-[#24213d] text-white shadow-2xl sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="sr-only">User profile</DialogTitle>
                    <DialogDescription className="sr-only">
                        Small profile preview with friend action
                    </DialogDescription>
                </DialogHeader>

                {user ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <UserAvatar user={user} className="size-20" />
                        <div>
                            <h3 className="text-2xl font-bold">{getDisplayName(user)}</h3>
                            <p className="text-slate-300">@{getUsername(user)}</p>
                            <p className="mt-2 text-sm font-medium text-slate-200">🔥 {user?.streak ?? 0} days</p>
                        </div>
                        {relationship.status === 'self' ? (
                            <p className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">This is you</p>
                        ) : renderAction()}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
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
                <PageSection title="Feed" className="min-w-0">
                    {isLoading ? (
                        <EmptyState>Loading feed</EmptyState>
                    ) : feed.length ? (
                        <CardGrid columns={1}>
                            {feed.map((post) => (
                                <FeedPostCard
                                    key={post.id}
                                    authorName={getDisplayName(post.user)}
                                    authorUsername={getUsername(post.user)}
                                    authorAvatarSrc={post.user?.profilePictureUrl}
                                    meta={formatRelativeTime(post.createdAt)}
                                    companionName={post.companion?.name || 'Howly'}
                                    milestoneTitle={buildMilestoneTitle(post)}
                                >
                                    <MilestoneReactionPicker
                                        post={post}
                                        busy={busyPostId === post.id}
                                        onReact={handleReactToMilestone}
                                        onOpenReactions={(feedPost) => setSelectedReaction({ post: feedPost })}
                                    />
                                </FeedPostCard>
                            ))}
                        </CardGrid>
                    ) : (
                        <EmptyState>No milestones today</EmptyState>
                    )}
                </PageSection>

                <aside className="space-y-3 lg:sticky lg:top-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-lg border border-white/10 bg-white/10 p-1 text-sm text-slate-300">
                            <button
                                type="button"
                                className={`rounded-md px-3 py-2 font-medium transition ${activePanel === 'friends' ? 'bg-white text-slate-950' : 'hover:bg-white/10 hover:text-white'}`}
                                onClick={() => setActivePanel('friends')}
                            >
                                Friends
                            </button>
                            <button
                                type="button"
                                className={`flex items-center gap-2 rounded-md px-3 py-2 font-medium transition ${activePanel === 'requests' ? 'bg-white text-slate-950' : 'hover:bg-white/10 hover:text-white'}`}
                                onClick={() => setActivePanel('requests')}
                            >
                                Friend Requests
                                {pendingFriendRequestCount > 0 ? (
                                    <span className="flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold leading-5 text-white">
                                        {pendingFriendRequestCount}
                                    </span>
                                ) : null}
                            </button>
                        </div>
                        <Button
                            type="button"
                            className="bg-violet-500 text-white hover:bg-violet-400"
                            onClick={() => setActivePanel('add')}
                        >
                            <Plus aria-hidden="true" />
                            Add Friend
                        </Button>
                    </div>

                    <Card className="border-white/10 bg-white/8 text-slate-100 shadow-xl shadow-slate-950/20 backdrop-blur">
                        <CardContent className="space-y-3">
                            {activePanel === 'friends' ? (
                                isLoading ? (
                                    <EmptyState>Loading friends</EmptyState>
                                ) : friends.length ? (
                                    <div className="grid gap-3">
                                        {friends.map(({ id, friend }) => (
                                            <FriendCard
                                                key={id}
                                                name={getDisplayName(friend)}
                                                username={getUsername(friend)}
                                                streakDays={friend?.streak ?? 0}
                                                avatarSrc={friend?.profilePictureUrl}
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
                                    </div>
                                ) : (
                                    <EmptyState>No friends yet</EmptyState>
                                )
                            ) : null}

                            {activePanel === 'requests' ? (
                                isLoading ? (
                                    <EmptyState>Loading requests</EmptyState>
                                ) : requests.incoming?.length ? (
                                    <div className="grid gap-3">
                                        {requests.incoming.map((request) => (
                                            <FriendRequestCard
                                                key={request.id}
                                                request={request}
                                                busy={busyRequestId === request.id}
                                                onAccept={handleAcceptRequest}
                                                onReject={handleRejectRequest}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState>No pending requests</EmptyState>
                                )
                            ) : null}

                            {activePanel === 'add' ? (
                                <div className="space-y-3">
                                    <form className="flex flex-col gap-2 sm:flex-row lg:flex-col" onSubmit={handleSearchUsers}>
                                        <Input
                                            value={usernameQuery}
                                            placeholder="Search username"
                                            className="border-white/20 bg-white/10 text-slate-50 placeholder:text-slate-300"
                                            disabled={isSearching}
                                            onChange={(event) => setUsernameQuery(event.target.value)}
                                        />
                                        <Button
                                            type="submit"
                                            className="bg-white text-slate-950 hover:bg-slate-200"
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
                                                    className="border-white/10 bg-white/8 text-slate-100 shadow-xl shadow-slate-950/20 backdrop-blur"
                                                >
                                                    <CardContent className="flex flex-wrap items-center gap-3">
                                                        <UserAvatar user={user} className="size-10" />
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="truncate font-semibold">{getDisplayName(user)}</h3>
                                                            <p className="truncate text-sm text-slate-300">@{getUsername(user)}</p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            className="bg-white text-slate-950 hover:bg-slate-200"
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
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
                    {error ? <p className="text-sm text-red-300">{error}</p> : null}
                </aside>
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
const MILESTONE_REACTION_EMOJIS = ['🎉', '🔥', '👏', '💜', '✨'];

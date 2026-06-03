import { useEffect, useMemo, useState } from 'react';
import { Check, Send, X } from 'lucide-react';
import { CardGrid, ReactionButton } from '@/components/common';
import { FeedPostCard, FriendCard } from '@/components/cards';
import { Page, PageSection, Heading } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    acceptFriendRequest,
    getFriendRequests,
    getFriends,
    getSocialFeed,
    likeMilestone,
    rejectFriendRequest,
    sendFriendRequest,
    unlikeMilestone,
} from '@/services/socialApi';

function getDisplayName(user) {
    return user?.fullName || user?.username || 'Howly friend';
}

function getUsername(user) {
    return user?.username || 'friend';
}

function buildMilestoneMessage(post) {
    const habitTitle = post?.habit?.title || 'a habit';
    return `${getDisplayName(post?.user)} kept ${habitTitle} going for ${post?.streakDays} days`;
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

function FriendRequestCard({ request, busy, onAccept, onReject }) {
    return (
        <Card className="border-white/10 bg-white/8 text-slate-100 shadow-xl shadow-slate-950/20 backdrop-blur">
            <CardContent className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{getDisplayName(request.requester)}</h3>
                    <p className="truncate text-sm text-slate-300">@{getUsername(request.requester)}</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="icon"
                        className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                        aria-label="Accept friend request"
                        disabled={busy}
                        onClick={() => onAccept(request.id)}
                    >
                        <Check aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="destructive"
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

export function SocialPage() {
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
    const [feed, setFeed] = useState([]);
    const [recipientId, setRecipientId] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [busyRequestId, setBusyRequestId] = useState(null);
    const [busyPostId, setBusyPostId] = useState(null);

    const outgoingCount = useMemo(() => requests.outgoing?.length ?? 0, [requests.outgoing]);

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

    async function handleSendFriendRequest(event) {
        event.preventDefault();

        if (!recipientId.trim()) {
            setError('recipientId is required');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setNotice('');

        try {
            await sendFriendRequest(recipientId.trim());
            setRecipientId('');
            setNotice('Friend request sent');
            await loadSocialData();
        } catch (err) {
            setError(err.message);
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
            setError(err.message);
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
            setError(err.message);
        } finally {
            setBusyRequestId(null);
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
            setError(err.message);
        } finally {
            setBusyPostId(null);
        }
    }

    return (
        <Page background="forest">
            <Heading title="Social" subtitle="See what your friends are building." streakDays={100} />

            <PageSection title="Add Friend" width="md">
                <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSendFriendRequest}>
                    <Input
                        value={recipientId}
                        placeholder="Recipient user id"
                        disabled={isSubmitting}
                        onChange={(event) => setRecipientId(event.target.value)}
                    />
                    <Button
                        type="submit"
                        className="bg-white text-slate-950 hover:bg-slate-200"
                        disabled={isSubmitting}
                    >
                        <Send aria-hidden="true" />
                        Send
                    </Button>
                </form>
                {outgoingCount > 0 ? (
                    <p className="text-sm text-slate-300">{outgoingCount} pending sent</p>
                ) : null}
                {notice ? <p className="text-sm text-emerald-200">{notice}</p> : null}
                {error ? <p className="text-sm text-red-200">{error}</p> : null}
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

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPanelRow } from '@/components/social/UserPanelRow.jsx';
import { sameId } from '@/components/social/socialHelpers.js';

const REACTION_USER_PAGE_SIZE = 20;

function normalizeReactionUserPage(response) {
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

export function ReactionUsersDialog({
    reaction,
    busy,
    currentUserId,
    onClose,
    onSelectUser,
    onAddFriend,
    onReact,
    onLoadUsers,
    getRelationship,
}) {
    const [users, setUsers] = useState([]);
    const [hasMoreUsers, setHasMoreUsers] = useState(false);
    const [nextUsersOffset, setNextUsersOffset] = useState(0);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState(false);
    const isStory = reaction?.post?.type === 'story';
    const sortedUsers = [...users].sort((firstReaction, secondReaction) => {
        const firstIsCurrentUser = sameId(firstReaction.user?.id, currentUserId);
        const secondIsCurrentUser = sameId(secondReaction.user?.id, currentUserId);

        if (firstIsCurrentUser === secondIsCurrentUser) {
            return 0;
        }

        return firstIsCurrentUser ? -1 : 1;
    });

    useEffect(() => {
        if (!reaction?.post?.id) {
            setUsers([]);
            setHasMoreUsers(false);
            setNextUsersOffset(0);
            return undefined;
        }

        let isCurrent = true;

        async function loadInitialUsers() {
            setIsLoadingUsers(true);

            try {
                const response = onLoadUsers
                    ? await onLoadUsers(reaction.post, {
                        limit: REACTION_USER_PAGE_SIZE,
                        offset: 0,
                    })
                    : reaction.post.reactions ?? [];
                const page = normalizeReactionUserPage(response);

                if (!isCurrent) return;

                setUsers(page.items);
                setHasMoreUsers(page.hasMore);
                setNextUsersOffset(Math.max(page.nextOffset, page.items.length));
            } catch {
                if (!isCurrent) return;
                setUsers([]);
                setHasMoreUsers(false);
                setNextUsersOffset(0);
            } finally {
                if (isCurrent) {
                    setIsLoadingUsers(false);
                }
            }
        }

        loadInitialUsers();

        return () => {
            isCurrent = false;
        };
    }, [onLoadUsers, reaction?.post?.id]);

    async function handleLoadMoreUsers() {
        if (!reaction?.post || isLoadingMoreUsers || !hasMoreUsers || !onLoadUsers) {
            return;
        }

        setIsLoadingMoreUsers(true);

        try {
            const response = await onLoadUsers(reaction.post, {
                limit: REACTION_USER_PAGE_SIZE,
                offset: nextUsersOffset,
            });
            const page = normalizeReactionUserPage(response);

            setUsers((currentUsers) => {
                const seenKeys = new Set(currentUsers.map((reactionUser) => `${reactionUser.emoji}-${reactionUser.user?.id}`));
                const nextItems = page.items.filter((reactionUser) => {
                    const key = `${reactionUser.emoji}-${reactionUser.user?.id}`;

                    if (seenKeys.has(key)) {
                        return false;
                    }

                    seenKeys.add(key);
                    return true;
                });

                return [...currentUsers, ...nextItems];
            });
            setHasMoreUsers(page.hasMore);
            setNextUsersOffset(Math.max(page.nextOffset, nextUsersOffset + page.items.length));
        } catch {
            // Keep the already loaded users visible if older users fail to load.
        } finally {
            setIsLoadingMoreUsers(false);
        }
    }

    return (
        <Dialog open={Boolean(reaction)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="border-theme-text/10 bg-theme-surface text-theme-text shadow-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Reactions
                    </DialogTitle>
                    <DialogDescription className="text-theme-text-soft">
                        {isStory ? 'People who liked this picture post' : 'People who reacted to this milestone'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid max-h-[23rem] gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                    {isLoadingUsers ? (
                        <p className="text-sm text-theme-text-soft">Loading...</p>
                    ) : sortedUsers.length ? (
                        <>
                        {sortedUsers.map((reactionUser) => {
                        const relationship = getRelationship(reactionUser.user);
                        const isCurrentUserReaction = sameId(reactionUser.user?.id, currentUserId);
                        const emoji = reactionUser.emoji || '💜';

                        return (
                            <UserPanelRow
                                key={`${reactionUser.emoji}-${reactionUser.user?.id}`}
                                user={reactionUser.user}
                                busy={busy}
                                relationship={relationship}
                                onOpenProfile={onSelectUser}
                                onAddFriend={onAddFriend}
                                trailingContent={isCurrentUserReaction ? (
                                    <button
                                        type="button"
                                        className="rounded-full px-2 py-1 text-xl transition hover:bg-theme-text/10 disabled:opacity-60"
                                        aria-label={`Remove your ${emoji} reaction`}
                                        disabled={busy}
                                        onClick={() => onReact(reaction.post, emoji)}
                                    >
                                        {emoji}
                                    </button>
                                ) : (
                                    <span className="px-2 py-1 text-xl" aria-hidden="true">
                                        {emoji}
                                    </span>
                                )}
                            />
                        );
                    })}
                    {hasMoreUsers ? (
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full text-theme-accent-soft hover:bg-violet-400/15 hover:text-theme-accent-soft"
                            disabled={isLoadingMoreUsers}
                            onClick={handleLoadMoreUsers}
                        >
                            {isLoadingMoreUsers ? 'Loading...' : 'Load more'}
                        </Button>
                    ) : null}
                        </>
                    ) : (
                        <p className="text-sm text-theme-text-soft">No reactions yet</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

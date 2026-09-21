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
const REACTION_REMOVE_ANIMATION_MS = 220;

function getReactionUserKey(reactionUser) {
    const emoji = reactionUser.emoji || '💜';
    const userId = reactionUser.user?.id ?? reactionUser.user?._id ?? 'unknown';

    return `${emoji}-${userId}`;
}

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
    const [removingReactionKeys, setRemovingReactionKeys] = useState(new Set());
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
            setRemovingReactionKeys(new Set());
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
                setRemovingReactionKeys(new Set());
            } catch {
                if (!isCurrent) return;
                setUsers([]);
                setHasMoreUsers(false);
                setNextUsersOffset(0);
                setRemovingReactionKeys(new Set());
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
                const seenKeys = new Set(currentUsers.map(getReactionUserKey));
                const nextItems = page.items.filter((reactionUser) => {
                    const key = getReactionUserKey(reactionUser);

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

    async function handleRemoveOwnReaction(reactionUser, emoji) {
        const reactionKey = getReactionUserKey(reactionUser);

        if (removingReactionKeys.has(reactionKey)) {
            return;
        }

        setRemovingReactionKeys((currentKeys) => {
            const nextKeys = new Set(currentKeys);
            nextKeys.add(reactionKey);
            return nextKeys;
        });

        const result = await onReact(reaction.post, emoji);

        if (!result) {
            setRemovingReactionKeys((currentKeys) => {
                const nextKeys = new Set(currentKeys);
                nextKeys.delete(reactionKey);
                return nextKeys;
            });
            return;
        }

        window.setTimeout(() => {
            setUsers((currentUsers) =>
                currentUsers.filter((currentReactionUser) =>
                    getReactionUserKey(currentReactionUser) !== reactionKey
                )
            );
            setRemovingReactionKeys((currentKeys) => {
                const nextKeys = new Set(currentKeys);
                nextKeys.delete(reactionKey);
                return nextKeys;
            });
            setNextUsersOffset((currentOffset) => Math.max(0, currentOffset - 1));
        }, REACTION_REMOVE_ANIMATION_MS);
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

                <div className="flex max-h-[23rem] flex-col overflow-x-hidden overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                    {isLoadingUsers ? (
                        <p className="text-sm text-theme-text-soft">Loading...</p>
                    ) : sortedUsers.length ? (
                        <>
                        {sortedUsers.map((reactionUser) => {
                        const relationship = getRelationship(reactionUser.user);
                        const isCurrentUserReaction = sameId(reactionUser.user?.id, currentUserId);
                        const emoji = reactionUser.emoji || '💜';
                        const reactionKey = getReactionUserKey(reactionUser);
                        const isRemoving = removingReactionKeys.has(reactionKey);

                        return (
                            <div
                                key={reactionKey}
                                className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ${
                                    isRemoving ? 'mb-0 grid-rows-[0fr] opacity-0' : 'mb-2 grid-rows-[1fr] opacity-100'
                                }`}
                            >
                                <div className="min-h-0 overflow-hidden">
                                    <UserPanelRow
                                        user={reactionUser.user}
                                        busy={busy}
                                        relationship={relationship}
                                        className={`transition-transform duration-200 ${isRemoving ? 'translate-x-8' : ''}`}
                                        onOpenProfile={onSelectUser}
                                        onAddFriend={onAddFriend}
                                        trailingContent={isCurrentUserReaction ? (
                                            <button
                                                type="button"
                                                className="rounded-full px-2 py-1 text-xl transition hover:bg-theme-text/10 disabled:opacity-60"
                                                aria-label={`Remove your ${emoji} reaction`}
                                                disabled={busy || isRemoving}
                                                onClick={() => handleRemoveOwnReaction(reactionUser, emoji)}
                                            >
                                                {emoji}
                                            </button>
                                        ) : (
                                            <span className="px-2 py-1 text-xl" aria-hidden="true">
                                                {emoji}
                                            </span>
                                        )}
                                    />
                                </div>
                            </div>
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

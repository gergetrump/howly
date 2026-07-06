import { useEffect, useState, useMemo } from 'react';
import { Trash2, MessageCircle, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PostAuthorAvatar } from '@/components/cards/FeedPostCard';
import { appCardClassName } from '@/components/cards/cardStyles';
import { getStoryLikes, getStoryComments } from '@/services/storyApi';
import { StoryCommentSection } from '@/components/social/StoryCommentSection';
import { cloudinaryUrl } from '@/lib/cloudinary';
import { isBlockedByRelationship } from '@/components/social/socialHelpers';
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import {
    ConfirmationDialog,
    ConfirmationDialogContent,
    ConfirmationDialogDescription,
    ConfirmationDialogFooter,
    ConfirmationDialogHeader,
    ConfirmationDialogTitle,
} from "@/components/ui/confirmation-dialog";

const STORY_COMMENT_PAGE_SIZE = 10;
const STORY_LIKE_PAGE_SIZE = 20;

function normalizePageResponse(response) {
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

// Context line per source type, e.g. "completed Morning Run 🏃"
function buildContextLine(story) {
    const title = `${story.sourceTitle} ${story.sourceEmoji}`;

    switch (story.sourceType) {
        case 'habit':
            return `completed ${title}`;
        case 'challenge':
            return `posted in ${title}`;
        case 'milestone':
            return `reached ${title}`;
        default:
            return title;
    }
}

const SOURCE_TYPE_COLORS = {
    habit: 'text-theme-accent-soft',
    challenge: 'text-theme-gold',
    milestone: 'text-theme-gold',
};

function getLikerName(liker) {
    return liker?.firstName || liker?.username || 'someone';
}

function getUniqueUsers(users) {
    const seen = new Set();
    return users.filter((u) => {
        if (!u) return false;
        const id = u.id || u._id || u;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

function buildSocialSummary(likers, comments, likeCount, commentCount) {
    if (!likeCount && !commentCount) {
        return '';
    }

    const uniqueLikers = getUniqueUsers(likers);
    const uniqueCommenters = getUniqueUsers(comments.map((c) => c.user));
    const allUsers = getUniqueUsers([...likers, ...comments.map((c) => c.user)]);

    // Case 1: Both likes and comments
    if (likeCount > 0 && commentCount > 0) {
        const firstUser = allUsers[0];
        const firstName = getLikerName(firstUser);
        return `Liked and commented by ${firstName} and others`;
    }

    // Case 2: Only comments
    if (commentCount > 0) {
        if (!uniqueCommenters.length) {
            return `Commented by ${commentCount === 1 ? '1 person' : `${commentCount} people`}`;
        }
        const name1 = getLikerName(uniqueCommenters[0]);
        if (commentCount === 1) {
            return `Commented by ${name1}`;
        }
        if (commentCount === 2 && uniqueCommenters[1]) {
            return `Commented by ${name1} and ${getLikerName(uniqueCommenters[1])}`;
        }
        return `Commented by ${name1} and others`;
    }

    // Case 3: Only likes
    if (likeCount > 0) {
        if (!uniqueLikers.length) {
            return `Liked by ${likeCount === 1 ? '1 person' : `${likeCount} people`}`;
        }
        const name1 = getLikerName(uniqueLikers[0]);
        if (likeCount === 1) {
            return `Liked by ${name1}`;
        }
        if (likeCount === 2 && uniqueLikers[1]) {
            return `Liked by ${name1} and ${getLikerName(uniqueLikers[1])}`;
        }
        return `Liked by ${name1} and others`;
    }

    return '';
}

export function StoryFeedCard({
    authorName,
    authorAvatarSrc,
    authorIsPremium,
    meta,
    story,
    isOwn = false,
    currentUserId,
    onDelete,
    onOpenLikes,
    onOpenProfile,
    blockedUsers = [],
    blockers = [],
    children,
    fullImage = false,
    readOnlyComments = false,
    defaultOpenComments = false,
    targetCommentId = null,
    targetCommentToken = null,
    onTargetCommentHandled,
    onTargetCommentUnavailable,
}) {
    const [likers, setLikers] = useState([]);
    const [comments, setComments] = useState([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
    const [hasMoreComments, setHasMoreComments] = useState(false);
    const [nextCommentsOffset, setNextCommentsOffset] = useState(0);
    const [isLoadingMoreLikers, setIsLoadingMoreLikers] = useState(false);
    const [hasMoreLikers, setHasMoreLikers] = useState(false);
    const [nextLikersOffset, setNextLikersOffset] = useState(0);
    const [hasLoadedComments, setHasLoadedComments] = useState(false);
    const [localStory, setLocalStory] = useState(story);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isLikersOpen, setIsLikersOpen] = useState(false);
    const [error, setError] = useState('');
    const displayName = isOwn ? 'You' : authorName;

    const visibleComments = useMemo(() => {
        return comments.filter((c) => !isBlockedByRelationship(c.user, blockedUsers, blockers));
    }, [comments, blockedUsers, blockers]);

    const visibleLikers = useMemo(() => {
        return likers.filter((u) => !isBlockedByRelationship(u, blockedUsers, blockers));
    }, [likers, blockedUsers, blockers]);

    // Sync story prop changes to localStory state
    useEffect(() => {
        setLocalStory(story);
    }, [story]);

    // Auto-open the comment drawer when arriving from a notification link.
    useEffect(() => {
        if (defaultOpenComments) {
            setIsCommentsOpen(true);
        }
    }, [defaultOpenComments]);

    useEffect(() => {
        if (!story.likeCount) {
            setLikers([]);
            setHasMoreLikers(false);
            setNextLikersOffset(0);
            return undefined;
        }

        let isCurrent = true;

        getStoryLikes(story.id, { limit: STORY_LIKE_PAGE_SIZE, offset: 0 })
            .then((response) => {
                if (isCurrent) {
                    const page = normalizePageResponse(response);
                    setLikers(page.items);
                    setHasMoreLikers(page.hasMore);
                    setNextLikersOffset(Math.max(page.nextOffset, page.items.length));
                }
            })
            .catch((likesError) => {
                console.error('Failed to load story likes:', likesError);
                if (isCurrent) {
                    setHasMoreLikers(false);
                    setNextLikersOffset(0);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [story.id, story.likeCount]);

    useEffect(() => {
        const shouldLoadComments = isCommentsOpen || story.commentCount > 0;

        if (!shouldLoadComments) {
            setComments([]);
            setHasLoadedComments(false);
            setHasMoreComments(false);
            setNextCommentsOffset(0);
            return undefined;
        }

        let isCurrent = true;
        setHasLoadedComments(false);
        if (comments.length === 0) {
            setIsLoadingComments(true);
        }

        getStoryComments(story.id, { limit: STORY_COMMENT_PAGE_SIZE, offset: 0 })
            .then((res) => {
                if (isCurrent) {
                    const page = normalizePageResponse(res);
                    setComments(page.items);
                    setHasMoreComments(page.hasMore);
                    setNextCommentsOffset(Math.max(page.nextOffset, page.items.length));
                }
            })
            .catch((err) => {
                console.error('Failed to load story comments:', err);
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoadingComments(false);
                    setHasLoadedComments(true);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [story.id, story.commentCount, isCommentsOpen]);

    async function handleLoadMoreComments() {
        if (isLoadingMoreComments || !hasMoreComments) {
            return [];
        }

        setIsLoadingMoreComments(true);

        try {
            const response = await getStoryComments(story.id, {
                limit: STORY_COMMENT_PAGE_SIZE,
                offset: nextCommentsOffset,
            });
            const page = normalizePageResponse(response);

            setComments((currentComments) => {
                const seenIds = new Set(currentComments.map((comment) => comment.id));
                const nextItems = page.items.filter((comment) => {
                    if (seenIds.has(comment.id)) {
                        return false;
                    }

                    seenIds.add(comment.id);
                    return true;
                });

                return [...currentComments, ...nextItems];
            });
            setHasMoreComments(page.hasMore);
            setNextCommentsOffset(Math.max(page.nextOffset, nextCommentsOffset + page.items.length));

            return page.items;
        } catch (err) {
            console.error('Failed to load more story comments:', err);
            return [];
        } finally {
            setIsLoadingMoreComments(false);
        }
    }

    async function handleLoadMoreLikers() {
        if (isLoadingMoreLikers || !hasMoreLikers) {
            return;
        }

        setIsLoadingMoreLikers(true);

        try {
            const response = await getStoryLikes(story.id, {
                limit: STORY_LIKE_PAGE_SIZE,
                offset: nextLikersOffset,
            });
            const page = normalizePageResponse(response);

            setLikers((currentLikers) => {
                const seenIds = new Set(currentLikers.map((liker) => liker.id || liker._id));
                const nextItems = page.items.filter((liker) => {
                    const likerId = liker.id || liker._id;

                    if (seenIds.has(likerId)) {
                        return false;
                    }

                    seenIds.add(likerId);
                    return true;
                });

                return [...currentLikers, ...nextItems];
            });
            setHasMoreLikers(page.hasMore);
            setNextLikersOffset(Math.max(page.nextOffset, nextLikersOffset + page.items.length));
        } catch (err) {
            console.error('Failed to load more story likes:', err);
        } finally {
            setIsLoadingMoreLikers(false);
        }
    }

    async function handleDelete() {
        try {
            setError('');
            setIsDeleting(true);
            await onDelete?.(story);
        } catch (err) {
            setError(err.message || 'Could not delete story');
            setIsDeleting(false);
            setIsConfirmingDelete(false);
        }
    }

    return (
        <Card className={appCardClassName} data-story-id={story.id ?? story._id}>
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-3">
                        <PostAuthorAvatar
                            avatarSrc={authorAvatarSrc}
                            name={displayName}
                            isPremium={authorIsPremium}
                        />
                        <div className="min-w-0">
                            <CardTitle className="truncate">{displayName}</CardTitle>
                            <p className={`mt-1 truncate text-sm ${SOURCE_TYPE_COLORS[story.sourceType] ?? 'text-theme-text-soft'}`}>
                                {buildContextLine(story)}
                            </p>
                        </div>
                    </div>

                    <div className={`flex shrink-0 items-center gap-2 ${readOnlyComments ? 'pr-10' : ''}`}>
                        {meta ? <span className="text-sm text-theme-text-muted">{meta}</span> : null}
                        {isOwn && onDelete && !readOnlyComments ? (
                            <button
                                type="button"
                                onClick={() => setIsConfirmingDelete(true)}
                                className="flex size-8 shrink-0 items-center justify-center rounded-full text-theme-text-muted transition hover:bg-theme-danger/10 hover:text-theme-danger"
                                aria-label="Delete story"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className={fullImage ? 'flex justify-center overflow-hidden rounded-2xl bg-theme-surface-2/40' : 'overflow-hidden rounded-2xl'}>
                    <img
                        src={cloudinaryUrl(story.imageUrl, { width: 1080 })}
                        alt={`Story by ${isOwn ? 'you' : authorName}`}
                        loading="lazy"
                        className={fullImage ? 'max-h-[70vh] w-auto max-w-full object-contain' : 'max-h-96 w-full object-cover'}
                    />
                </div>

                {story.caption ? (
                    <p className={readOnlyComments ? 'text-sm font-semibold text-theme-text' : 'text-sm text-theme-text'}>{story.caption}</p>
                ) : null}

                {error && <p className="text-sm text-theme-danger">{error}</p>}

                {readOnlyComments ? (
                    <div className="mt-4 space-y-4">
                        <div className="flex items-center gap-5 text-sm">
                            <button
                                type="button"
                                onClick={() => localStory.likeCount && setIsLikersOpen(true)}
                                disabled={!localStory.likeCount}
                                className="inline-flex items-center gap-1.5 font-semibold text-theme-love transition enabled:hover:text-theme-love disabled:cursor-default disabled:text-theme-text-muted"
                            >
                                <Heart className={`size-4 ${localStory.likeCount ? 'fill-current' : ''}`} />
                                {localStory.likeCount}
                            </button>
                            <span className="inline-flex items-center gap-1.5 font-medium text-theme-text-muted">
                                <MessageCircle className="size-4" />
                                {localStory.commentCount}
                            </span>
                        </div>

                        <div className="border-t border-theme-text/10 pt-4">
                            <StoryCommentSection
                                story={localStory}
                                currentUserId={currentUserId}
                                isStoryOwner={isOwn}
                                readOnly
                                comments={visibleComments}
                                setComments={setComments}
                                isLoading={isLoadingComments}
                                isLoadingMore={isLoadingMoreComments}
                                hasLoadedComments={hasLoadedComments}
                                hasMoreComments={hasMoreComments}
                                onLoadMoreComments={handleLoadMoreComments}
                                onOpenProfile={onOpenProfile}
                                blockedUsers={blockedUsers}
                                blockers={blockers}
                            />
                        </div>

                        {isOwn && onDelete ? (
                            <div className="border-t border-theme-text/10 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmingDelete(true)}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-theme-text-muted transition hover:text-theme-danger"
                                >
                                    <Trash2 className="size-4" />
                                    Delete story
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mt-4">
                        {/* Action Icons Row */}
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="shrink-0">{children}</div>

                            <div className="shrink-0 flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                                        isCommentsOpen || localStory.commentCount > 0 ? 'text-theme-accent hover:bg-theme-accent/10' : 'text-theme-text-muted hover:bg-theme-text/10 hover:text-theme-text'
                                    }`}
                                >
                                    <MessageCircle className={`size-4 ${isCommentsOpen || localStory.commentCount > 0 ? 'fill-theme-accent/20' : ''}`} />
                                    {localStory.commentCount > 0 && <span>{localStory.commentCount}</span>}
                                </button>
                            </div>
                        </div>

                        {/* Social Summary Text (Below Icons Row) */}
                        {(localStory.likeCount > 0 || localStory.commentCount > 0) ? (
                            <div className="flex items-center text-sm text-theme-text-soft">
                                <button
                                    type="button"
                                    className={`min-w-0 truncate text-left transition ${localStory.likeCount ? 'hover:text-theme-text' : 'cursor-default'}`}
                                    onClick={() => localStory.likeCount && onOpenLikes?.(localStory, visibleLikers)}
                                    disabled={!localStory.likeCount}
                                >
                                    {buildSocialSummary(visibleLikers, visibleComments, localStory.likeCount, localStory.commentCount)}
                                </button>
                            </div>
                        ) : null}

                        {/* Comments Section */}
                        {isCommentsOpen && (
                            <StoryCommentSection
                                story={localStory}
                                currentUserId={currentUserId}
                                isStoryOwner={isOwn}
                                comments={visibleComments}
                                setComments={setComments}
                                isLoading={isLoadingComments}
                                isLoadingMore={isLoadingMoreComments}
                                hasLoadedComments={hasLoadedComments}
                                hasMoreComments={hasMoreComments}
                                onLoadMoreComments={handleLoadMoreComments}
                                onOpenProfile={onOpenProfile}
                                blockedUsers={blockedUsers}
                                blockers={blockers}
                                targetCommentId={targetCommentId}
                                targetCommentToken={targetCommentToken}
                                onTargetCommentHandled={onTargetCommentHandled}
                                onTargetCommentUnavailable={onTargetCommentUnavailable}
                                onCommentAdded={() => setLocalStory(prev => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }))}
                                onCommentDeleted={(count) => {
                                    setNextCommentsOffset((offset) => Math.max(0, offset - (count || 1)));
                                    setLocalStory(prev => ({ ...prev, commentCount: Math.max(0, (prev.commentCount || 0) - (count || 1)) }));
                                }}
                            />
                        )}
                    </div>
                )}
            </CardContent>

            {isConfirmingDelete && (
                <ConfirmationDialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
                    <ConfirmationDialogContent className="bg-theme-surface border-0 text-theme-text rounded-3xl p-8 sm:max-w-md flex flex-col items-center text-center shadow-2xl z-[100]">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-theme-danger/10 mb-2 border border-theme-danger/20">
                            <Trash2 className="h-8 w-8 text-theme-danger" />
                        </div>
                        <ConfirmationDialogHeader className="flex flex-col items-center justify-center space-y-4 text-center">
                            <ConfirmationDialogTitle className="text-2xl font-bold tracking-tight text-center">Delete this story?</ConfirmationDialogTitle>
                            <ConfirmationDialogDescription className="text-base text-theme-text-soft text-center">
                                This will permanently remove your story post, likes, and comments. This can't be undone.
                            </ConfirmationDialogDescription>
                        </ConfirmationDialogHeader>
                        <ConfirmationDialogFooter className="flex-col w-full gap-3 mt-8 sm:flex-col sm:space-x-0">
                            <AlertDialogPrimitive.Cancel asChild>
                                <Button 
                                    variant="outline"
                                    className="w-full h-14 rounded-full bg-theme-surface-2 border border-theme-text/10 text-theme-text hover:bg-theme-surface-2/80 hover:text-theme-text mt-0 text-lg font-semibold"
                                >
                                    Keep it
                                </Button>
                            </AlertDialogPrimitive.Cancel>
                            <AlertDialogPrimitive.Action asChild>
                                <Button 
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="w-full h-14 rounded-full bg-[#d65d53] hover:bg-[#c2534a] text-white text-lg font-semibold shadow-lg shadow-red-900/20"
                                >
                                    <Trash2 className="mr-2 h-5 w-5" /> {isDeleting ? 'Deleting...' : 'Yes, delete story'}
                                </Button>
                            </AlertDialogPrimitive.Action>
                        </ConfirmationDialogFooter>
                    </ConfirmationDialogContent>
                </ConfirmationDialog>
            )}

            {readOnlyComments && (
                <Dialog open={isLikersOpen} onOpenChange={setIsLikersOpen}>
                    <DialogContent className="border-theme-text/10 bg-theme-surface text-theme-text shadow-2xl sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Likes</DialogTitle>
                        </DialogHeader>
                        <div className="grid max-h-[23rem] gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                            {visibleLikers.length ? (
                                <>
                                {visibleLikers.map((liker) => (
                                    <div
                                        key={liker.id || liker._id}
                                        className="flex items-center gap-3 rounded-xl bg-theme-text/5 px-3 py-2"
                                    >
                                        <img
                                            src={liker.profilePictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                                            alt=""
                                            className="size-9 rounded-full bg-theme-surface-2 object-cover"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-theme-text">
                                                {liker.firstName || liker.username || 'someone'}
                                            </p>
                                            {liker.username ? (
                                                <p className="truncate text-xs text-theme-text-muted">@{liker.username}</p>
                                            ) : null}
                                        </div>
                                        <Heart className="ml-auto size-4 fill-theme-love text-theme-love" />
                                    </div>
                                ))}
                                {hasMoreLikers ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-theme-accent-soft hover:bg-violet-400/15 hover:text-theme-accent-soft"
                                        disabled={isLoadingMoreLikers}
                                        onClick={handleLoadMoreLikers}
                                    >
                                        {isLoadingMoreLikers ? 'Loading...' : 'Load more'}
                                    </Button>
                                ) : null}
                                </>
                            ) : (
                                <p className="text-sm text-theme-text-soft">No likes yet</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
}

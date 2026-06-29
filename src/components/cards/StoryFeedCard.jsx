import { useEffect, useState } from 'react';
import { Trash2, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PostAuthorAvatar } from '@/components/cards/FeedPostCard';
import { appCardClassName } from '@/components/cards/cardStyles';
import { getStoryLikes, getStoryComments } from '@/services/storyApi';
import { StoryCommentSection } from '@/components/social/StoryCommentSection';
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
    habit: 'text-purple-300',
    challenge: 'text-orange-300',
    milestone: 'text-yellow-300',
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
    children,
}) {
    const [likers, setLikers] = useState([]);
    const [comments, setComments] = useState([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [localStory, setLocalStory] = useState(story);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [error, setError] = useState('');
    const displayName = isOwn ? 'You' : authorName;

    // Sync story prop changes to localStory state
    useEffect(() => {
        setLocalStory(story);
    }, [story]);

    useEffect(() => {
        if (!story.likeCount) {
            setLikers([]);
            return undefined;
        }

        let isCurrent = true;

        getStoryLikes(story.id)
            .then((nextLikers) => {
                if (isCurrent) {
                    setLikers(nextLikers ?? []);
                }
            })
            .catch((likesError) => {
                console.error('Failed to load story likes:', likesError);
            });

        return () => {
            isCurrent = false;
        };
    }, [story.id, story.likeCount]);

    useEffect(() => {
        if (!story.commentCount) {
            setComments([]);
            return undefined;
        }

        let isCurrent = true;
        setIsLoadingComments(true);

        getStoryComments(story.id)
            .then((res) => {
                if (isCurrent && Array.isArray(res)) {
                    setComments(res);
                }
            })
            .catch((err) => {
                console.error('Failed to load story comments:', err);
            })
            .finally(() => {
                if (isCurrent) setIsLoadingComments(false);
            });

        return () => {
            isCurrent = false;
        };
    }, [story.id, story.commentCount]);

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
        <Card className={appCardClassName}>
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
                            <p className={`mt-1 truncate text-sm ${SOURCE_TYPE_COLORS[story.sourceType] ?? 'text-slate-300'}`}>
                                {buildContextLine(story)}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {meta ? <span className="text-sm text-slate-400">{meta}</span> : null}
                        {isOwn && onDelete ? (
                            <button
                                type="button"
                                onClick={() => setIsConfirmingDelete(true)}
                                className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                                aria-label="Delete story"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-2xl">
                    <img
                        src={story.imageUrl}
                        alt={`Story by ${isOwn ? 'you' : authorName}`}
                        loading="lazy"
                        className="max-h-96 w-full object-cover"
                    />
                </div>

                {story.caption ? <p className="text-sm text-slate-200">{story.caption}</p> : null}

                {error && <p className="text-sm text-red-300">{error}</p>}

                <div className="flex flex-col gap-3 mt-4">
                    {/* Action Icons Row */}
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="shrink-0">{children}</div>
                        
                        <div className="shrink-0 flex items-center">
                            <button
                                type="button"
                                onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                                    isCommentsOpen || localStory.commentCount > 0 ? 'text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                }`}
                            >
                                <MessageCircle className={`size-4 ${isCommentsOpen || localStory.commentCount > 0 ? 'fill-blue-400/20' : ''}`} />
                                {localStory.commentCount > 0 && <span>{localStory.commentCount}</span>}
                            </button>
                        </div>
                    </div>

                    {/* Social Summary Text (Below Icons Row) */}
                    {(localStory.likeCount > 0 || localStory.commentCount > 0) ? (
                        <div className="flex items-center text-sm text-slate-300">
                            <button
                                type="button"
                                className={`min-w-0 truncate text-left transition ${localStory.likeCount ? 'hover:text-white' : 'cursor-default'}`}
                                onClick={() => localStory.likeCount && onOpenLikes?.(localStory, likers)}
                                disabled={!localStory.likeCount}
                            >
                                {buildSocialSummary(likers, comments, localStory.likeCount, localStory.commentCount)}
                            </button>
                        </div>
                    ) : null}

                    {/* Comments Section */}
                    {isCommentsOpen && (
                        <StoryCommentSection
                            story={localStory}
                            currentUserId={currentUserId}
                            isStoryOwner={isOwn}
                            comments={comments}
                            setComments={setComments}
                            isLoading={isLoadingComments}
                            likers={likers}
                            onOpenProfile={onOpenProfile}
                            onCommentAdded={() => setLocalStory(prev => ({ ...prev, commentCount: (prev.commentCount || 0) + 1 }))}
                            onCommentDeleted={(count) => setLocalStory(prev => ({ ...prev, commentCount: Math.max(0, (prev.commentCount || 0) - (count || 1)) }))}
                        />
                    )}
                </div>
            </CardContent>

            {isConfirmingDelete && (
                <ConfirmationDialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
                    <ConfirmationDialogContent className="bg-[#1e1b3a] border-0 text-white rounded-3xl p-8 sm:max-w-md flex flex-col items-center text-center shadow-2xl z-[100]">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-2 border border-red-500/20">
                            <Trash2 className="h-8 w-8 text-red-400" />
                        </div>
                        <ConfirmationDialogHeader className="flex flex-col items-center justify-center space-y-4 text-center">
                            <ConfirmationDialogTitle className="text-2xl font-bold tracking-tight text-center">Delete this story?</ConfirmationDialogTitle>
                            <ConfirmationDialogDescription className="text-base text-slate-300 text-center">
                                This will permanently remove your story post, likes, and comments. This can't be undone.
                            </ConfirmationDialogDescription>
                        </ConfirmationDialogHeader>
                        <ConfirmationDialogFooter className="flex-col w-full gap-3 mt-8 sm:flex-col sm:space-x-0">
                            <AlertDialogPrimitive.Cancel asChild>
                                <Button 
                                    variant="outline"
                                    className="w-full h-14 rounded-full bg-[#2a2746] border border-slate-700/50 text-white hover:bg-[#343155] hover:text-white mt-0 text-lg font-semibold"
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
        </Card>
    );
}

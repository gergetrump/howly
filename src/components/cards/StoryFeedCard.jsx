import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { appCardClassName } from '@/components/cards/cardStyles';
import { getStoryLikes } from '@/services/storyApi';

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

function buildLikeSummary(likers, likeCount) {
    if (!likeCount) {
        return '';
    }

    if (!likers.length) {
        return `Liked by ${likeCount === 1 ? '1 person' : `${likeCount} people`}`;
    }

    const firstName = getLikerName(likers[0]);

    if (likeCount === 1) {
        return `Liked by ${firstName}`;
    }

    if (likeCount === 2 && likers[1]) {
        return `Liked by ${firstName} and ${getLikerName(likers[1])}`;
    }

    return `Liked by ${firstName} and others`;
}

export function StoryFeedCard({
    authorName,
    authorAvatarSrc,
    meta,
    story,
    isOwn = false,
    onDelete,
    onOpenLikes,
    children,
}) {
    const [likers, setLikers] = useState([]);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const displayName = isOwn ? 'You' : authorName;
    const authorInitial = displayName?.trim()?.charAt(0)?.toUpperCase() || '?';

    useEffect(() => {
        if (!story.likeCount) {
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
                        <Avatar size="lg" className="bg-slate-300 text-slate-950">
                            {authorAvatarSrc ? <AvatarImage src={authorAvatarSrc} alt="" /> : null}
                            <AvatarFallback className="bg-slate-300 font-bold text-slate-950">
                                {authorInitial}
                            </AvatarFallback>
                        </Avatar>
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
                            isConfirmingDelete ? (
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-400">Delete?</span>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="font-semibold text-red-300 hover:text-red-200 disabled:opacity-50"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Yes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsConfirmingDelete(false)}
                                        disabled={isDeleting}
                                        className="text-slate-400 hover:text-white disabled:opacity-50"
                                    >
                                        No
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmingDelete(true)}
                                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                                    aria-label="Delete story"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            )
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

                <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0">{children}</div>
                    {story.likeCount ? (
                        <button
                            type="button"
                            className="min-w-0 truncate text-left text-sm text-slate-300 transition hover:text-white"
                            onClick={() => onOpenLikes?.(story, likers)}
                        >
                            {buildLikeSummary(likers, story.likeCount)}
                        </button>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}

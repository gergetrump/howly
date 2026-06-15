import { useEffect, useState } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

// Instagram-style summary: "Liked by anna" / "Liked by anna and 3 others"
function buildLikeSummary(likers, likeCount) {
    if (!likeCount) {
        return 'No likes yet';
    }

    const firstName = likers?.length ? getLikerName(likers[0]) : null;

    if (!firstName) {
        return `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`;
    }

    if (likeCount === 1) {
        return `Liked by ${firstName}`;
    }

    return `Liked by ${firstName} and ${likeCount - 1} ${likeCount === 2 ? 'other' : 'others'}`;
}

export function StoryFeedCard({ authorName, authorAvatarSrc, story, isOwn = false, onDelete, children }) {
    const [likers, setLikers] = useState(null);
    const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');
    const displayName = isOwn ? 'You' : authorName;
    const authorInitial = displayName?.trim()?.charAt(0)?.toUpperCase() || '?';

    // Own story with likes: load the likers so the summary can show names
    useEffect(() => {
        if (!isOwn || !story.likeCount) {
            return;
        }

        let isMounted = true;

        getStoryLikes(story.id)
            .then((data) => {
                if (isMounted) {
                    setLikers(data ?? []);
                }
            })
            .catch((err) => {
                console.error('Failed to load story likes:', err);
            });

        return () => {
            isMounted = false;
        };
    }, [isOwn, story.id, story.likeCount]);

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

                    {isOwn && onDelete ? (
                        isConfirmingDelete ? (
                            <div className="flex shrink-0 items-center gap-2 text-sm">
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

                {/* Own story: heart + Insta-style like summary, click opens the likers modal */}
                {isOwn ? (
                    <div className="flex items-center gap-2">
                        <Heart
                            className={`size-5 ${story.likeCount ? 'fill-pink-400 text-pink-400' : 'text-slate-500'}`}
                            aria-hidden="true"
                        />
                        <button
                            type="button"
                            onClick={() => story.likeCount && setIsLikesModalOpen(true)}
                            disabled={!story.likeCount}
                            className="text-sm text-slate-300 hover:text-white disabled:cursor-default disabled:text-slate-500"
                        >
                            {buildLikeSummary(likers, story.likeCount)}
                        </button>
                    </div>
                ) : null}

                {error && <p className="text-sm text-red-300">{error}</p>}

                {children}
            </CardContent>

            {/* Likers modal (Instagram style) */}
            <Dialog open={isLikesModalOpen} onOpenChange={setIsLikesModalOpen}>
                <DialogContent className="sm:max-w-sm rounded-2xl bg-[#1e1b3a] border-0 p-0 text-white shadow-2xl">
                    <div className="border-b border-white/10 px-6 py-4 text-center">
                        <h2 className="font-semibold">Likes</h2>
                    </div>
                    <div className="max-h-80 overflow-y-auto px-6 py-4">
                        {likers?.length ? (
                            <div className="flex flex-col gap-4">
                                {likers.map((liker) => (
                                    <div key={liker.id} className="flex items-center gap-3">
                                        <img
                                            src={liker.profilePictureUrl}
                                            alt=""
                                            className="size-10 rounded-full object-cover"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">@{liker.username}</p>
                                            <p className="truncate text-sm text-slate-400">
                                                {[liker.firstName, liker.lastName].filter(Boolean).join(' ')}
                                            </p>
                                        </div>
                                        <Heart className="ml-auto size-4 shrink-0 fill-pink-400 text-pink-400" aria-hidden="true" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm text-slate-400">Loading likes...</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

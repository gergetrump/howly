import { useEffect, useState } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { Page, Heading } from '@/components/layout';
import { useAuth } from '@/context/authContext';
import { getMyStoryArchive } from '@/services/storyApi';
import { StoryDetailDialog } from '@/components/stories/StoryDetailDialog';
import { cloudinaryUrl } from '@/lib/cloudinary';

function groupByDate(stories) {
    const groups = [];
    const byKey = new Map();

    stories.forEach((story) => {
        const key = new Date(story.createdAt).toDateString();

        if (!byKey.has(key)) {
            const group = { key, label: formatDateLabel(story.createdAt), stories: [] };
            byKey.set(key, group);
            groups.push(group);
        }

        byKey.get(key).stories.push(story);
    });

    return groups;
}

function formatDateLabel(dateValue) {
    const date = new Date(dateValue);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    });
}

export function StoryArchivePage() {
    const { user } = useAuth();
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStory, setSelectedStory] = useState(null);

    useEffect(() => {
        let isMounted = true;

        getMyStoryArchive()
            .then((data) => {
                if (isMounted) {
                    setStories(data ?? []);
                }
            })
            .catch((err) => {
                console.error('Failed to load story archive:', err);
                if (isMounted) {
                    setError('Could not load your stories');
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

    function handleDeleted(storyId) {
        setStories((prev) => prev.filter((story) => story.id !== storyId));
    }

    const groups = groupByDate(stories);
    const isPremium = user?.isPremium === true || user?.role === 'admin';

    return (
        <Page theme="forest">
            <div className="space-y-5">
                <Heading
                    title="Story Archive"
                    subtitle="Your shared moments from the last 90 days."
                    streakDays={user?.streak ?? 0}
                />

                {isLoading ? (
                    <p className="text-sm text-theme-text-muted">Loading your stories...</p>
                ) : error ? (
                    <p className="text-sm text-theme-danger">{error}</p>
                ) : !stories.length ? (
                    <div className="rounded-2xl bg-theme-surface/80 px-5 py-6 text-center">
                        <p className="text-sm text-theme-text-muted">
                            No stories yet. Complete a habit and share a moment 📸
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {groups.map((group) => (
                            <div key={group.key}>
                                <h3 className="mb-2 text-sm font-semibold text-theme-text-soft">{group.label}</h3>
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                                    {group.stories.map((story) => (
                                        <button
                                            key={story.id}
                                            type="button"
                                            onClick={() => setSelectedStory(story)}
                                            className="group relative aspect-square overflow-hidden rounded-xl bg-theme-surface-2 text-left"
                                        >
                                            <img
                                                src={cloudinaryUrl(story.imageUrl, { width: 400 })}
                                                alt={story.sourceTitle}
                                                loading="lazy"
                                                className="size-full object-cover transition duration-200 group-hover:scale-105"
                                            />

                                            {(story.likeCount > 0 || story.commentCount > 0) ? (
                                                <div className="absolute right-1.5 top-1.5 flex items-center gap-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                                                    {story.likeCount > 0 ? (
                                                        <span className="flex items-center gap-0.5">
                                                            <Heart className="size-3 fill-current" />
                                                            {story.likeCount}
                                                        </span>
                                                    ) : null}
                                                    {story.commentCount > 0 ? (
                                                        <span className="flex items-center gap-0.5">
                                                            <MessageCircle className="size-3" />
                                                            {story.commentCount}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                                <p className="truncate text-xs text-theme-text">
                                                    {story.sourceEmoji} {story.sourceTitle}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <StoryDetailDialog
                story={selectedStory}
                open={Boolean(selectedStory)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setSelectedStory(null);
                    }
                }}
                currentUserId={user?.id ?? user?._id}
                authorAvatarSrc={user?.profilePictureUrl}
                authorIsPremium={isPremium}
                onDeleted={handleDeleted}
            />
        </Page>
    );
}

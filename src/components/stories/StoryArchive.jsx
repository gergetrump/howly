import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { getMyStoryArchive, deleteStory } from '@/services/storyApi';

// Group stories by calendar day (newest first, matches API sort order)
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

export function StoryArchive() {
    const [stories, setStories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyStoryId, setBusyStoryId] = useState(null);

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

    async function handleDelete(storyId) {
        try {
            setError('');
            setBusyStoryId(storyId);
            await deleteStory(storyId);
            setStories((prev) => prev.filter((story) => story.id !== storyId));
        } catch (err) {
            setError(err.message || 'Could not delete story');
        } finally {
            setBusyStoryId(null);
        }
    }

    if (isLoading) {
        return <p className="text-sm text-slate-400">Loading your stories...</p>;
    }

    if (!stories.length) {
        return (
            <div className="rounded-2xl bg-slate-800/80 px-5 py-6 text-center">
                <p className="text-sm text-slate-400">
                    No stories yet. Complete a habit and share a moment 📸
                </p>
            </div>
        );
    }

    const groups = groupByDate(stories);

    return (
        <div className="flex flex-col gap-5">
            {error && <p className="text-sm text-red-300">{error}</p>}

            {groups.map((group) => (
                <div key={group.key}>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">{group.label}</h3>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {group.stories.map((story) => (
                            <div
                                key={story.id}
                                className="group relative aspect-square overflow-hidden rounded-xl bg-slate-800"
                            >
                                <img
                                    src={story.imageUrl}
                                    alt={story.sourceTitle}
                                    loading="lazy"
                                    className="size-full object-cover"
                                />

                                {/* Context + delete overlay */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                    <p className="truncate text-xs text-white">
                                        {story.sourceEmoji} {story.sourceTitle}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(story.id)}
                                    disabled={busyStoryId === story.id}
                                    className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-500/80 disabled:opacity-50"
                                    aria-label={`Delete story from ${group.label}`}
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

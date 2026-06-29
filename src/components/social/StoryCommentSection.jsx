import { useState, useEffect } from 'react';
import { Send, Trash2, MessageCircle } from 'lucide-react';
import { getStoryComments, postStoryComment, deleteStoryComment } from '@/services/storyApi';
import { formatRelativeTime } from '@/components/social/socialHelpers';

export function StoryCommentSection({
    story,
    currentUserId,
    comments = [],
    setComments,
    isLoading = false,
    onCommentAdded,
    onCommentDeleted,
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        const trimmed = newComment.trim();
        if (!trimmed || isSubmitting) return;

        try {
            setIsSubmitting(true);
            setError('');
            const res = await postStoryComment(story.id, trimmed);
            if (res && res.id) {
                setComments((prev) => [...prev, res]);
                setNewComment('');
                onCommentAdded?.();
            }
        } catch (err) {
            setError(err.message || 'Failed to post comment');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete(commentId) {
        try {
            setError('');
            await deleteStoryComment(story.id, commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            onCommentDeleted?.();
        } catch (err) {
            setError(err.message || 'Failed to delete comment');
        }
    }

    return (
        <div className="w-full">
            <div className="rounded-xl bg-black/20 p-4">
                {/* Comment List */}
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {isLoading ? (
                            <p className="text-sm text-slate-400">Loading comments...</p>
                        ) : comments.length === 0 ? (
                            <p className="text-sm text-slate-400">No comments yet. Be the first to comment!</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex items-start gap-3 text-sm">
                                    <img
                                        src={comment.user?.profilePictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                                        alt={comment.user?.username || 'User'}
                                        className="size-8 rounded-full bg-slate-800 object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="font-semibold text-slate-200">
                                                {comment.user?.firstName || comment.user?.username || 'someone'}
                                            </span>
                                            <span className="text-xs text-slate-500 shrink-0">
                                                {formatRelativeTime(comment.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-slate-300 break-words mt-0.5">{comment.content}</p>
                                    </div>
                                    {comment.user?.id === currentUserId && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(comment.id)}
                                            className="text-slate-500 hover:text-red-400 transition"
                                            aria-label="Delete comment"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Error Message */}
                    {error && <p className="text-sm text-red-400">{error}</p>}

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="relative flex items-center pt-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full rounded-full bg-slate-800/50 border border-slate-700/50 px-4 py-2 pr-12 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-slate-800"
                            disabled={isSubmitting}
                            maxLength={500}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className="absolute right-2 p-1.5 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:hover:text-blue-400"
                        >
                            <Send className="size-4" />
                        </button>
                    </form>
                </div>
            </div>
    );
}

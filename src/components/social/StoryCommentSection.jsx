import { useState, useEffect, useRef } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { postStoryComment, deleteStoryComment } from '@/services/storyApi';
import { getUserByUsername } from '@/services/userApi';
import {
    formatRelativeTime,
    getNormalizedUsername,
    isBlockedByRelationship,
} from '@/components/social/socialHelpers';
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

export function StoryCommentSection({
    story,
    currentUserId,
    comments = [],
    setComments,
    isLoading = false,
    likers = [],
    onOpenProfile,
    isStoryOwner = false,
    blockedUsers = [],
    blockers = [],
    onCommentAdded,
    onCommentDeleted,
    targetCommentId = null,
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [expandedParentIds, setExpandedParentIds] = useState(new Set());
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState('');
    const [commentIdToDelete, setCommentIdToDelete] = useState(null);
    const [highlightedCommentId, setHighlightedCommentId] = useState(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    const confirmDelete = async () => {
        if (commentIdToDelete) {
            await handleDelete(commentIdToDelete);
            setCommentIdToDelete(null);
        }
    };

    // When a targetCommentId is provided (from a notification link), scroll to
    // that comment within the section's scroll container and briefly highlight it.
    useEffect(() => {
        if (!targetCommentId || isLoading || comments.length === 0) return;

        const timer = setTimeout(() => {
            const container = containerRef.current;
            const el = container?.querySelector(`[data-comment-id="${targetCommentId}"]`);
            if (!el) return;

            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            setHighlightedCommentId(targetCommentId);

            // Fade the highlight out after 2.5 s.
            const fadeTimer = setTimeout(() => setHighlightedCommentId(null), 2500);
            return () => clearTimeout(fadeTimer);
        }, 300); // wait for the list to paint

        return () => clearTimeout(timer);
    }, [targetCommentId, isLoading, comments]);


    useEffect(() => {
        const match = newComment.match(/@(\w*)$/);
        if (match) {
            const query = match[1].toLowerCase();
            const allUsers = [...likers, ...comments.map((c) => c.user)];
            const uniqueUsers = getUniqueUsers(allUsers);
            
            const filtered = uniqueUsers.filter((u) => {
                const username = (u?.username || '').toLowerCase();
                const firstName = (u?.firstName || '').toLowerCase();
                return username.includes(query) || firstName.includes(query);
            });
            
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [newComment, comments, likers]);

    function handleSelectSuggestion(user) {
        const mention = `@${user.username} `;
        setNewComment((prev) => {
            const lastIndex = prev.lastIndexOf('@');
            if (lastIndex === -1) return prev;
            return prev.substring(0, lastIndex) + mention;
        });
        setShowSuggestions(false);
    }

    const toggleReplies = (parentId) => {
        setExpandedParentIds((prev) => {
            const next = new Set(prev);
            if (next.has(parentId)) {
                next.delete(parentId);
            } else {
                next.add(parentId);
            }
            return next;
        });
    };

    async function handleSubmit(e) {
        e.preventDefault();
        const trimmed = newComment.trim();
        if (!trimmed || isSubmitting) return;

        try {
            setIsSubmitting(true);
            setError('');
            const parentCommentId = replyingTo?.id || null;
            const res = await postStoryComment(story.id, trimmed, parentCommentId);
            if (res && res.id) {
                setComments((prev) => [...prev, res]);
                setNewComment('');
                setReplyingTo(null);
                
                // Auto-expand replies on submission
                if (parentCommentId) {
                    setExpandedParentIds((prev) => {
                        const next = new Set(prev);
                        next.add(parentCommentId);
                        return next;
                    });
                }
                
                onCommentAdded?.();

                setTimeout(() => {
                    if (containerRef.current) {
                        containerRef.current.scrollTo({
                            top: containerRef.current.scrollHeight,
                            behavior: 'smooth',
                        });
                    }
                }, 80);
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
            const countToDelete = comments.filter(c => c.id === commentId || c.parentComment === commentId).length;
            await deleteStoryComment(story.id, commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentComment !== commentId));
            onCommentDeleted?.(countToDelete);
        } catch (err) {
            setError(err.message || 'Failed to delete comment');
        }
    }

    const parentComments = comments.filter((c) => !c.parentComment);
    const getRepliesFor = (parentId) => comments.filter((c) => c.parentComment === parentId);

    function isBlockedMention(username) {
        const normalizedUsername = getNormalizedUsername(username);
        return isBlockedByRelationship({ username: normalizedUsername }, blockedUsers, blockers);
    }

    async function handleUsernameClick(username) {
        if (isBlockedMention(username)) {
            return;
        }

        try {
            setError('');
            const user = await getUserByUsername(username);
            if (user) {
                onOpenProfile?.(user);
            }
        } catch (err) {
            console.error('Failed to load user profile via mention:', err);
            // If the error is due to blocking (e.g. 403 or custom message), the click does nothing
        }
    }

    function formatCommentText(text) {
        if (!text) return '';
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const username = part.slice(1);
                if (isBlockedMention(username)) {
                    return part;
                }

                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => handleUsernameClick(username)}
                        className="text-violet-400 font-semibold hover:text-violet-300 transition hover:underline focus:outline-none"
                    >
                        {part}
                    </button>
                );
            }
            return part;
        });
    }

    function CommentItem({ comment, isReply = false }) {
        const isHighlighted = comment.id === highlightedCommentId;
        return (
            <div
                data-comment-id={comment.id}
                className={`flex items-start gap-3 text-sm rounded-lg transition-all duration-700 ${
                    isReply ? 'pl-8 mt-2 border-l border-slate-800' : ''
                } ${
                    isHighlighted
                        ? 'ring-2 ring-violet-400/60 bg-violet-400/10 p-2 -mx-2'
                        : ''
                }`}
            >
                <img
                    src={comment.user?.profilePictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                    alt={comment.user?.username || 'User'}
                    className={`${isReply ? 'size-6' : 'size-8'} rounded-full bg-slate-800 object-cover`}
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
                    <p className="text-slate-300 break-words mt-0.5">{formatCommentText(comment.content)}</p>
                    
                    <div className="flex items-center gap-3 mt-1">
                        {!isReply && (
                            <button
                                type="button"
                                onClick={() => setReplyingTo(comment)}
                                className="text-xs font-semibold text-slate-500 hover:text-blue-400 transition"
                            >
                                Reply
                            </button>
                        )}
                        {(comment.user?.id === currentUserId || isStoryOwner) && (
                            <button
                                type="button"
                                onClick={() => setCommentIdToDelete(comment.id)}
                                className="text-xs font-semibold text-slate-500 hover:text-red-400 transition flex items-center gap-0.5"
                                aria-label="Delete comment"
                            >
                                <Trash2 className="size-3" />
                                <span>Delete</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="rounded-xl bg-black/20 p-4">
                {/* Comment List */}
                <div ref={containerRef} className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {isLoading ? (
                        <p className="text-sm text-slate-400">Loading comments...</p>
                    ) : parentComments.length === 0 ? (
                        <p className="text-sm text-slate-400">No comments yet. Be the first to comment!</p>
                    ) : (
                        parentComments.map((parent) => {
                            const replies = getRepliesFor(parent.id);
                            const hasReplies = replies.length > 0;
                            const isExpanded = expandedParentIds.has(parent.id);

                            return (
                                <div key={parent.id} className="space-y-1 animate-fadeIn">
                                    <CommentItem comment={parent} />
                                    {hasReplies && (
                                        <button
                                            type="button"
                                            onClick={() => toggleReplies(parent.id)}
                                            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition pl-11 mt-1 block"
                                        >
                                            {isExpanded ? 'Hide replies' : `View replies (${replies.length})`}
                                        </button>
                                    )}
                                    {hasReplies && isExpanded && (
                                        <div className="space-y-1">
                                            {replies.map((reply) => (
                                                <CommentItem key={reply.id} comment={reply} isReply />
                                            ))}
                                        </div>
                                    )}
                                    {/* spacing */}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Error Message */}
                {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

                {/* Input Area */}
                <div className="pt-3">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-blue-500/10 px-3 py-1.5 rounded-lg text-xs text-blue-300 mb-2">
                            <span>Replying to @{replyingTo.user?.username || replyingTo.user?.firstName || 'someone'}</span>
                            <button
                                type="button"
                                onClick={() => setReplyingTo(null)}
                                className="hover:text-blue-200"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 w-full max-w-[16rem] rounded-lg border border-slate-700/50 bg-slate-900/95 backdrop-blur-md shadow-2xl max-h-36 overflow-y-auto z-30">
                                {suggestions.map((u) => (
                                    <button
                                        key={u.id || u._id}
                                        type="button"
                                        onClick={() => handleSelectSuggestion(u)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-800/80 text-slate-200 transition"
                                    >
                                        <img
                                            src={u.profilePictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                                            alt={u.username}
                                            className="size-6 rounded-full object-cover bg-slate-800"
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold truncate text-slate-200">{u.firstName || u.username}</span>
                                            <span className="text-[10px] text-slate-500 truncate">@{u.username}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={replyingTo ? "Write a reply... (use @ to tag)" : "Add a comment... (use @ to tag)"}
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

            {commentIdToDelete && (() => {
                const commentToDelete = comments.find((c) => c.id === commentIdToDelete);
                const commentToDeleteHasReplies = commentToDelete
                    ? comments.some((c) => c.parentComment === commentToDelete.id)
                    : false;

                return (
                    <ConfirmationDialog open={commentIdToDelete !== null} onOpenChange={(open) => !open && setCommentIdToDelete(null)}>
                        <ConfirmationDialogContent className="bg-[#1e1b3a] border-0 text-white rounded-3xl p-8 sm:max-w-md flex flex-col items-center text-center shadow-2xl z-[100]">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-2 border border-red-500/20">
                                <Trash2 className="h-8 w-8 text-red-400" />
                            </div>
                            <ConfirmationDialogHeader className="flex flex-col items-center justify-center space-y-4 text-center">
                                <ConfirmationDialogTitle className="text-2xl font-bold tracking-tight text-center">Delete comment?</ConfirmationDialogTitle>
                                <ConfirmationDialogDescription className="text-base text-slate-300 text-center">
                                    {commentToDeleteHasReplies
                                        ? "Are you sure you want to delete this comment? All replies will also be deleted. This can't be undone."
                                        : "Are you sure you want to delete this comment? This can't be undone."
                                    }
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
                                        onClick={confirmDelete}
                                        className="w-full h-14 rounded-full bg-[#d65d53] hover:bg-[#c2534a] text-white text-lg font-semibold shadow-lg shadow-red-900/20"
                                    >
                                        <Trash2 className="mr-2 h-5 w-5" /> Yes, delete comment
                                    </Button>
                                </AlertDialogPrimitive.Action>
                            </ConfirmationDialogFooter>
                        </ConfirmationDialogContent>
                    </ConfirmationDialog>
                );
            })()}
        </div>
    );
}

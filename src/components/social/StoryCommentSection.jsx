import { useState, useEffect, useMemo, useRef } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { postStoryComment, deleteStoryComment, getStoryMentionCandidates } from '@/services/storyApi';
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
    hasLoadedComments = false,
    onOpenProfile,
    isStoryOwner = false,
    blockedUsers = [],
    blockers = [],
    onCommentAdded,
    onCommentDeleted,
    readOnly = false,
    targetCommentId = null,
    targetCommentToken = null,
    onTargetCommentHandled,
    onTargetCommentUnavailable,
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [expandedParentIds, setExpandedParentIds] = useState(new Set());
    const [error, setError] = useState('');
    const [commentIdToDelete, setCommentIdToDelete] = useState(null);
    const [highlightedCommentId, setHighlightedCommentId] = useState(null);
    const [mentionCandidates, setMentionCandidates] = useState([]);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    // Tracks which notification click has already been highlighted so background
    // refreshes never replay the same jump while the section is mounted.
    const hasHighlightedRef = useRef(null);
    const highlightFadeTimerRef = useRef(null);
    const mentionQuery = newComment.match(/@(\w*)$/)?.[1].toLowerCase() ?? null;
    const suggestions = useMemo(() => {
        if (mentionQuery === null) return [];

        const uniqueUsers = getUniqueUsers(mentionCandidates);

        return uniqueUsers.filter((u) => {
            const username = (u?.username || '').toLowerCase();
            const firstName = (u?.firstName || '').toLowerCase();
            return username.includes(mentionQuery) || firstName.includes(mentionQuery);
        });
    }, [mentionQuery, mentionCandidates]);
    const showSuggestions = mentionQuery !== null && suggestions.length > 0;

    const confirmDelete = async () => {
        if (commentIdToDelete) {
            await handleDelete(commentIdToDelete);
            setCommentIdToDelete(null);
        }
    };

    useEffect(() => {
        return () => clearTimeout(highlightFadeTimerRef.current);
    }, []);

    useEffect(() => {
        if (!story?.id) {
            setMentionCandidates([]);
            return undefined;
        }

        let active = true;

        getStoryMentionCandidates(story.id)
            .then((candidates) => {
                if (active) {
                    setMentionCandidates(candidates ?? []);
                }
            })
            .catch(() => {
                if (active) {
                    setMentionCandidates([]);
                }
            });

        return () => {
            active = false;
        };
    }, [story?.id]);

    // When a notification click provides a target comment, scroll to that
    // comment and briefly highlight it once for that click.
    useEffect(() => {
        if (!targetCommentId || isLoading || !hasLoadedComments) return;
        const highlightKey = targetCommentToken ?? targetCommentId;
        if (hasHighlightedRef.current === highlightKey) return;

        const targetComment = comments.find((comment) => comment.id === targetCommentId);

        if (!targetComment) {
            hasHighlightedRef.current = highlightKey;
            onTargetCommentUnavailable?.();
            return;
        }

        const parentCommentId = targetComment?.parentComment?.id ?? targetComment?.parentComment;

        let cancelled = false;
        const cleanupEvents = [];

        function cancelPendingJump() {
            cancelled = true;
            clearTimeout(highlightFadeTimerRef.current);
            setHighlightedCommentId(null);
        }

        ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((eventName) => {
            window.addEventListener(eventName, cancelPendingJump, { once: true, passive: true, capture: true });
            cleanupEvents.push(() => window.removeEventListener(eventName, cancelPendingJump, { capture: true }));
        });

        const expandTimer = setTimeout(() => {
            if (cancelled) return;
            if (parentCommentId) {
                setExpandedParentIds((current) => {
                    if (current.has(parentCommentId)) return current;
                    const next = new Set(current);
                    next.add(parentCommentId);
                    return next;
                });
            }
        }, 0);

        const timer = setTimeout(() => {
            if (cancelled) return;
            const container = containerRef.current;
            const el = container?.querySelector(`[data-comment-id="${targetCommentId}"]`);
            if (!el) {
                hasHighlightedRef.current = highlightKey;
                onTargetCommentUnavailable?.();
                return;
            }

            hasHighlightedRef.current = highlightKey;
            el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            clearTimeout(highlightFadeTimerRef.current);
            setHighlightedCommentId(targetCommentId);
            onTargetCommentHandled?.();

            // Fade the highlight out after 3 seconds.
            highlightFadeTimerRef.current = setTimeout(() => {
                setHighlightedCommentId(null);
                highlightFadeTimerRef.current = null;
            }, 3000);
        }, 300);

        return () => {
            cancelled = true;
            cleanupEvents.forEach((cleanup) => cleanup());
            clearTimeout(expandTimer);
            clearTimeout(timer);
        };
    }, [
        targetCommentId,
        targetCommentToken,
        isLoading,
        hasLoadedComments,
        comments,
        onTargetCommentHandled,
        onTargetCommentUnavailable,
    ]);

    function handleSelectSuggestion(user) {
        const mention = `@${user.username} `;
        setNewComment((prev) => {
            const lastIndex = prev.lastIndexOf('@');
            if (lastIndex === -1) return prev;
            return prev.substring(0, lastIndex) + mention;
        });
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
                        className="text-theme-accent font-semibold hover:text-theme-accent transition hover:underline focus:outline-none"
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
        const commentUser = comment.user;
        const commentUserName = commentUser?.firstName || commentUser?.username || 'user';

        return (
            <div
                data-comment-id={comment.id}
                className={`flex items-start gap-3 text-sm rounded-lg transition-colors duration-700 ${
                    isReply ? 'pl-8 mt-2 border-l border-theme-text/10' : ''
                } ${
                    isHighlighted
                        ? 'ring-2 ring-theme-accent/60 bg-theme-accent/10'
                        : ''
                }`}
            >
                <button
                    type="button"
                    onClick={() => commentUser && onOpenProfile?.(commentUser)}
                    disabled={!commentUser || !onOpenProfile}
                    className="shrink-0 rounded-full transition hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-theme-accent/70 focus:ring-offset-2 focus:ring-offset-theme-bg disabled:cursor-default disabled:hover:opacity-100"
                    aria-label={`Open ${commentUserName}'s profile preview`}
                >
                    <img
                        src={commentUser?.profilePictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                        alt=""
                        className={`${isReply ? 'size-6' : 'size-8'} rounded-full bg-theme-surface-2 object-cover`}
                    />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-theme-text">
                            {commentUser?.firstName || commentUser?.username || 'someone'}
                        </span>
                        <span className="text-xs text-theme-text-muted shrink-0">
                            {formatRelativeTime(comment.createdAt)}
                        </span>
                    </div>
                    <p className="text-theme-text-soft break-words mt-0.5">{formatCommentText(comment.content)}</p>
                    
                    <div className="flex items-center gap-3 mt-1">
                        {!readOnly && !isReply && (
                            <button
                                type="button"
                                onClick={() => setReplyingTo(comment)}
                                className="text-xs font-semibold text-theme-text-muted hover:text-theme-accent transition"
                            >
                                Reply
                            </button>
                        )}
                        {!readOnly && (comment.user?.id === currentUserId || isStoryOwner) && (
                            <button
                                type="button"
                                onClick={() => setCommentIdToDelete(comment.id)}
                                className="text-xs font-semibold text-theme-text-muted hover:text-theme-danger transition flex items-center gap-0.5"
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
            <div className={readOnly ? '' : 'rounded-xl bg-theme-text/5 p-4'}>
                {/* Comment List */}
                <div ref={containerRef} className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {isLoading ? (
                        <p className="text-sm text-theme-text-muted">Loading comments...</p>
                    ) : parentComments.length === 0 ? (
                        <p className="text-sm text-theme-text-muted">{readOnly ? 'No comments yet' : 'No comments yet. Be the first to comment!'}</p>
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
                                            className="text-xs font-semibold text-theme-accent hover:text-theme-accent transition pl-11 mt-1 block"
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
                {error && <p className="text-sm text-theme-danger mt-2">{error}</p>}

                {/* Input Area */}
                {!readOnly && (
                <div className="pt-3">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-theme-accent/10 px-3 py-1.5 rounded-lg text-xs text-theme-accent-soft mb-2">
                            <span>Replying to @{replyingTo.user?.username || replyingTo.user?.firstName || 'someone'}</span>
                            <button
                                type="button"
                                onClick={() => setReplyingTo(null)}
                                className="hover:text-theme-accent"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 w-full max-w-[16rem] rounded-lg border border-theme-text/10 bg-theme-surface/95 backdrop-blur-md shadow-2xl max-h-36 overflow-y-auto z-30">
                                {suggestions.map((u) => (
                                    <button
                                        key={u.id || u._id}
                                        type="button"
                                        onClick={() => handleSelectSuggestion(u)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-theme-surface-2/80 text-theme-text transition"
                                    >
                                        <img
                                            src={u.profilePictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'}
                                            alt={u.username}
                                            className="size-6 rounded-full object-cover bg-theme-surface-2"
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold truncate text-theme-text">{u.firstName || u.username}</span>
                                            <span className="text-[10px] text-theme-text-muted truncate">@{u.username}</span>
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
                            className="w-full rounded-full bg-theme-surface-2/50 border border-theme-text/10 px-4 py-2 pr-12 text-sm text-theme-text placeholder:text-theme-text-muted outline-none focus:border-theme-accent/50 focus:bg-theme-surface-2"
                            disabled={isSubmitting}
                            maxLength={500}
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className="absolute right-2 p-1.5 text-theme-accent hover:text-theme-accent disabled:opacity-50 disabled:hover:text-theme-accent"
                        >
                            <Send className="size-4" />
                        </button>
                    </form>
                </div>
                )}
            </div>

            {commentIdToDelete && (() => {
                const commentToDelete = comments.find((c) => c.id === commentIdToDelete);
                const commentToDeleteHasReplies = commentToDelete
                    ? comments.some((c) => c.parentComment === commentToDelete.id)
                    : false;

                return (
                    <ConfirmationDialog open={commentIdToDelete !== null} onOpenChange={(open) => !open && setCommentIdToDelete(null)}>
                        <ConfirmationDialogContent className="p-8 flex flex-col items-center text-center z-[100]">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-theme-danger/10 mb-2 border border-theme-danger/20">
                                <Trash2 className="h-8 w-8 text-theme-danger" />
                            </div>
                            <ConfirmationDialogHeader className="flex flex-col items-center justify-center space-y-4 text-center">
                                <ConfirmationDialogTitle className="text-2xl font-bold tracking-tight text-center">Delete comment?</ConfirmationDialogTitle>
                                <ConfirmationDialogDescription className="text-base text-theme-text-soft text-center">
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
                                        className="w-full h-14 rounded-full bg-theme-surface-2 border border-theme-text/10 text-theme-text hover:bg-theme-surface-2/80 hover:text-theme-text mt-0 text-lg font-semibold"
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

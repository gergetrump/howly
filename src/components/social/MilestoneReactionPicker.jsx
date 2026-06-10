const MILESTONE_REACTION_EMOJIS = ['🎉', '🔥', '👏', '💜', '✨'];

export function MilestoneReactionPicker({ post, busy, onReact, onOpenReactions }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
                {MILESTONE_REACTION_EMOJIS.map((emoji) => {
                    const isSelected = post.currentUserReaction === emoji;

                    return (
                        <button
                            key={emoji}
                            type="button"
                            className={`flex size-9 items-center justify-center rounded-full text-lg transition hover:bg-white/10 ${isSelected ? 'bg-violet-400/25 ring-1 ring-violet-200/60' : ''}`}
                            aria-label={`React with ${emoji}`}
                            aria-pressed={isSelected}
                            disabled={busy}
                            onClick={() => onReact(post, emoji)}
                        >
                            {emoji}
                        </button>
                    );
                })}
            </div>

            {post.reactionCounts?.length ? (
                <div className="flex flex-wrap gap-2">
                    {post.reactionCounts.map((reaction) => (
                        <button
                            key={reaction.emoji}
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-slate-100 transition hover:bg-white/20"
                            onClick={() => onOpenReactions(post)}
                        >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.count}</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';

const EmojiPicker = lazy(() => import('emoji-picker-react'));
const MILESTONE_REACTION_EMOJIS = ['🎉', '🔥', '👏', '💜', '✨'];
const EMOJI_PICKER_WIDTH = 340;
const EMOJI_PICKER_HEIGHT = 420;
const EMOJI_PICKER_GAP = 12;
const VIEWPORT_PADDING = 16;
const MAX_VISIBLE_REACTION_COUNTS = 5;

export function MilestoneReactionPicker({ post, busy, onReact, onOpenReactions }) {
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const pickerRef = useRef(null);
    const emojiPickerPanelRef = useRef(null);
    const [emojiPickerPosition, setEmojiPickerPosition] = useState({ left: 0, top: 0 });

    useEffect(() => {
        if (!isEmojiPickerOpen) {
            return undefined;
        }

        function updateEmojiPickerPosition() {
            const pickerRect = pickerRef.current?.getBoundingClientRect();

            if (!pickerRect) {
                return;
            }

            const availableWidth = window.innerWidth - EMOJI_PICKER_WIDTH - VIEWPORT_PADDING;
            const left = Math.min(Math.max(pickerRect.left, VIEWPORT_PADDING), availableWidth);
            const top = pickerRect.top > EMOJI_PICKER_HEIGHT + EMOJI_PICKER_GAP + VIEWPORT_PADDING
                ? pickerRect.top - EMOJI_PICKER_HEIGHT - EMOJI_PICKER_GAP
                : pickerRect.bottom + EMOJI_PICKER_GAP;

            setEmojiPickerPosition({ left, top });
        }

        function handleClickOutside(event) {
            const clickedPresetBar = pickerRef.current?.contains(event.target);
            const clickedEmojiPicker = emojiPickerPanelRef.current?.contains(event.target);

            if (!clickedPresetBar && !clickedEmojiPicker) {
                setIsEmojiPickerOpen(false);
            }
        }

        updateEmojiPickerPosition();
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updateEmojiPickerPosition);
        window.addEventListener('scroll', updateEmojiPickerPosition, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateEmojiPickerPosition);
            window.removeEventListener('scroll', updateEmojiPickerPosition, true);
        };
    }, [isEmojiPickerOpen]);

    function handleCustomEmojiClick(emojiData) {
        setIsEmojiPickerOpen(false);
        onReact(post, emojiData.emoji);
    }

    const emojiPicker = isEmojiPickerOpen
        ? createPortal(
            <div
                ref={emojiPickerPanelRef}
                className="fixed z-[1000] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/50"
                style={{
                    left: emojiPickerPosition.left,
                    top: emojiPickerPosition.top,
                    width: EMOJI_PICKER_WIDTH,
                }}
            >
                <Suspense fallback={<div className="w-[340px] p-6 text-sm text-slate-200">Loading emojis...</div>}>
                    <EmojiPicker
                        theme="dark"
                        width={EMOJI_PICKER_WIDTH}
                        height={EMOJI_PICKER_HEIGHT}
                        autoFocusSearch
                        searchDisabled={false}
                        searchPlaceholder="Search emoji"
                        previewConfig={{ showPreview: false }}
                        skinTonesDisabled
                        onEmojiClick={handleCustomEmojiClick}
                    />
                </Suspense>
            </div>,
            document.body,
        )
        : null;
    const reactionCounts = post.reactionCounts ?? [];
    const visibleReactionCounts = reactionCounts.slice(0, MAX_VISIBLE_REACTION_COUNTS);
    const hasMoreReactionCounts = reactionCounts.length > MAX_VISIBLE_REACTION_COUNTS;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div ref={pickerRef} className="relative flex rounded-full border border-white/10 bg-white/5 p-1">
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
                <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-full text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Choose another emoji"
                    aria-expanded={isEmojiPickerOpen}
                    disabled={busy}
                    onClick={() => setIsEmojiPickerOpen((currentValue) => !currentValue)}
                >
                    <Plus className="size-5" aria-hidden="true" />
                </button>

                {emojiPicker}
            </div>

            {reactionCounts.length ? (
                <div className="flex flex-wrap gap-2">
                    {visibleReactionCounts.map((reaction) => (
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
                    {hasMoreReactionCounts ? (
                        <button
                            type="button"
                            className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-slate-100 transition hover:bg-white/20"
                            onClick={() => onOpenReactions(post)}
                        >
                            More
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UserPanelRow } from '@/components/social/UserPanelRow.jsx';
import { sameId } from '@/components/social/socialHelpers.js';

export function ReactionUsersDialog({
    reaction,
    busy,
    currentUserId,
    onClose,
    onSelectUser,
    onAddFriend,
    onReact,
    getRelationship,
}) {
    const users = reaction?.post?.reactions ?? [];
    const isStory = reaction?.post?.type === 'story';
    const sortedUsers = [...users].sort((firstReaction, secondReaction) => {
        const firstIsCurrentUser = sameId(firstReaction.user?.id, currentUserId);
        const secondIsCurrentUser = sameId(secondReaction.user?.id, currentUserId);

        if (firstIsCurrentUser === secondIsCurrentUser) {
            return 0;
        }

        return firstIsCurrentUser ? -1 : 1;
    });

    return (
        <Dialog open={Boolean(reaction)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="border-white/10 bg-[#24213d] text-white shadow-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Reactions
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                        {isStory ? 'People who liked this picture post' : 'People who reacted to this milestone'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid max-h-[23rem] gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                    {sortedUsers.length ? sortedUsers.map((reactionUser) => {
                        const relationship = getRelationship(reactionUser.user);
                        const isCurrentUserReaction = sameId(reactionUser.user?.id, currentUserId);
                        const emoji = reactionUser.emoji || '💜';

                        return (
                            <UserPanelRow
                                key={`${reactionUser.emoji}-${reactionUser.user?.id}`}
                                user={reactionUser.user}
                                busy={busy}
                                relationship={relationship}
                                onOpenProfile={onSelectUser}
                                onAddFriend={onAddFriend}
                                trailingContent={isCurrentUserReaction ? (
                                    <button
                                        type="button"
                                        className="rounded-full px-2 py-1 text-xl transition hover:bg-white/10 disabled:opacity-60"
                                        aria-label={`Remove your ${emoji} reaction`}
                                        disabled={busy}
                                        onClick={() => onReact(reaction.post, emoji)}
                                    >
                                        {emoji}
                                    </button>
                                ) : (
                                    <span className="px-2 py-1 text-xl" aria-hidden="true">
                                        {emoji}
                                    </span>
                                )}
                            />
                        );
                    }) : (
                        <p className="text-sm text-slate-300">No reactions yet</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

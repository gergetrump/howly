import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UserPanelRow } from '@/components/social/UserPanelRow.jsx';

export function ReactionUsersDialog({
    reaction,
    busy,
    onClose,
    onSelectUser,
    onAddFriend,
    getRelationship,
}) {
    const users = reaction?.post?.reactions ?? [];

    return (
        <Dialog open={Boolean(reaction)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="border-white/10 bg-[#24213d] text-white shadow-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Reactions
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                        People who reacted to this milestone
                    </DialogDescription>
                </DialogHeader>

                <div className="grid max-h-[23rem] gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                    {users.length ? users.map((reactionUser) => {
                        const relationship = getRelationship(reactionUser.user);
                        return (
                            <UserPanelRow
                                key={`${reactionUser.emoji}-${reactionUser.user?.id}`}
                                user={reactionUser.user}
                                emoji={reactionUser.emoji || '💜'}
                                busy={busy}
                                relationship={relationship}
                                onOpenProfile={onSelectUser}
                                onAddFriend={onAddFriend}
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

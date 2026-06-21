import { Loader2, Send } from 'lucide-react';
import { ActionButton } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

function getDisplayName(user) {
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Friend';
}

export function ChallengeInviteDialog({
    open,
    onOpenChange,
    challenge,
    friends,
    selectedFriendIds,
    onToggleFriendId,
    onInvite,
    isLoading,
    isSubmitting,
    error,
}) {
    const hasFriends = friends.length > 0;
    const selectedCount = selectedFriendIds.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg rounded-2xl border-white/10 bg-[#1e1b3a] text-white">
                <DialogHeader>
                    <DialogTitle>Invite friends</DialogTitle>
                    <DialogDescription className="text-slate-300">
                        {challenge?.title ? `Send an invitation for ${challenge.title}.` : 'Send a challenge invitation.'}
                    </DialogDescription>
                </DialogHeader>

                {error ? (
                    <p className="rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        {error}
                    </p>
                ) : null}

                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {isLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            Loading friends
                        </div>
                    ) : null}

                    {!isLoading && hasFriends ? friends.map(({ id, friend }) => {
                        const friendId = friend?.id;
                        const selected = selectedFriendIds.includes(friendId);

                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onToggleFriendId(friendId)}
                                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                                    selected
                                        ? 'border-emerald-300/60 bg-emerald-400/15 text-white'
                                        : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                                }`}
                            >
                                <span className="min-w-0">
                                    <span className="block truncate font-medium">{getDisplayName(friend)}</span>
                                    {friend?.username ? (
                                        <span className="block truncate text-xs text-slate-400">@{friend.username}</span>
                                    ) : null}
                                </span>
                                {selected ? <span className="text-xs font-semibold text-emerald-200">Selected</span> : null}
                            </button>
                        );
                    }) : null}

                    {!isLoading && !hasFriends ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center text-sm text-slate-300">
                            Add friends first, then invite them to your challenge.
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="border-white/10 bg-white/5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                    >
                        Cancel
                    </Button>
                    <ActionButton
                        type="button"
                        onClick={onInvite}
                        disabled={selectedCount === 0 || isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                        {selectedCount > 1 ? `Send ${selectedCount} invites` : 'Send invite'}
                    </ActionButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

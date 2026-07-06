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
            <DialogContent className="sm:max-w-lg rounded-2xl border-theme-text/10 bg-theme-surface text-theme-text">
                <DialogHeader>
                    <DialogTitle>Invite friends</DialogTitle>
                    <DialogDescription className="text-theme-text-soft">
                        {challenge?.title ? `Send an invitation for ${challenge.title}.` : 'Send a challenge invitation.'}
                    </DialogDescription>
                </DialogHeader>

                {error ? (
                    <p className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                        {error}
                    </p>
                ) : null}

                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {isLoading ? (
                        <div className="flex items-center gap-2 rounded-xl border border-theme-text/10 bg-theme-text/5 p-4 text-sm text-theme-text">
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
                                        ? 'border-theme-success/60 bg-theme-success/15 text-theme-text'
                                        : 'border-theme-text/10 bg-theme-text/5 text-theme-text hover:bg-theme-text/10'
                                }`}
                            >
                                <span className="min-w-0">
                                    <span className="block truncate font-medium">{getDisplayName(friend)}</span>
                                    {friend?.username ? (
                                        <span className="block truncate text-xs text-theme-text-muted">@{friend.username}</span>
                                    ) : null}
                                </span>
                                {selected ? <span className="text-xs font-semibold text-emerald-200">Selected</span> : null}
                            </button>
                        );
                    }) : null}

                    {!isLoading && !hasFriends ? (
                        <div className="rounded-xl border border-theme-text/10 bg-theme-text/5 p-5 text-center text-sm text-theme-text-soft">
                            Add friends first, then invite them to your challenge.
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="border-theme-text/10 bg-theme-text/5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="border-theme-text/20 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
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

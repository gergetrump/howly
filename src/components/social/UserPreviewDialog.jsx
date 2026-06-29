import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    ConfirmationDialog,
    ConfirmationDialogContent,
    ConfirmationDialogDescription,
    ConfirmationDialogFooter,
    ConfirmationDialogHeader,
    ConfirmationDialogTitle,
} from '@/components/ui/confirmation-dialog';
import { UserAvatar } from '@/components/social/UserProfileTrigger.jsx';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';

export function UserPreviewDialog({
    user,
    relationship,
    busy,
    isBlocked = false,
    onClose,
    onAddFriend,
    onAcceptRequest,
    onBlock,
    onUnblock,
}) {
    const isOpen = Boolean(user);
    const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);

    const blockTitle = relationship?.status === 'friends' ? 'Block this friend?' : 'Block this user?';
    const blockDesc = relationship?.status === 'friends'
        ? "Are you sure you want to block this friend? You will no longer be friends or see each other's progress."
        : "Are you sure you want to block this user? They will no longer be able to interact with you or see your progress.";
    const blockBtnText = relationship?.status === 'friends' ? 'Block friend' : 'Block user';

    function renderAction() {
        if (!user || relationship.status === 'self' || isBlocked) {
            return null;
        }

        if (relationship.status === 'friends') {
            return (
                <Button type="button" disabled className="bg-white/10 text-slate-200 w-full">
                    Friends
                </Button>
            );
        }

        if (relationship.status === 'outgoing') {
            return (
                <Button type="button" disabled className="bg-white/10 text-slate-200 w-full">
                    Request sent
                </Button>
            );
        }

        if (relationship.status === 'incoming') {
            return (
                <Button
                    type="button"
                    className="bg-emerald-700 text-white hover:bg-emerald-600 w-full"
                    disabled={busy}
                    onClick={() => onAcceptRequest(relationship.requestId)}
                >
                    Accept request
                </Button>
            );
        }

        return (
            <Button
                type="button"
                className="bg-violet-500 text-white hover:bg-violet-400 w-full"
                disabled={busy}
                onClick={() => onAddFriend(user)}
            >
                <Plus aria-hidden="true" />
                Add friend
            </Button>
        );
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="border-white/10 bg-[#24213d] text-white shadow-2xl sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="sr-only">User profile</DialogTitle>
                        <DialogDescription className="sr-only">
                            Small profile preview with friend action
                        </DialogDescription>
                    </DialogHeader>

                    {user ? (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <UserAvatar user={user} className="size-20" />
                            <div>
                                <h3 className="text-2xl font-bold">{getDisplayName(user)}</h3>
                                <p className="text-slate-300">@{getUsername(user)}</p>
                                <p className="mt-2 text-sm font-medium text-slate-200">🔥 {user?.streak ?? 0} days</p>
                            </div>
                            {relationship.status === 'self' ? (
                                <p className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">This is you</p>
                            ) : (
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    {renderAction()}
                                    {isBlocked ? (
                                        <Button
                                            type="button"
                                            className="bg-slate-700 text-white hover:bg-slate-600 w-full"
                                            disabled={busy}
                                            onClick={() => onUnblock?.(user.id || user._id)}
                                        >
                                            Unblock User
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            className="bg-red-950 text-red-200 border border-red-800/30 hover:bg-red-900/80 w-full"
                                            disabled={busy}
                                            onClick={() => setIsBlockConfirmOpen(true)}
                                        >
                                            Block User
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            <ConfirmationDialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
                <ConfirmationDialogContent className="border-0 bg-[#1e1b3a] p-8 text-white shadow-2xl sm:max-w-md z-[110]">
                    <ConfirmationDialogHeader className="space-y-3 text-center">
                        <ConfirmationDialogTitle className="text-xl font-bold">
                            {blockTitle}
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="text-sm text-slate-300">
                            {blockDesc}
                        </ConfirmationDialogDescription>
                    </ConfirmationDialogHeader>
                    <ConfirmationDialogFooter className="mt-4 gap-3 sm:justify-center">
                        <AlertDialogPrimitive.Cancel asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                            >
                                Cancel
                            </Button>
                        </AlertDialogPrimitive.Cancel>
                        <AlertDialogPrimitive.Action asChild>
                            <Button
                                type="button"
                                className="bg-red-500 text-white hover:bg-red-400"
                                disabled={busy}
                                onClick={() => {
                                    setIsBlockConfirmOpen(false);
                                    onBlock?.(user.id || user._id);
                                }}
                            >
                                {blockBtnText}
                            </Button>
                        </AlertDialogPrimitive.Action>
                    </ConfirmationDialogFooter>
                </ConfirmationDialogContent>
            </ConfirmationDialog>
        </>
    );
}

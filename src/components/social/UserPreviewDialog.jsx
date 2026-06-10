import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/social/UserProfileTrigger.jsx';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';

export function UserPreviewDialog({
    user,
    relationship,
    busy,
    onClose,
    onAddFriend,
    onAcceptRequest,
}) {
    const isOpen = Boolean(user);

    function renderAction() {
        if (!user || relationship.status === 'self') {
            return null;
        }

        if (relationship.status === 'friends') {
            return (
                <Button type="button" disabled className="bg-white/10 text-slate-200">
                    Friends
                </Button>
            );
        }

        if (relationship.status === 'outgoing') {
            return (
                <Button type="button" disabled className="bg-white/10 text-slate-200">
                    Request sent
                </Button>
            );
        }

        if (relationship.status === 'incoming') {
            return (
                <Button
                    type="button"
                    className="bg-emerald-700 text-white hover:bg-emerald-600"
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
                className="bg-violet-500 text-white hover:bg-violet-400"
                disabled={busy}
                onClick={() => onAddFriend(user)}
            >
                <Plus aria-hidden="true" />
                Add friend
            </Button>
        );
    }

    return (
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
                        ) : renderAction()}
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

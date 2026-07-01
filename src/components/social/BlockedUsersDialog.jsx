import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/social/UserProfileTrigger.jsx';
import { getBlockedUsers, unblockUser } from '@/services/socialApi';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';

export function BlockedUsersDialog({ open, onOpenChange }) {
    const [blockedList, setBlockedList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [busyUserId, setBusyUserId] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            void loadBlockedUsers();
        }
    }, [open]);

    async function loadBlockedUsers() {
        setIsLoading(true);
        setError('');
        try {
            const data = await getBlockedUsers();
            setBlockedList(data ?? []);
        } catch (err) {
            setError(err.message || 'Failed to load blocked users');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleUnblock(userId) {
        setBusyUserId(userId);
        setError('');
        try {
            await unblockUser(userId);
            setBlockedList((prev) => prev.filter((u) => (u.id || u._id) !== userId));
        } catch (err) {
            setError(err.message || 'Failed to unblock user');
        } finally {
            setBusyUserId(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-white/10 bg-[#24213d] text-white shadow-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Ban className="size-5 text-red-400" />
                        Blocked Users
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        Users listed here cannot message you, send friend requests, or view your stories and streak.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 max-h-80 overflow-y-auto pr-1 space-y-3">
                    {isLoading ? (
                        <p className="text-sm text-slate-400">Loading...</p>
                    ) : error ? (
                        <p className="text-sm text-red-400">{error}</p>
                    ) : blockedList.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No blocked users.</p>
                    ) : (
                        blockedList.map((blockedUser) => {
                            const displayName = getDisplayName(blockedUser);
                            const username = getUsername(blockedUser);
                            const id = blockedUser.id || blockedUser._id;

                            return (
                                <div key={id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/5">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <UserAvatar user={blockedUser} className="size-9" />
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-sm truncate">{displayName}</h4>
                                            <p className="text-xs text-slate-400 truncate">@{username}</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="bg-red-950 text-red-200 border border-red-800/30 hover:bg-red-900/80 h-8 rounded-full text-xs font-semibold px-4"
                                        disabled={busyUserId === id}
                                        onClick={() => handleUnblock(id)}
                                    >
                                        {busyUserId === id ? 'Unblocking...' : 'Unblock'}
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

import { useEffect, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
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
import { ReportUserDialog } from '@/components/social/ReportUserDialog.jsx';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';
import { getFriendHabits, getFriendChallenges } from '@/services/socialApi';

export function UserPreviewDialog({
    user,
    relationship,
    busy,
    isBlocked = false,
    isBlockedByMe = false,
    hasBlockedCurrentUser = false,
    onClose,
    onAddFriend,
    onAcceptRequest,
    onBlock,
    onUnblock,
}) {
    const isOpen = Boolean(user);
    const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    const friendId = user?.id || user?._id;
    const isFriend = relationship?.status === 'friends';
    const isProfileRestricted = isBlockedByMe || hasBlockedCurrentUser;
    const [loadedHabits, setLoadedHabits] = useState({ userId: null, habits: [] });
    const [loadedChallenges, setLoadedChallenges] = useState({ userId: null, challenges: [] });
    const previewUser = isProfileRestricted && user
        ? { ...user, profilePictureUrl: null, isPremium: false, role: undefined }
        : user;

    useEffect(() => {
        if (!friendId || !isFriend || isProfileRestricted) {
            return undefined;
        }

        let active = true;
        getFriendHabits(friendId)
            .then((response) => {
                if (active) {
                    setLoadedHabits({ userId: friendId, habits: Array.isArray(response?.habits) ? response.habits : [] });
                }
            })
            .catch(() => {
                if (active) {
                    setLoadedHabits({ userId: friendId, habits: [] });
                }
            });

        return () => {
            active = false;
        };
    }, [friendId, isFriend, isProfileRestricted]);

    useEffect(() => {
        if (!friendId || !isFriend || isProfileRestricted) {
            return undefined;
        }

        let active = true;
        getFriendChallenges(friendId)
            .then((response) => {
                if (active) {
                    setLoadedChallenges({ userId: friendId, challenges: Array.isArray(response?.challenges) ? response.challenges : [] });
                }
            })
            .catch(() => {
                if (active) {
                    setLoadedChallenges({ userId: friendId, challenges: [] });
                }
            });

        return () => {
            active = false;
        };
    }, [friendId, isFriend, isProfileRestricted]);

    const habitsLoaded = loadedHabits.userId === friendId;
    const friendHabits = habitsLoaded ? loadedHabits.habits : [];
    const challengesLoaded = loadedChallenges.userId === friendId;
    const friendChallenges = challengesLoaded ? loadedChallenges.challenges : [];
    const isGhostFriend = isFriend && user?.ghostMode === true;

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
                <Button type="button" size="sm" disabled className="bg-theme-text/10 text-theme-text w-auto px-6 h-8 text-xs font-semibold rounded-full mx-auto">
                    Friends
                </Button>
            );
        }

        if (relationship.status === 'outgoing') {
            return (
                <Button type="button" size="sm" disabled className="bg-theme-text/10 text-theme-text w-auto px-6 h-8 text-xs font-semibold rounded-full mx-auto">
                    Request sent
                </Button>
            );
        }

        if (relationship.status === 'incoming') {
            return (
                <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-700 text-white hover:bg-emerald-600 w-auto px-6 h-8 text-xs font-semibold rounded-full mx-auto"
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
                size="sm"
                variant="primary"
                className="w-auto px-6 h-8 text-xs rounded-full mx-auto"
                disabled={busy}
                onClick={() => onAddFriend(user)}
            >
                <Plus className="mr-1 size-3.5" aria-hidden="true" />
                Add friend
            </Button>
        );
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="border-theme-text/10 bg-theme-surface text-theme-text shadow-2xl sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="sr-only">User profile</DialogTitle>
                        <DialogDescription className="sr-only">
                            Small profile preview with friend action
                        </DialogDescription>
                    </DialogHeader>

                    {user ? (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <UserAvatar user={previewUser} className="size-20" />
                            <div>
                                <h3 className="text-2xl font-bold">{getDisplayName(user)}</h3>
                                <p className="text-theme-text-soft">@{getUsername(user)}</p>
                                {!isProfileRestricted && isGhostFriend ? (
                                    <p className="mt-2 text-sm font-medium text-theme-text-soft">👻 In Ghost Mode</p>
                                ) : !isProfileRestricted ? (
                                    <p className="mt-2 text-sm font-medium text-theme-text">🔥 {user?.streak ?? 0} days</p>
                                ) : null}
                            </div>
                            {isFriend && !isGhostFriend && !isProfileRestricted ? (
                                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col">
                                        <p className="mb-2 text-left text-xs font-semibold uppercase tracking-wide text-theme-text-muted">Habits</p>
                                        {!habitsLoaded ? (
                                            <p className="flex flex-1 items-center justify-center text-sm text-theme-text-muted">Loading habits…</p>
                                        ) : friendHabits.length > 0 ? (
                                            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                                                {friendHabits.map((habit) => (
                                                    <div key={habit.id} className="flex items-center gap-3 rounded-xl bg-theme-text/5 px-3 py-2 text-left">
                                                        <span className="text-lg" aria-hidden="true">{habit.icon}</span>
                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-theme-text">{habit.title}</span>
                                                        <span className="shrink-0 text-sm font-semibold text-theme-gold">🔥 {habit.streakCount}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="flex flex-1 items-center justify-center text-sm text-theme-text-muted">No habits yet.</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="mb-2 text-left text-xs font-semibold uppercase tracking-wide text-theme-text-muted">Active Challenges</p>
                                        {!challengesLoaded ? (
                                            <p className="flex flex-1 items-center justify-center text-sm text-theme-text-muted">Loading challenges…</p>
                                        ) : friendChallenges.length > 0 ? (
                                            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                                                {friendChallenges.map((challenge) => (
                                                    <div key={challenge.id} className="flex items-center gap-3 rounded-xl bg-theme-text/5 px-3 py-2 text-left">
                                                        <span className="text-lg" aria-hidden="true">🏆</span>
                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-theme-text">{challenge.title}</span>
                                                        <span className="shrink-0 text-xs font-semibold text-theme-text-soft">{challenge.daysCompleted}/{challenge.totalDays} days</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="flex flex-1 items-center justify-center text-sm text-theme-text-muted">No active challenges.</p>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                            {relationship.status === 'self' ? (
                                <p className="rounded-full bg-theme-text/10 px-4 py-2 text-sm text-theme-text">This is you</p>
                            ) : (
                                <div className="flex flex-col gap-2.5 w-full mt-2 items-center">
                                    {renderAction()}
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="bg-theme-text/10 text-theme-text hover:bg-theme-text/15 hover:text-theme-text w-auto px-6 h-8 text-xs font-semibold rounded-full mx-auto"
                                        onClick={() => setIsReportDialogOpen(true)}
                                    >
                                        <AlertTriangle className="mr-1 size-3.5" aria-hidden="true" />
                                        Report
                                    </Button>
                                    {isBlockedByMe ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="bg-theme-surface-2 text-theme-text hover:bg-theme-surface-2 w-auto px-6 h-8 text-xs font-semibold rounded-full mx-auto"
                                            disabled={busy}
                                            onClick={() => onUnblock?.(user.id || user._id)}
                                        >
                                            Unblock User
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="bg-red-950 text-red-200 border border-red-800/30 hover:bg-red-900/80 w-auto px-6 h-8 text-xs font-semibold rounded-full mx-auto"
                                            disabled={busy}
                                            onClick={() => setIsBlockConfirmOpen(true)}
                                        >
                                            {relationship?.status === 'friends' ? 'Block Friend' : 'Block User'}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            <ConfirmationDialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
                <ConfirmationDialogContent className="border-0 bg-theme-surface p-8 text-theme-text shadow-2xl sm:max-w-md z-[110]">
                    <ConfirmationDialogHeader className="space-y-3 text-center">
                        <ConfirmationDialogTitle className="text-xl font-bold">
                            {blockTitle}
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="text-sm text-theme-text-soft">
                            {blockDesc}
                        </ConfirmationDialogDescription>
                    </ConfirmationDialogHeader>
                    <ConfirmationDialogFooter className="mt-4 gap-3 sm:justify-center">
                        <AlertDialogPrimitive.Cancel asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="border-theme-text/15 bg-theme-text/10 text-theme-text hover:bg-theme-text/20 hover:text-theme-text"
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

            <ReportUserDialog
                user={user}
                open={isReportDialogOpen}
                onOpenChange={setIsReportDialogOpen}
            />
        </>
    );
}

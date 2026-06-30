import { useState } from 'react';
import { Check, X, MoreVertical, Ban } from 'lucide-react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserAvatar } from '@/components/social/UserProfileTrigger.jsx';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';
import {
    ConfirmationDialog,
    ConfirmationDialogContent,
    ConfirmationDialogDescription,
    ConfirmationDialogFooter,
    ConfirmationDialogHeader,
    ConfirmationDialogTitle,
} from '@/components/ui/confirmation-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function FriendRequestCard({ request, busy, onAccept, onReject, onBlock }) {
    const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
    const requester = request.requester;
    const requesterName = getDisplayName(requester);

    return (
        <Card className="border-white/10 bg-white/8 text-slate-100 shadow-xl shadow-slate-950/20 backdrop-blur">
            <CardContent className="flex flex-wrap items-center gap-3">
                <UserAvatar user={requester} />

                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{requesterName}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="truncate text-sm text-slate-300">@{getUsername(requester)}</p>
                        <p className="shrink-0 text-sm font-medium text-slate-200">
                            🔥 {requester?.streak ?? 0} days
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="icon"
                        className="bg-emerald-700 text-white hover:bg-emerald-600 h-9 w-9"
                        aria-label="Accept friend request"
                        disabled={busy}
                        onClick={() => onAccept(request.id)}
                    >
                        <Check aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        className="border border-white/15 bg-white/10 text-slate-100 hover:bg-white/20 h-9 w-9"
                        aria-label="Reject friend request"
                        disabled={busy}
                        onClick={() => onReject(request.id)}
                    >
                        <X aria-hidden="true" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                                aria-label={`Open actions for ${requesterName}`}
                                disabled={busy}
                            >
                                <MoreVertical aria-hidden="true" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 border-slate-800 bg-slate-950 text-slate-300">
                            <DropdownMenuItem
                                className="cursor-pointer text-red-400 focus:bg-slate-800 focus:text-red-300"
                                onClick={() => setIsBlockDialogOpen(true)}
                            >
                                <Ban className="mr-2 h-4 w-4" />
                                Block user
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <ConfirmationDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                        <ConfirmationDialogContent className="border-0 bg-[#1e1b3a] p-8 text-white shadow-2xl sm:max-w-md">
                            <ConfirmationDialogHeader className="space-y-3 text-center">
                                <ConfirmationDialogTitle className="text-xl font-bold">
                                    Block this user?
                                </ConfirmationDialogTitle>
                                <ConfirmationDialogDescription className="text-sm text-slate-300">
                                    Are you sure you want to block this user? They will no longer be able to send you friend requests or see your progress.
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
                                            setIsBlockDialogOpen(false);
                                            onBlock(requester.id || requester._id);
                                        }}
                                    >
                                        Block user
                                    </Button>
                                </AlertDialogPrimitive.Action>
                            </ConfirmationDialogFooter>
                        </ConfirmationDialogContent>
                    </ConfirmationDialog>
                </div>
            </CardContent>
        </Card>
    );
}

import { useState } from 'react';
import { MoreVertical, Plus, Trash2 } from 'lucide-react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { FriendCard } from '@/components/cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { AddFriendPanel } from '@/components/social/AddFriendPanel.jsx';
import { FriendRequestCard } from '@/components/social/FriendRequestCard.jsx';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';

function EmptyState({ children }) {
    return (
        <Card className="border-white/10 bg-white/8 text-slate-200 shadow-xl shadow-slate-950/20 backdrop-blur">
            <CardContent>
                <p className="text-sm text-slate-300">{children}</p>
            </CardContent>
        </Card>
    );
}

function FriendActions({ friend, friendshipId, busy, onDelete }) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const friendName = getDisplayName(friend);

    return (
        <div className="flex items-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
                        aria-label={`Open actions for ${friendName}`}
                        disabled={busy}
                    >
                        <MoreVertical aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 border-slate-800 bg-slate-950 text-slate-300">
                    <DropdownMenuItem
                        className="cursor-pointer focus:bg-slate-800 focus:text-white"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete friend
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmationDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <ConfirmationDialogContent className="border-0 bg-[#1e1b3a] p-8 text-white shadow-2xl sm:max-w-md">
                    <ConfirmationDialogHeader className="space-y-3 text-center">
                        <ConfirmationDialogTitle className="text-xl font-bold">
                            Remove this friend?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="text-sm text-slate-300">
                            Are you sure you want to remove this friend?
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
                                onClick={() => onDelete(friendshipId, friend)}
                            >
                                Delete friend
                            </Button>
                        </AlertDialogPrimitive.Action>
                    </ConfirmationDialogFooter>
                </ConfirmationDialogContent>
            </ConfirmationDialog>
        </div>
    );
}

export function FriendsPanel({
    activePanel,
    friends,
    requests,
    usernameQuery,
    searchResults,
    pendingFriendRequestCount,
    notice,
    error,
    isLoading,
    isSearching,
    isSubmitting,
    busyRequestId,
    busyFriendId,
    onActivePanelChange,
    onUsernameQueryChange,
    onSearchUsers,
    onSendFriendRequest,
    onAcceptRequest,
    onRejectRequest,
    onDeleteFriend,
    onOpenProfile,
    getRelationship,
}) {
    return (
        <aside className="ml-auto w-full max-w-[42rem] space-y-3 lg:sticky lg:top-24 lg:max-w-[22rem] lg:max-h-[calc(100vh-8rem)] lg:flex lg:flex-col">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="inline-flex rounded-lg border border-white/10 bg-white/10 p-1 text-sm text-slate-300">
                    <button
                        type="button"
                        className={`rounded-md px-3 py-2 font-medium transition ${activePanel === 'friends' ? 'bg-white text-slate-950' : 'hover:bg-white/10 hover:text-white'}`}
                        onClick={() => onActivePanelChange('friends')}
                    >
                        Friends
                    </button>
                    <button
                        type="button"
                        className={`flex items-center gap-2 rounded-md px-3 py-2 font-medium transition ${activePanel === 'requests' ? 'bg-white text-slate-950' : 'hover:bg-white/10 hover:text-white'}`}
                        onClick={() => onActivePanelChange('requests')}
                    >
                        Friend Requests
                        {pendingFriendRequestCount > 0 ? (
                            <span className="flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold leading-5 text-white">
                                {pendingFriendRequestCount}
                            </span>
                        ) : null}
                    </button>
                </div>
                <Button
                    type="button"
                    className="bg-violet-500 text-white hover:bg-violet-400"
                    onClick={() => onActivePanelChange('add')}
                >
                    <Plus aria-hidden="true" />
                    Add Friend
                </Button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {activePanel === 'friends' ? (
                    isLoading ? (
                        <EmptyState>Loading friends</EmptyState>
                    ) : friends.length ? (
                        <div className="grid gap-3">
                            {friends.map(({ id, friend }) => (
                                <FriendCard
                                    key={id}
                                    name={getDisplayName(friend)}
                                    username={getUsername(friend)}
                                    streakDays={friend?.streak ?? 0}
                                    avatarSrc={friend?.profilePictureUrl}
                                    user={friend}
                                    onClick={() => onOpenProfile(friend)}
                                    action={(
                                        <FriendActions
                                            friend={friend}
                                            friendshipId={id}
                                            busy={busyFriendId === id}
                                            onDelete={onDeleteFriend}
                                        />
                                    )}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState>No friends yet</EmptyState>
                    )
                ) : null}

                {activePanel === 'requests' ? (
                    isLoading ? (
                        <EmptyState>Loading requests</EmptyState>
                    ) : requests.incoming?.length ? (
                        <div className="grid gap-3">
                            {requests.incoming.map((request) => (
                                <FriendRequestCard
                                    key={request.id}
                                    request={request}
                                    busy={busyRequestId === request.id}
                                    onAccept={onAcceptRequest}
                                    onReject={onRejectRequest}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState>No pending requests</EmptyState>
                    )
                ) : null}

                {activePanel === 'add' ? (
                    <AddFriendPanel
                        usernameQuery={usernameQuery}
                        searchResults={searchResults}
                        isSearching={isSearching}
                        isSubmitting={isSubmitting}
                        onUsernameQueryChange={onUsernameQueryChange}
                        onSearchUsers={onSearchUsers}
                        onSendFriendRequest={onSendFriendRequest}
                        onOpenProfile={onOpenProfile}
                        getRelationship={getRelationship}
                    />
                ) : null}
            </div>

            {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </aside>
    );
}

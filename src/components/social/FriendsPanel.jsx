import { useState } from 'react';
import { MoreVertical, Plus, Trash2, Ban } from 'lucide-react';
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
import { appTabsListClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

function friendsPanelTabClass(isActive) {
    return cn(
        'rounded-md px-3 py-2 text-center font-medium transition',
        isActive
            ? 'bg-theme-text/20 text-theme-text'
            : 'text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text',
    );
}

function EmptyState({ children }) {
    return (
        <Card className="border-theme-text/10 bg-theme-surface text-theme-text">
            <CardContent>
                <p className="text-sm text-theme-text-soft">{children}</p>
            </CardContent>
        </Card>
    );
}

function FriendActions({ friend, friendshipId, busy, onDelete, onBlock }) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
    const friendName = getDisplayName(friend);

    return (
        <div className="flex items-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text"
                        aria-label={`Open actions for ${friendName}`}
                        disabled={busy}
                    >
                        <MoreVertical aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 border-theme-text/10 bg-theme-bg text-theme-text-soft">
                    <DropdownMenuItem
                        className="cursor-pointer focus:bg-theme-surface-2 focus:text-theme-text"
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete friend
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="cursor-pointer text-theme-danger focus:bg-theme-surface-2 focus:text-theme-danger"
                        onClick={() => setIsBlockDialogOpen(true)}
                    >
                        <Ban className="mr-2 h-4 w-4" />
                        Block friend
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmationDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <ConfirmationDialogContent className="border-0 bg-theme-surface p-8 text-theme-text shadow-2xl sm:max-w-md">
                    <ConfirmationDialogHeader className="space-y-3 text-center">
                        <ConfirmationDialogTitle className="text-xl font-bold">
                            Remove this friend?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="text-sm text-theme-text-soft">
                            Are you sure you want to remove this friend?
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
                                onClick={() => onDelete(friendshipId, friend)}
                            >
                                Delete friend
                            </Button>
                        </AlertDialogPrimitive.Action>
                    </ConfirmationDialogFooter>
                </ConfirmationDialogContent>
            </ConfirmationDialog>

            <ConfirmationDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                <ConfirmationDialogContent className="border-0 bg-theme-surface p-8 text-theme-text shadow-2xl sm:max-w-md">
                    <ConfirmationDialogHeader className="space-y-3 text-center">
                        <ConfirmationDialogTitle className="text-xl font-bold">
                            Block this friend?
                        </ConfirmationDialogTitle>
                        <ConfirmationDialogDescription className="text-sm text-theme-text-soft">
                            Are you sure you want to block this friend? You will no longer be friends or see each other's progress.
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
                                    setIsBlockDialogOpen(false);
                                    onBlock(friend.id || friend._id);
                                }}
                            >
                                Block friend
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
    hasMoreFriends = false,
    isLoadingMoreFriends = false,
    hasMoreIncomingRequests = false,
    isLoadingMoreIncomingRequests = false,
    usernameQuery,
    searchResults,
    pendingFriendRequestCount,
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
    onLoadMoreFriends,
    onLoadMoreIncomingRequests,
    onDeleteFriend,
    onBlockUser,
    onOpenProfile,
    getRelationship,
}) {
    return (
        <aside className="ml-auto w-full max-w-[42rem] space-y-3 lg:sticky lg:top-24 lg:max-w-[26rem] lg:max-h-[calc(100vh-8rem)] lg:flex lg:flex-col">
            <div className="flex items-center gap-2 shrink-0">
                <div className={cn('grid w-72 grid-cols-2 rounded-lg p-1 text-sm', appTabsListClassName)}>
                    <button
                        type="button"
                        className={friendsPanelTabClass(activePanel === 'friends')}
                        onClick={() => onActivePanelChange('friends')}
                    >
                        Friends
                    </button>
                    <button
                        type="button"
                        className={cn('relative', friendsPanelTabClass(activePanel === 'requests'))}
                        onClick={() => onActivePanelChange('requests')}
                    >
                        Friend Requests
                        {pendingFriendRequestCount > 0 ? (
                            <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border border-[#24213d] shadow-sm">
                                {hasMoreIncomingRequests ? `${pendingFriendRequestCount}+` : pendingFriendRequestCount}
                            </span>
                        ) : null}
                    </button>
                </div>
                <Button
                    type="button"
                    variant="primary"
                    className="h-11 w-28"
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
                                            onBlock={onBlockUser}
                                        />
                                    )}
                                />
                            ))}
                            {hasMoreFriends ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full text-theme-accent-soft hover:bg-violet-400/15 hover:text-theme-accent-soft"
                                    disabled={isLoadingMoreFriends}
                                    onClick={onLoadMoreFriends}
                                >
                                    {isLoadingMoreFriends ? 'Loading...' : 'Load more'}
                                </Button>
                            ) : null}
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
                                    onOpenProfile={onOpenProfile}
                                />
                            ))}
                            {hasMoreIncomingRequests ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full text-theme-accent-soft hover:bg-violet-400/15 hover:text-theme-accent-soft"
                                    disabled={isLoadingMoreIncomingRequests}
                                    onClick={onLoadMoreIncomingRequests}
                                >
                                    {isLoadingMoreIncomingRequests ? 'Loading...' : 'Load more'}
                                </Button>
                            ) : null}
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

            {error ? <p className="text-sm text-theme-danger">{error}</p> : null}
        </aside>
    );
}

import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPanelRow } from '@/components/social/UserPanelRow.jsx';

export function AddFriendPanel({
    usernameQuery,
    searchResults,
    isSearching,
    isSubmitting,
    onUsernameQueryChange,
    onSearchUsers,
    onSendFriendRequest,
    onOpenProfile,
    getRelationship,
}) {
    return (
        <div className="space-y-3">
            <form className="flex flex-col gap-2 sm:flex-row lg:flex-col" onSubmit={onSearchUsers}>
                <Input
                    value={usernameQuery}
                    placeholder="Search username"
                    className="border-theme-text/20 bg-theme-text/10 text-slate-50 placeholder:text-theme-text-soft"
                    disabled={isSearching}
                    onChange={(event) => onUsernameQueryChange(event.target.value)}
                />
                <Button
                    type="submit"
                    className="bg-white text-slate-950 hover:bg-theme-invert/85"
                    disabled={isSearching}
                >
                    <Send aria-hidden="true" />
                    Search
                </Button>
            </form>

            {searchResults.length ? (
                <div className="grid gap-2">
                    {searchResults.map((user) => (
                        <UserPanelRow
                            key={user.id}
                            user={user}
                            busy={isSubmitting}
                            relationship={getRelationship(user)}
                            avatarClassName="size-10"
                            onOpenProfile={onOpenProfile}
                            onAddFriend={onSendFriendRequest}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

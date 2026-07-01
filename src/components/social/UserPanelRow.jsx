import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfileTrigger } from '@/components/social/UserProfileTrigger.jsx';
import { getDisplayName } from '@/components/social/socialHelpers.js';

export function UserPanelRow({
    user,
    emoji,
    busy = false,
    relationship = { status: 'none' },
    avatarClassName = 'size-11',
    className = '',
    surfaceClassName = 'bg-white/8',
    children,
    trailingContent,
    onOpenProfile,
    onAddFriend,
}) {
    const canAddFriend = relationship.status === 'none';
    const isSelf = relationship.status === 'self';
    const hasCustomActions = Boolean(children);
    const defaultTrailingContent = emoji ? <span className="text-xl" aria-hidden="true">{emoji}</span> : null;
    const rowTrailingContent = trailingContent ?? defaultTrailingContent;

    return (
        <div className={`flex items-center gap-3 rounded-xl p-3 text-left ${surfaceClassName} ${className}`}>
            <UserProfileTrigger
                user={user}
                avatarClassName={avatarClassName}
                onOpen={onOpenProfile}
            />

            {hasCustomActions ? children : null}
            {!hasCustomActions && rowTrailingContent ? rowTrailingContent : null}

            {!hasCustomActions && !isSelf ? (
                <Button
                    type="button"
                    size="icon"
                    className={canAddFriend
                        ? 'size-9 shrink-0 rounded-full bg-violet-500 text-white hover:bg-violet-400'
                        : 'size-9 shrink-0 rounded-full bg-white/10 text-slate-400 hover:bg-white/10'}
                    aria-label={`Add ${getDisplayName(user)} as friend`}
                    disabled={!canAddFriend || busy}
                    onClick={() => onAddFriend(user)}
                >
                    <Plus aria-hidden="true" />
                </Button>
            ) : null}
        </div>
    );
}

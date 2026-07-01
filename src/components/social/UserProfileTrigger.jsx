import { Crown } from 'lucide-react';

function getDisplayName(user) {
    return user?.firstName || user?.username || 'Howly friend';
}

function getUsername(user) {
    return user?.username || 'friend';
}

export function UserAvatar({ user, className = 'size-12' }) {
    const name = getDisplayName(user);
    const initial = name.trim().charAt(0).toUpperCase() || '?';
    const isPremium = user?.isPremium === true || user?.role === 'admin';

    return (
        <div className="relative shrink-0">

            <div className={`flex ${className} items-center justify-center overflow-hidden rounded-full bg-slate-300 text-lg font-bold text-slate-950 ${isPremium ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800' : ''}`}>
                {user?.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    initial
                )}
            </div>
        </div>
    );
}

export function UserProfileTrigger({
    user,
    avatarClassName = 'size-10',
    className = '',
    children,
    onOpen,
}) {
    return (
        <button
            type="button"
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition hover:bg-white/8 ${className}`}
            onClick={() => onOpen?.(user)}
        >
            <UserAvatar user={user} className={avatarClassName} />
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{getDisplayName(user)}</p>
                <p className="truncate text-sm text-slate-300">@{getUsername(user)}</p>
            </div>
            {children}
        </button>
    );
}

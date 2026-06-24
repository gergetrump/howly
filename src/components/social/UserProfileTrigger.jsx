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
            {isPremium && (
                <span
                    className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 shadow-md shadow-amber-500/40 ring-2 ring-slate-800"
                    aria-label="Premium member"
                    title="Premium member"
                >
                    <Crown className="h-2.5 w-2.5 text-slate-900" aria-hidden="true" />
                </span>
            )}
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

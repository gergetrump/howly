import { Crown } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    const profilePictureUrl = typeof user?.profilePictureUrl === 'string' ? user.profilePictureUrl.trim() : '';
    const [hasImageLoadError, setHasImageLoadError] = useState(false);

    useEffect(() => {
        setHasImageLoadError(false);
    }, [profilePictureUrl]);

    return (
        <div className="relative shrink-0">

            <div className={`flex ${className} items-center justify-center overflow-hidden rounded-full bg-slate-300 text-lg font-bold text-slate-950 ${isPremium ? 'ring-2 ring-theme-gold ring-offset-2 ring-offset-theme-surface' : ''}`}>
                {profilePictureUrl && !hasImageLoadError ? (
                    <img
                        src={profilePictureUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setHasImageLoadError(true)}
                    />
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
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition hover:bg-theme-text/5 ${className}`}
            onClick={() => onOpen?.(user)}
        >
            <UserAvatar user={user} className={avatarClassName} />
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-theme-text">{getDisplayName(user)}</p>
                <p className="truncate text-sm text-theme-text-soft">@{getUsername(user)}</p>
            </div>
            {children}
        </button>
    );
}

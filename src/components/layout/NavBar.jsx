import { Link, NavLink } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useNotificationStream } from '@/hooks/useNotificationStream';
import { BarChart3, Bell, Dumbbell, Home, PackageOpen, ShoppingBag, Trash2, Trophy, UserRound, UsersRound } from 'lucide-react';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { StreakBadge } from '@/components/brand/StreakBadge.jsx';
import { StreakShieldBadge } from '@/components/brand/StreakShieldBadge.jsx';
import {
    clearNotifications,
    deleteNotification,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
} from '@/services/notificationApi';
import howlyIcon from '@/assets/wolf.svg';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/authContext';

const defaultItems = [
    { label: 'Home', to: '/dashboard', icon: Home },
    { label: 'Social', to: '/social', icon: UsersRound },
    { label: 'Shop', to: '/shop', icon: ShoppingBag },
    { label: 'Inventory', to: '/inventory', icon: PackageOpen },
    { label: 'Challenges', to: '/challenges', icon: Trophy },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
    { label: 'Profile', to: '/profile', icon: UserRound },
];

// Available brand sizes: sm, md, lg.
const brandSizes = {
    sm: {
        image: 'size-7',
        text: 'text-base',
    },
    md: {
        image: 'size-8',
        text: 'text-lg',
    },
    lg: {
        image: 'size-10',
        text: 'text-2xl',
    },
};

const navStatBadgeClassName = 'min-h-10 gap-0 px-2 py-1.5 text-[0px] font-bold leading-none sm:gap-2 sm:px-3.5 sm:text-sm';

function getActorName(actor) {
    return actor?.firstName || actor?.username || 'Someone';
}

function getNotificationMessage(notification) {
    const actorName = getActorName(notification.actor);

    switch (notification.type) {
        case 'friend_request_received':
            return `${actorName} sent you a friend request`;
        case 'friend_request_accepted':
            return `${actorName} accepted your friend request`;
        case 'milestone_reacted':
            return `${actorName} reacted to your milestone${notification.metadata?.emoji ? ` ${notification.metadata.emoji}` : ''}`;
        case 'story_liked':
            return `${actorName} liked your post`;
        case 'story_commented':
            return `${actorName} commented on your post`;
        case 'story_tagged':
            return `${actorName} tagged you in a post`;
        default:
            return `${actorName} has an update for you`;
    }
}

function getNotificationLink(notification) {
    const storyId = notification.entityId;
    const commentId = notification.metadata?.commentId;

    switch (notification.type) {
        case 'story_tagged':
        case 'story_commented':
            if (storyId && commentId) {
                return `/social?storyId=${storyId}&commentId=${commentId}`;
            }
            return '/social';
        case 'story_liked':
            return storyId ? `/social?storyId=${storyId}` : '/social';
        default:
            return '/social';
    }
}

function getNotificationNavigationState(notification) {
    const storyId = notification.entityId;
    const commentId = notification.metadata?.commentId;

    if (!storyId) {
        return undefined;
    }

    if (notification.type === 'story_tagged' || notification.type === 'story_commented' || notification.type === 'story_liked') {
        return {
            notificationJump: {
                storyId,
                commentId: commentId ?? null,
                token: `${notification.id}-${Date.now()}`,
            },
        };
    }

    return undefined;
}

function formatNotificationTime(createdAt) {
    if (!createdAt) {
        return '';
    }

    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

    if (elapsedMinutes < 1) {
        return 'now';
    }

    if (elapsedMinutes < 60) {
        return `${elapsedMinutes}m`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);

    if (elapsedHours < 24) {
        return `${elapsedHours}h`;
    }

    return `${Math.floor(elapsedHours / 24)}d`;
}

export function NavBar({
    items = defaultItems,
    brandSize = 'lg',
    className,
}) {    
    const { user } = useAuth();
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [removingNotificationIds, setRemovingNotificationIds] = useState([]);
    const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const notificationMenuRef = useRef(null);
    const notificationListRef = useRef(null);
    const readingNotificationIdsRef = useRef(new Set());
    const brandSizeClasses = brandSizes[brandSize] ?? brandSizes.md;
    const profileItem = items.find((item) => item.to === '/profile');
    const navigationItems = items.filter((item) => item.to !== '/profile');
    const coinAmount = user?.coins ?? 0;
    const streakAmount = user?.streak ?? 0;
    const streakShields = user?.streakShields ?? 0;
    const navProfilePictureUrl = user?.profilePictureUrl;
    const isPremium = user?.isPremium === true || user?.role === 'admin';
    const displayedUnreadNotificationCount = user ? unreadNotificationCount : 0;

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let isMounted = true;

        async function refreshNotifications() {
            try {
                const result = await getUnreadNotificationCount();

                if (isMounted) {
                    setUnreadNotificationCount(result?.unreadCount ?? 0);
                }
            } catch {
                if (isMounted) {
                    setUnreadNotificationCount(0);
                }
            }
        }

        refreshNotifications();
        // Fallback poll — SSE handles the real-time updates; this catches
        // any events missed during reconnects or proxy buffering.
        const intervalId = setInterval(refreshNotifications, 60000);
        window.addEventListener('howly:notifications-updated', refreshNotifications);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            window.removeEventListener('howly:notifications-updated', refreshNotifications);
        };
    }, [user]);

    // Real-time SSE: prepend new notifications instantly.
    useNotificationStream((notification) => {
        setUnreadNotificationCount((c) => c + 1);
        // Only mutate the visible list if the dropdown is already open (it has
        // been fetched). If it's closed the next bell-click fetch will include
        // it anyway.
        setNotifications((current) => {
            if (current.length === 0) return current; // dropdown not yet opened
            return [notification, ...current];
        });
    }, Boolean(user));

    useEffect(() => {
        function handleDocumentPointerDown(event) {
            if (!notificationMenuRef.current?.contains(event.target)) {
                setIsNotificationMenuOpen(false);
            }
        }

        if (isNotificationMenuOpen) {
            document.addEventListener('pointerdown', handleDocumentPointerDown);
        }

        return () => {
            document.removeEventListener('pointerdown', handleDocumentPointerDown);
        };
    }, [isNotificationMenuOpen]);

    useEffect(() => {
        const listElement = notificationListRef.current;

        if (!isNotificationMenuOpen || !listElement || !notifications.length) {
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const notificationId = entry.target.dataset.notificationId;

                    if (
                        !notificationId
                        || entry.intersectionRatio < 0.98
                        || readingNotificationIdsRef.current.has(notificationId)
                    ) {
                        return;
                    }

                    readingNotificationIdsRef.current.add(notificationId);

                    markNotificationRead(notificationId)
                        .then((updatedNotification) => {
                            setNotifications((currentNotifications) =>
                                currentNotifications.map((notification) =>
                                    notification.id === notificationId
                                        ? { ...notification, readAt: updatedNotification.readAt }
                                        : notification
                                )
                            );
                            setUnreadNotificationCount((currentCount) => Math.max(0, currentCount - 1));
                            window.dispatchEvent(new Event('howly:notifications-updated'));
                        })
                        .catch(() => {
                            readingNotificationIdsRef.current.delete(notificationId);
                        });
                });
            },
            {
                root: listElement,
                threshold: 0.98,
            }
        );

        listElement
            .querySelectorAll('[data-unread="true"]')
            .forEach((element) => observer.observe(element));

        return () => {
            observer.disconnect();
        };
    }, [isNotificationMenuOpen, notifications]);

    async function handleNotificationBellClick() {
        const nextIsOpen = !isNotificationMenuOpen;

        setIsNotificationMenuOpen(nextIsOpen);

        if (!nextIsOpen) {
            return;
        }

        setIsLoadingNotifications(true);

        try {
            const notificationList = await getNotifications();

            setNotifications(notificationList ?? []);
            setRemovingNotificationIds([]);
        } catch {
            setNotifications([]);
        } finally {
            setIsLoadingNotifications(false);
        }
    }

    async function handleClearNotifications() {
        try {
            await clearNotifications();
            setNotifications([]);
            setRemovingNotificationIds([]);
            setUnreadNotificationCount(0);
            window.dispatchEvent(new Event('howly:notifications-updated'));
        } catch {
            // Keep the current list visible if clearing fails.
        }
    }

    async function handleDeleteNotification(event, notificationId) {
        event.preventDefault();
        event.stopPropagation();

        if (removingNotificationIds.includes(notificationId)) {
            return;
        }

        setRemovingNotificationIds((currentIds) => [...currentIds, notificationId]);

        try {
            await deleteNotification(notificationId);
            window.setTimeout(() => {
                setNotifications((currentNotifications) =>
                    currentNotifications.filter((notification) => notification.id !== notificationId)
                );
                setRemovingNotificationIds((currentIds) =>
                    currentIds.filter((currentId) => currentId !== notificationId)
                );
            }, 180);
            window.dispatchEvent(new Event('howly:notifications-updated'));
        } catch {
            setRemovingNotificationIds((currentIds) =>
                currentIds.filter((currentId) => currentId !== notificationId)
            );
        }
    }

    return (
        <nav
            className={cn(
                'fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-slate-950/95 px-4 py-4 text-white backdrop-blur',
                className,
            )}
            aria-label="Primary navigation"
        >
            <div className="flex w-full items-center justify-between gap-6 px-4 md:px-8">
                <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                    <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
                        <img
                            src={howlyIcon}
                            alt=""
                            className={cn('object-contain', brandSizeClasses.image)}
                        />
                        <span className={cn('font-bold tracking-normal text-white', brandSizeClasses.text)}>
                            Howly
                        </span>
                    </Link>

                    <div className="flex items-center gap-1 lg:gap-3">
                        {navigationItems.map((item) => {
                            const Icon = item.icon ?? Dumbbell;

                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        cn(
                                    'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white lg:px-4 lg:text-base',
                                            isActive && 'bg-emerald-400/10 text-emerald-100 ring-1 ring-emerald-300/20',
                                        )
                                    }
                                >
                                    <span className="relative">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <span className="hidden truncate lg:inline">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 lg:gap-3">
                    <MoonCoin amount={coinAmount} compact className={navStatBadgeClassName} />
                    <StreakBadge days={streakAmount} showLabel={false} size="sm" className={cn(navStatBadgeClassName, 'rounded-full border border-orange-400/20 bg-orange-400/10 text-orange-300 [&>span:first-child]:text-lg')} />
                    <StreakShieldBadge count={streakShields} showLabel={false} size="sm" className={cn(navStatBadgeClassName, 'rounded-full border border-violet-400/25 bg-violet-400/10 text-violet-200 [&>svg]:h-6')} />
                    {user ? (
                        <div ref={notificationMenuRef} className="relative">
                            <button
                                type="button"
                                className="relative flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                                aria-label={
                                    displayedUnreadNotificationCount > 0
                                        ? `${displayedUnreadNotificationCount} unread notifications`
                                        : 'Notifications'
                                }
                                aria-expanded={isNotificationMenuOpen}
                                onClick={handleNotificationBellClick}
                            >
                                <Bell className="size-5" aria-hidden="true" />
                                {displayedUnreadNotificationCount > 0 ? (
                                    <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-5 text-white">
                                        {displayedUnreadNotificationCount > 99 ? '99+' : displayedUnreadNotificationCount}
                                    </span>
                                ) : null}
                            </button>

                            {isNotificationMenuOpen ? (
                                <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 text-left shadow-2xl shadow-black/40 backdrop-blur">
                                    <div className="border-b border-white/10 px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-white">Notifications</p>
                                                <p className="text-xs text-slate-400">Recent social updates</p>
                                            </div>
                                            {notifications.length ? (
                                                <button
                                                    type="button"
                                                    className="rounded-full px-2 py-1 text-xs font-semibold text-violet-100 transition hover:bg-violet-400/15"
                                                    onClick={handleClearNotifications}
                                                >
                                                    Clear all
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div ref={notificationListRef} className="max-h-80 overflow-y-auto p-2">
                                        {isLoadingNotifications ? (
                                            <p className="px-3 py-6 text-center text-sm text-slate-400">Loading...</p>
                                        ) : notifications.length ? (
                                            notifications.map((notification) => {
                                                const isRemoving = removingNotificationIds.includes(notification.id);
                                                const isUnread = !notification.readAt;

                                                return (
                                                <Link
                                                    key={notification.id}
                                                    to={getNotificationLink(notification)}
                                                    state={getNotificationNavigationState(notification)}
                                                    data-notification-id={notification.id}
                                                    data-unread={isUnread ? 'true' : 'false'}
                                                    className={cn(
                                                        'group notification-row flex gap-3 rounded-xl px-3 py-3 transition duration-200',
                                                        isUnread
                                                            ? 'bg-slate-700/30 text-slate-300 hover:bg-slate-700/45'
                                                            : 'bg-violet-500/10 text-violet-100 hover:bg-violet-500/20',
                                                        isRemoving && 'translate-x-8 opacity-0',
                                                    )}
                                                    onClick={() => setIsNotificationMenuOpen(false)}
                                                >
                                                    <span
                                                        className={cn(
                                                            'mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-sm',
                                                            isUnread ? 'bg-slate-600/50' : 'bg-violet-400/20',
                                                        )}
                                                    >
                                                        <Bell
                                                            className={cn('size-4', isUnread ? 'text-slate-300' : 'text-violet-100')}
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className={cn('block text-sm font-semibold leading-snug', isUnread ? 'text-slate-300' : 'text-white')}>
                                                            {getNotificationMessage(notification)}
                                                        </span>
                                                        <span className={cn('mt-1 block text-xs', isUnread ? 'text-slate-500' : 'text-violet-200/70')}>
                                                            {formatNotificationTime(notification.createdAt)}
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 focus:opacity-100"
                                                        aria-label="Delete notification"
                                                        onClick={(event) => handleDeleteNotification(event, notification.id)}
                                                    >
                                                        <Trash2 className="size-4" aria-hidden="true" />
                                                    </button>
                                                </Link>
                                                );
                                            })
                                        ) : (
                                            <p className="px-3 py-6 text-center text-sm text-slate-400">No notifications yet</p>
                                        )}
                                    </div>

                                    <div className="border-t border-white/10 p-2">
                                        <Link
                                            to="/social"
                                            className="block rounded-xl px-3 py-2 text-center text-sm font-semibold text-violet-100 transition hover:bg-violet-400/15"
                                            onClick={() => setIsNotificationMenuOpen(false)}
                                        >
                                            View social
                                        </Link>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    {profileItem ? (
                        <div className="relative ml-1">

                            <NavLink
                                to={profileItem.to}
                                className={({ isActive }) =>
                                    cn(
                                        'relative flex size-[3.25rem] items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white',
                                        isActive && 'bg-emerald-400/10 text-emerald-100 ring-1 ring-emerald-300/20',
                                        isPremium && !isActive && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950',
                                    )
                                }
                                aria-label="Profile"
                            >
                                {navProfilePictureUrl ? (
                                    <img
                                        src={navProfilePictureUrl}
                                        alt="Profile"
                                        className="size-full rounded-full object-cover"
                                    />
                                ) : (
                                    <UserRound className="size-7" aria-hidden="true" />
                                )}
                            </NavLink>
                        </div>
                    ) : null}
                </div>
            </div>
        </nav>
    );
}

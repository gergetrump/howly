import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BarChart3, Dumbbell, Home, PackageOpen, ShoppingBag, Trophy, UserRound, UsersRound } from 'lucide-react';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { StreakBadge } from '@/components/brand/StreakBadge.jsx';
import { StreakShieldBadge } from '@/components/brand/StreakShieldBadge.jsx';
import { getFriendRequests } from '@/services/socialApi';
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

export function NavBar({
    items = defaultItems,
    brandSize = 'lg',
    className,
}) {    
    const { user } = useAuth();
    const [pendingFriendRequestCount, setPendingFriendRequestCount] = useState(0);
    const brandSizeClasses = brandSizes[brandSize] ?? brandSizes.md;
    const profileItem = items.find((item) => item.to === '/profile');
    const navigationItems = items.filter((item) => item.to !== '/profile');
    const coinAmount = user?.coins ?? 0;
    const streakAmount = user?.streak ?? 0;
    const streakShields = user?.streakShields ?? 0;
    const navProfilePictureUrl = user?.profilePictureUrl;
    const isPremium = user?.isPremium === true || user?.role === 'admin';
    const displayedPendingFriendRequestCount = user ? pendingFriendRequestCount : 0;

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let isMounted = true;

        async function refreshPendingFriendRequests() {
            try {
                const requests = await getFriendRequests();

                if (isMounted) {
                    setPendingFriendRequestCount(requests?.incoming?.length ?? 0);
                    window.dispatchEvent(new CustomEvent('howly:social-requests-refreshed', {
                        detail: requests,
                    }));
                }
            } catch {
                if (isMounted) {
                    setPendingFriendRequestCount(0);
                }
            }
        }

        refreshPendingFriendRequests();
        const intervalId = setInterval(refreshPendingFriendRequests, 30000);
        window.addEventListener('howly:social-requests-updated', refreshPendingFriendRequests);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            window.removeEventListener('howly:social-requests-updated', refreshPendingFriendRequests);
        };
    }, [user]);

    return (
        <nav
            className={cn(
                'fixed inset-x-0 top-0 z-40 border-b border-theme-text/10 bg-theme-bg/95 px-4 py-4 text-theme-text backdrop-blur',
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
                        <span className={cn('font-bold tracking-normal text-theme-text', brandSizeClasses.text)}>
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
                                    'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-theme-text-muted transition hover:bg-theme-text/10 hover:text-theme-text lg:px-4 lg:text-base',
                                            isActive && 'bg-theme-love/15 text-theme-love ring-1 ring-theme-love/20',
                                        )
                                    }
                                >
                                    <span className="relative">
                                        <Icon className="size-5" aria-hidden="true" />
                                        {item.to === '/social' && displayedPendingFriendRequestCount > 0 ? (
                                            <span className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                                                {displayedPendingFriendRequestCount}
                                            </span>
                                        ) : null}
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
                    {profileItem ? (
                        <div className="relative ml-1">

                            <NavLink
                                to={profileItem.to}
                                className={({ isActive }) =>
                                    cn(
                                        'relative flex size-[3.25rem] items-center justify-center rounded-full text-theme-text-muted transition hover:bg-theme-text/10 hover:text-theme-text',
                                        isActive && 'bg-theme-love/15 text-theme-love ring-1 ring-theme-love/20',
                                        isPremium && !isActive && 'ring-2 ring-theme-gold ring-offset-2 ring-offset-theme-bg',
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

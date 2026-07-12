import { Link, NavLink } from 'react-router-dom';
import { BarChart3, Dumbbell, Globe, Home, PackageOpen, ShoppingBag, Trophy, UserRound, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import { StreakBadge } from '@/components/brand/StreakBadge.jsx';
import { StreakShieldBadge } from '@/components/brand/StreakShieldBadge.jsx';
import { StreakCalendarPopover } from '@/components/habits/StreakCalendarPopover.jsx';
import { NotificationBell } from '@/components/layout/NotificationBell';
import howlyIcon from '@/assets/wolf.svg';
import { DEFAULT_PROFILE_AVATAR_SRC } from '@/lib/profileAvatar.js';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const defaultItems = [
    { label: 'Home', to: '/dashboard', icon: Home },
    { label: 'Friends', to: '/social', icon: UsersRound },
    { label: 'Challenges', to: '/challenges', icon: Trophy },
    { label: 'Shop', to: '/shop', icon: ShoppingBag },
    { label: 'Inventory', to: '/inventory', icon: PackageOpen },
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
    { label: 'Trends', to: '/trends', icon: Globe },
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
    const brandSizeClasses = brandSizes[brandSize] ?? brandSizes.md;
    const profileItem = items.find((item) => item.to === '/profile');
    const navigationItems = items.filter((item) => item.to !== '/profile');
    const coinAmount = user?.coins ?? 0;
    const streakAmount = user?.streak ?? 0;
    const streakShields = user?.streakShields ?? 0;
    const navProfilePictureUrl = typeof user?.profilePictureUrl === 'string' ? user.profilePictureUrl.trim() : '';
    const navProfileInitial = (user?.firstName || user?.username || 'Profile').trim().charAt(0).toUpperCase() || '?';
    const [hasProfilePictureLoadError, setHasProfilePictureLoadError] = useState(false);
    const [hasDefaultProfilePictureLoadError, setHasDefaultProfilePictureLoadError] = useState(false);
    const isPremium = user?.isPremium === true || user?.role === 'admin';
    const navAvatarSrc = navProfilePictureUrl && !hasProfilePictureLoadError
        ? navProfilePictureUrl
        : hasDefaultProfilePictureLoadError ? '' : DEFAULT_PROFILE_AVATAR_SRC;

    useEffect(() => {
        setHasProfilePictureLoadError(false);
        setHasDefaultProfilePictureLoadError(false);
    }, [navProfilePictureUrl]);

    return (
        <>
        <nav
            className={cn(
                'fixed inset-x-0 top-0 z-40 border-b border-theme-text/10 bg-theme-bg/95 px-4 py-4 text-theme-text backdrop-blur',
                className,
            )}
            aria-label="Primary navigation"
        >
            <div className="flex w-full items-center justify-between gap-4 md:gap-6 md:px-8">
                <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                    <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
                        <img
                            src={howlyIcon}
                            alt=""
                            className={cn('object-contain', brandSizeClasses.image)}
                        />
                        <span className={cn('hidden font-bold tracking-normal text-theme-text sm:inline', brandSizeClasses.text)}>
                            Howly
                        </span>
                    </Link>

                    <div className="hidden items-center gap-1 lg:flex 2xl:gap-1.5">
                        {navigationItems.map((item) => {
                            const Icon = item.icon ?? Dumbbell;

                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    aria-label={item.label}
                                    title={item.label}
                                    className={({ isActive }) =>
                                        cn(
                                    'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium text-theme-text-muted transition hover:bg-theme-text/10 hover:text-theme-text 2xl:px-4 2xl:text-base',
                                            isActive && 'bg-theme-accent/15 text-theme-accent-soft ring-1 ring-theme-accent/25',
                                        )
                                    }
                                >
                                    <span className="relative">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <span className="hidden truncate 2xl:inline">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 lg:gap-3">
                    <MoonCoin amount={coinAmount} compact className={navStatBadgeClassName} />
                    <StreakCalendarPopover>
                        <StreakBadge days={streakAmount} showLabel={false} size="sm" className={cn(navStatBadgeClassName, 'cursor-pointer rounded-full border border-theme-gold/20 bg-theme-gold/10 text-theme-gold transition-colors hover:bg-theme-gold/20 [&>span:first-child]:text-lg')} />
                    </StreakCalendarPopover>
                    <StreakShieldBadge count={streakShields} showLabel={false} size="sm" className={cn(navStatBadgeClassName, 'rounded-full border border-theme-accent/25 bg-theme-accent/10 text-theme-accent-soft [&>svg]:h-6')} />
                    <NotificationBell user={user} />
                    {profileItem ? (
                        <div className="relative ml-1">

                            <NavLink
                                to={profileItem.to}
                                className={({ isActive }) =>
                                    cn(
                                        'relative flex size-[3.25rem] items-center justify-center rounded-full text-theme-text-muted transition hover:bg-theme-text/10 hover:text-theme-text',
                                        isActive && 'bg-theme-accent/15 text-theme-accent-soft ring-1 ring-theme-accent/25',
                                        isPremium && 'ring-2 ring-theme-gold ring-offset-2 ring-offset-theme-bg',
                                    )
                                }
                                aria-label="Profile"
                            >
                                {navAvatarSrc ? (
                                    <img
                                        src={navAvatarSrc}
                                        alt="Profile"
                                        className="size-full rounded-full object-cover"
                                        onError={() => {
                                            if (navAvatarSrc === navProfilePictureUrl) {
                                                setHasProfilePictureLoadError(true);
                                            } else {
                                                setHasDefaultProfilePictureLoadError(true);
                                            }
                                        }}
                                    />
                                ) : (
                                    <span className="text-lg font-bold text-theme-text">{navProfileInitial}</span>
                                )}
                            </NavLink>
                        </div>
                    ) : null}
                </div>
            </div>
        </nav>

        <nav
            className="fixed inset-x-0 bottom-0 z-40 border-t border-theme-text/10 bg-theme-bg pb-[env(safe-area-inset-bottom)] text-theme-text lg:hidden"
            aria-label="Primary navigation"
        >
            <div className="flex items-stretch justify-around gap-0.5 px-1 pt-1">
                {navigationItems.map((item) => {
                    const Icon = item.icon ?? Dumbbell;

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                cn(
                                    'flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium text-theme-text-muted transition',
                                    isActive ? 'text-theme-accent-soft' : 'hover:bg-theme-text/10 hover:text-theme-text',
                                )
                            }
                        >
                            <Icon className="size-5" aria-hidden="true" />
                            <span className="max-w-full truncate">{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
        </>
    );
}

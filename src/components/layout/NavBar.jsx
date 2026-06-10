import { Link, NavLink } from 'react-router-dom';
import { Dumbbell, Home, ShoppingBag, Trophy, UserRound, UsersRound } from 'lucide-react';
import { MoonCoin } from '@/components/brand/MoonCoin.jsx';
import howlyIcon from '@/assets/howly.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/authContext';

const defaultItems = [
    { label: 'Home', to: '/dashboard', icon: Home },
    { label: 'Social', to: '/social', icon: UsersRound },
    { label: 'Shop', to: '/shop', icon: ShoppingBag },
    { label: 'Challenges', to: '/challenges', icon: Trophy },
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
    const navProfilePictureUrl = user?.profilePictureUrl;

    return (
        <nav
            className={cn(
                'fixed inset-x-0 top-0 z-40 border-b border-theme-text/10 bg-theme-bg/95 px-4 py-4 text-theme-text backdrop-blur',
                className,
            )}
            aria-label="Primary navigation"
        >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 md:px-6">
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

                    <div className="flex items-center gap-1 sm:gap-3">
                        {navigationItems.map((item) => {
                            const Icon = item.icon ?? Dumbbell;

                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        cn(
                                    'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-theme-text-muted transition hover:bg-theme-text/10 hover:text-theme-text sm:px-4 sm:text-base',
                                            isActive && 'bg-theme-love/15 text-theme-love ring-1 ring-theme-love/20',
                                        )
                                    }
                                >
                                    <Icon className="size-5" aria-hidden="true" />
                                    <span className="hidden truncate sm:inline">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <MoonCoin amount={coinAmount} compact />
                    {profileItem ? (
                        <NavLink
                            to={profileItem.to}
                            className={({ isActive }) =>
                                cn(
                                    'flex size-12 items-center justify-center rounded-full text-theme-text-muted transition hover:bg-theme-text/10 hover:text-theme-text',
                                    isActive && 'bg-theme-love/15 text-theme-love ring-1 ring-theme-love/20',
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
                                <UserRound className="size-6" aria-hidden="true" />
                            )}
                        </NavLink>
                    ) : null}
                </div>
            </div>
        </nav>
    );
}

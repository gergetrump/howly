import { Link, NavLink } from 'react-router-dom';
import { Dumbbell, Home, ShoppingBag, Trophy, UserRound, UsersRound } from 'lucide-react';
import { MoonCoin } from '@/components/brand/MoonCoin';
import howlyIcon from '@/assets/howly.png';
import { cn } from '@/lib/utils';

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

export function NavBar({ items = defaultItems, brandSize = 'lg', coins = 120, className }) {
    const brandSizeClasses = brandSizes[brandSize] ?? brandSizes.md;
    const profileItem = items.find((item) => item.to === '/profile');
    const navigationItems = items.filter((item) => item.to !== '/profile');

    return (
        <nav
            className={cn(
                'fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-slate-950/95 px-4 py-4 text-white backdrop-blur',
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
                        <span className={cn('font-bold tracking-normal text-white', brandSizeClasses.text)}>
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
                                    'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white sm:px-4 sm:text-base',
                                            isActive && 'bg-pink-500/15 text-pink-100 ring-1 ring-pink-300/20',
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
                    {typeof coins === 'number' ? <MoonCoin amount={coins} compact /> : null}
                    {profileItem ? (
                        <NavLink
                            to={profileItem.to}
                            className={({ isActive }) =>
                                cn(
                                    'flex size-12 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white',
                                    isActive && 'bg-pink-500/15 text-pink-100 ring-1 ring-pink-300/20',
                                )
                            }
                            aria-label="Profile"
                        >
                            <UserRound className="size-6" aria-hidden="true" />
                        </NavLink>
                    ) : null}
                </div>
            </div>
        </nav>
    );
}

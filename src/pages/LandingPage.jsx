import { Link } from 'react-router-dom';
import { CircleCheckBig, Image, Users, Flame } from 'lucide-react';
import howlyIcon from '@/assets/howly.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompanionAvatar } from '@/components/brand/CompanionAvatar';
import { Background } from '@/components/brand/background';
import { appCardClassName } from '@/components/cards/cardStyles';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
    {
        icon: CircleCheckBig,
        iconColor: 'text-orange-400',
        iconBg: 'bg-orange-400/15',
        title: 'Set your habits',
        description:
            'Start by creating customisable habits to build positive daily routines or break bad ones.',
    },
    {
        icon: Image,
        iconColor: 'text-indigo-400',
        iconBg: 'bg-indigo-400/15',
        title: 'Log & share',
        description:
            'Record your wins with one-click logging and share picture-based updates of your progress.',
    },
    {
        icon: Users,
        iconColor: 'text-yellow-400',
        iconBg: 'bg-yellow-400/15',
        title: 'Connect',
        description:
            'Stay accountable through friendly challenges, or toggle Ghost Mode to go solo for the day.',
    },
    {
        icon: Flame,
        iconColor: 'text-howly-primary',
        iconBg: 'bg-howly-primary/15',
        title: 'Increase your streak',
        description:
            'Earn in-game currency for consistency and customise your cosmic companion.',
    },
];

/* ------------------------------------------------------------------ */
/*  Feature Card                                                       */
/* ------------------------------------------------------------------ */

function FeatureCard({ icon: Icon, iconColor, iconBg, title, description }) {
    return (
        <Card
            className={cn(
                appCardClassName,
                'group relative border-slate-700/50 transition-all duration-300 hover:border-howly-primary/40 hover:shadow-howly-primary/10 hover:shadow-lg',
            )}
        >
            <CardContent className="flex flex-col gap-4 pt-2">
                <div
                    className={cn(
                        'flex size-12 items-center justify-center rounded-xl',
                        iconBg,
                    )}
                >
                    <Icon className={cn('size-6', iconColor)} aria-hidden="true" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="text-sm leading-relaxed text-slate-400">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                       */
/* ------------------------------------------------------------------ */

export function LandingPage() {
    return (
        <Background className="min-h-screen overflow-y-auto overflow-x-hidden">
            {/* ---- Navbar ---- */}
            <nav
                id="landing-nav"
                className="relative z-20 flex items-center justify-between px-6 py-4 md:px-12 lg:px-20"
            >
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2 text-xl font-bold text-white transition-opacity hover:opacity-80"
                >
                    <img src={howlyIcon} alt="" className="size-8 object-contain" />
                    <span className="font-heading tracking-tight">Howly</span>
                </Link>

                {/* Auth Buttons */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        className="text-slate-300 hover:text-white"
                        asChild
                    >
                        <Link to="/login">Log in</Link>
                    </Button>
                    <Button
                        className="bg-howly-primary text-white hover:opacity-90 transition-opacity"
                        asChild
                    >
                        <Link to="/register">Sign up</Link>
                    </Button>
                </div>
            </nav>

            <section
                id="hero"
                className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 pb-8 pt-6 xs:px-6 md:grid-cols-2 md:gap-12 md:px-12 md:pb-12 md:pt-10 lg:px-20 lg:pb-16 lg:pt-12"
            >
                {/* Left: Copy */}
                <div className="flex flex-col gap-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                        Habits, but with a friend who howls back
                    </p>
                    <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xs:text-5xl md:text-5xl lg:text-6xl">
                        Build the routine.{' '}
                        <span className="bg-gradient-to-r from-howly-primary to-pink-400 bg-clip-text text-transparent">
                            with your pack.
                        </span>
                    </h1>
                    <p className="max-w-md text-sm xs:text-base leading-relaxed text-slate-400 md:text-lg">
                        Howly is a gamified, social habit tracker — right in your browser. Open a
                        tab, log your day with one click, run challenges with friends, and your
                        cosmic wolf companion motivates you.
                    </p>
                    <div className="flex items-center gap-4">
                        <Button
                            className="h-12 rounded-full bg-howly-primary px-8 text-base font-semibold text-white shadow-lg shadow-howly-primary/25 transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5"
                            asChild
                        >
                            <Link to="/register">Let&apos;s get started</Link>
                        </Button>
                    </div>

                </div>

                {/* Right: Companion */}
                <div className="relative flex items-center justify-center h-full min-h-[300px]">
                    <div className="relative z-10 mt-12 md:mt-24 animate-[float_4s_ease-in-out_infinite]">
                        <CompanionAvatar size="2xl" showName={false} />
                    </div>
                </div>
            </section>

            {/* ---- How Howly Works ---- */}
            <section
                id="how-it-works"
                className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-8 md:px-12 md:pb-24 md:pt-12 lg:px-20"
            >
                {/* Heading */}
                <div className="mb-12 text-center md:mb-16">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-howly-primary">
                        How Howly works
                    </p>
                    <h2 className="text-2xl xs:text-3xl font-bold tracking-tight text-white md:text-4xl">
                        Four steps, one good habit.
                    </h2>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {FEATURES.map((feature) => (
                        <FeatureCard key={feature.title} {...feature} />
                    ))}
                </div>
            </section>
        </Background>
    );
}

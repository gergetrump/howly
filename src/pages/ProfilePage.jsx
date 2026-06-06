import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    ChevronRight,
    CircleHelp,
    Crown,
    EyeOff,
    Flame,
    Info,
    Lock,
    MessageSquare,
    Target,
} from 'lucide-react';

import { Page, PageSection, Heading } from '@/components/layout';
import { CompanionAvatar } from '@/components/brand/CompanionAvatar';
import { logoutUser } from '@/services/authService';
import { getCurrentUser } from '@/services/userService';

function SettingsRow({ icon: Icon, iconColor = 'text-slate-400', title, subtitle }) {
    return (
        <button
            type="button"
            className="flex w-full items-center justify-between border-b border-slate-700/50 bg-slate-800/80 px-5 py-4 text-left first:rounded-t-2xl last:rounded-b-2xl last:border-b-0 hover:bg-slate-700/70"
        >
            <div className="flex items-center gap-4">
                <Icon className={`size-5 ${iconColor}`} />
                <div>
                    <p className="font-semibold text-white">{title}</p>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
                    )}
                </div>
            </div>

            <ChevronRight className="size-5 text-slate-400" />
        </button>
    );
}

function GhostModeRow() {
    return (
        <div className="flex items-center justify-between rounded-2xl bg-slate-800/80 px-5 py-4">
            <div className="flex items-center gap-4">
                <EyeOff className="size-5 text-slate-400" />
                <div>
                    <p className="font-semibold text-white">Ghost Mode</p>
                    <p className="mt-1 text-sm text-slate-400">
                        Hide your metrics from friends
                    </p>
                </div>
            </div>

            <button
                type="button"
                className="flex h-7 w-12 items-center rounded-full bg-slate-600 px-1"
                aria-label="Toggle ghost mode"
            >
                <span className="size-5 rounded-full bg-white" />
            </button>
        </div>
    );
}

export function ProfilePage() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadUser() {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                setError(error.message || 'Could not load profile');
            } finally {
                setIsLoading(false);
            }
        }

        loadUser();
    }, []);

    async function handleLogout() {
        try {
            await logoutUser();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            localStorage.removeItem('howly_token');
            navigate('/login');
        }
    }

    if (isLoading) {
        return (
            <Page background="forest">
                <Heading
                    title="Profile"
                    subtitle="Manage your Howly account."
                    streakDays={0}
                />
                <p className="text-sm text-slate-300">Loading profile...</p>
            </Page>
        );
    }

    if (error) {
        return (
            <Page background="forest">
                <Heading
                    title="Profile"
                    subtitle="Manage your Howly account."
                    streakDays={0}
                />
                <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </p>
            </Page>
        );
    }

    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Howly User';    const username = user?.username || 'unknown';
    const streak = user?.streak ?? 0;
    const completed = user?.completedHabits ?? 0;

    return (
        <Page background="forest">
            <Heading
                title="Profile"
                subtitle="Manage your Howly account."
                streakDays={streak}
            />

            <section className="rounded-2xl bg-slate-800/80 px-6 py-8 text-center shadow-lg">
                <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-pink-400 text-5xl">
                    🦊
                </div>

                <h2 className="mt-5 text-2xl font-bold text-white">{fullName}</h2>
                <p className="mt-1 text-sm text-slate-400">@{username}</p>

                <div className="mt-6 flex items-center justify-center gap-10">
                    <div>
                        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-white">
                            <Flame className="size-5 text-yellow-300" />
                            <span>{streak}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">Day Streak</p>
                    </div>

                    <div>
                        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-white">
                            <Target className="size-5 text-emerald-400" />
                            <span>{completed}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">Completed</p>
                    </div>
                </div>
            </section>

            <PageSection title="Privacy">
                <GhostModeRow />
            </PageSection>

            <PageSection title="Account">
                <div className="overflow-hidden rounded-2xl">
                    <SettingsRow
                        icon={Crown}
                        iconColor="text-yellow-400"
                        title="Upgrade to Premium"
                    />
                    <SettingsRow icon={Bell} title="Notifications" />
                    <SettingsRow icon={Lock} title="Privacy & Security" />
                </div>
            </PageSection>

            <PageSection title="Support">
                <div className="overflow-hidden rounded-2xl">
                    <SettingsRow icon={MessageSquare} title="Send Feedback" />
                    <SettingsRow icon={CircleHelp} title="Help & Support" />
                    <SettingsRow icon={Info} title="About Howly" />
                </div>
            </PageSection>

            <PageSection title="Session">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-2xl bg-red-500/90 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                >
                    Log out
                </button>
            </PageSection>
        </Page>
    );
}
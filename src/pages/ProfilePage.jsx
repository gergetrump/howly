import { useState } from 'react';
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
    Ban,
} from 'lucide-react';

import { Page, PageSection, Heading } from '@/components/layout';
import { StoryArchive } from '@/components/stories/StoryArchive.jsx';
import { Button } from '@/components/ui/button';
// import { ThemeToggle } from '@/components/brand/ThemeToggle.jsx';
import { logoutUser } from '@/services/authService';
import {
    uploadCurrentUserProfilePicture,
    deleteCurrentUserProfilePicture,
} from '@/services/userService';
import { BlockedUsersDialog } from '@/components/social/BlockedUsersDialog.jsx';
import { useAuth } from '@/context/authContext';
import { createManagePremiumSession } from '@/services/paymentService';


function SettingsRow({ icon: Icon, iconColor = 'text-slate-400', title, subtitle, onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex w-full items-center justify-between border-b border-slate-700/50 bg-slate-800/80 px-5 py-4 text-left first:rounded-t-2xl last:rounded-b-2xl last:border-b-0 hover:bg-slate-700/70 disabled:opacity-50"
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

    const { user, setUser, isLoadingUser } = useAuth();
    // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState('');
    const [premiumError, setPremiumError] = useState('');
    const [isManagingPremium, setIsManagingPremium] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const [isDeletingPicture, setIsDeletingPicture] = useState(false);
    const [pictureError, setPictureError] = useState('');
    const [isBlockedUsersDialogOpen, setIsBlockedUsersDialogOpen] = useState(false);

    function handleUpgradeToPremium() {
        navigate('/premium', {
            state: {
                message: 'Upgrade to Premium to unlock more habits, challenges, monthly coins, streak shields, and premium shop items.',
                returnTo: '/profile',
            },
        });
    }

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


    async function handleProfilePictureChange(event) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        try {
            setPictureError('');
            setIsUploadingPicture(true);

            const updatedUser = await uploadCurrentUserProfilePicture(file);
            setUser(updatedUser);
        } catch (error) {
            setPictureError(error.message || 'Could not upload profile picture');
        } finally {
            setIsUploadingPicture(false);
            event.target.value = '';
        }
    }

    async function handleDeleteProfilePicture() {
        try {
            setPictureError('');
            setIsDeletingPicture(true);

            const updatedUser = await deleteCurrentUserProfilePicture();
            setUser(updatedUser);
        } catch (error) {
            setPictureError(error.message || 'Could not delete profile picture');
        } finally {
            setIsDeletingPicture(false);
        }
    }

    async function handleManagePremium() {
        try {
            setPremiumError('');
            setIsManagingPremium(true);
            const response = await createManagePremiumSession();

            if (!response?.url) {
                throw new Error('Manage premium session did not include a URL');
            }

            window.location.href = response.url;
        } catch (error) {
            console.error('Could not start manage-premium session:', error);
            setPremiumError(
                error.message === 'Request failed'
                    ? 'Premium management is unavailable right now.'
                    : error.message || 'Could not manage premium'
            );
        } finally {
            setIsManagingPremium(false);
        }
    }

    if (isLoadingUser) {
        return (
            <Page theme="forest">
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
            <Page theme="forest">
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

    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Howly User'; const username = user?.username || 'unknown';
    const streak = user?.streak ?? 0;
    const completed = user?.completedHabits ?? 0;
    const isPremium = user?.isPremium === true || user?.role === 'admin';

    return (
        <Page theme="forest">
            <Heading
                title="Profile"
                subtitle="Manage your Howly account."
                streakDays={streak}
            />

            <section className="rounded-2xl bg-slate-800/80 px-6 py-8 text-center shadow-lg">
                <div className="mx-auto flex flex-col items-center gap-3">
                    <div className="relative">

                        <div className={`flex size-24 items-center justify-center overflow-hidden rounded-full bg-slate-700 ${isPremium ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-800' : ''}`}>
                            {user?.profilePictureUrl ? (
                                <img
                                    src={user.profilePictureUrl}
                                    alt={`${fullName}'s profile`}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <span className="text-5xl">🦊</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <Button
                            asChild
                            disabled={isUploadingPicture}
                            className="h-9 rounded-xl bg-white px-4 text-slate-950 hover:bg-slate-200"
                        >
                            <label className="cursor-pointer">
                                {isUploadingPicture ? 'Uploading...' : 'Change picture'}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg"
                                    onChange={handleProfilePictureChange}
                                    disabled={isUploadingPicture}
                                    className="hidden"
                                />
                            </label>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDeleteProfilePicture}
                            disabled={isUploadingPicture || isDeletingPicture}
                            className="h-9 rounded-xl border-white/20 bg-white/10 px-4 text-white hover:bg-white/20"
                        >
                            {isDeletingPicture ? 'Removing...' : 'Remove'}
                        </Button>
                    </div>

                    {pictureError && (
                        <p className="text-sm text-red-300">{pictureError}</p>
                    )}
                </div>

                <h2 className="mt-5 text-2xl font-bold text-white">{fullName}</h2>
                <p className="mt-1 text-sm text-slate-400">@{username}</p>

                {isPremium && (
                    <div className="mt-2 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-yellow-500/20 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
                            <Crown className="h-3 w-3" aria-hidden="true" />
                            Premium
                        </span>
                    </div>
                )}

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

            <PageSection title="My Stories">
                <StoryArchive />
            </PageSection>

            <PageSection title="Privacy">
                <div className="space-y-3">
                    <GhostModeRow />
                    <div className="overflow-hidden rounded-2xl">
                        <SettingsRow
                            icon={Ban}
                            iconColor="text-red-400"
                            title="Blocked Users"
                            subtitle="Manage accounts you have blocked"
                            onClick={() => setIsBlockedUsersDialogOpen(true)}
                        />
                    </div>
                </div>
            </PageSection>

            <PageSection title="Account">
                <div className="overflow-hidden rounded-2xl">
                    {isPremium ? (
                        <SettingsRow
                            icon={Crown}
                            iconColor="text-yellow-400"
                            title={isManagingPremium ? 'Opening portal...' : 'Manage your Premium Subscription'}
                            onClick={handleManagePremium}
                            disabled={isManagingPremium}
                        />
                    ) : (
                        <SettingsRow
                            icon={Crown}
                            iconColor="text-yellow-400"
                            title="Upgrade to Premium"
                            onClick={handleUpgradeToPremium}
                        />
                    )}
                    <SettingsRow icon={Bell} title="Notifications" />
                    <SettingsRow icon={Lock} title="Privacy & Security" />
                </div>
                {premiumError && (
                    <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {premiumError}
                    </p>
                )}
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

            <BlockedUsersDialog
                open={isBlockedUsersDialogOpen}
                onOpenChange={setIsBlockedUsersDialogOpen}
            />
        </Page>
    );
}

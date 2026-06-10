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
} from 'lucide-react';

import { Page, PageSection, Heading } from '@/components/layout';
import { ThemePicker } from '@/components/common/ThemePicker.jsx';
import { logoutUser } from '@/services/authService';
import {
    uploadCurrentUserProfilePicture,
    deleteCurrentUserProfilePicture,
} from '@/services/userService';
import { useAuth } from '@/context/authContext';
import { createCheckoutSession } from '@/services/paymentService';


function SettingsRow({
    icon: Icon,
    iconColor = 'text-theme-text-muted',
    title,
    subtitle,
    onClick,
    disabled = false,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex w-full items-center justify-between border-b border-theme-text/10 bg-theme-surface/80 px-5 py-4 text-left first:rounded-t-2xl last:rounded-b-2xl last:border-b-0 hover:bg-theme-surface-2/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <div className="flex items-center gap-4">
                <Icon className={`size-5 ${iconColor}`} />
                <div>
                    <p className="font-semibold text-theme-text">{title}</p>
                    {subtitle && (
                        <p className="mt-1 text-sm text-theme-text-muted">{subtitle}</p>
                    )}
                </div>
            </div>

            <ChevronRight className="size-5 text-theme-text-muted" />
        </button>
    );
}

function GhostModeRow() {
    return (
        <div className="flex items-center justify-between rounded-2xl bg-theme-surface/80 px-5 py-4">
            <div className="flex items-center gap-4">
                <EyeOff className="size-5 text-theme-text-muted" />
                <div>
                    <p className="font-semibold text-theme-text">Ghost Mode</p>
                    <p className="mt-1 text-sm text-theme-text-muted">
                        Hide your metrics from friends
                    </p>
                </div>
            </div>

            <button
                type="button"
                className="flex h-7 w-12 items-center rounded-full bg-theme-surface-2 px-1"
                aria-label="Toggle ghost mode"
            >
                <span className="size-5 rounded-full bg-theme-invert" />
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
    const [isStartingCheckout, setIsStartingCheckout] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const [isDeletingPicture, setIsDeletingPicture] = useState(false);
    const [pictureError, setPictureError] = useState('');

    async function handleUpgradeToPremium() {
        try {
            setPremiumError('');
            setIsStartingCheckout(true);

            const response = await createCheckoutSession();

            if (!response?.url) {
                throw new Error('Checkout session did not include a URL');
            }

            window.location.href = response.url;
        } catch (error) {
            console.error('Could not start checkout:', error);
            setPremiumError(
                error.message === 'Request failed'
                    ? 'Premium checkout is unavailable right now.'
                    : error.message || 'Could not start checkout'
            );
        } finally {
            setIsStartingCheckout(false);
        }
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

    if (isLoadingUser) {
        return (
            <Page theme="forest">
                <Heading
                    title="Profile"
                    subtitle="Manage your Howly account."
                    streakDays={0}
                />
                <p className="text-sm text-theme-text-soft">Loading profile...</p>
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
                <p className="rounded-xl bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
                    {error}
                </p>
            </Page>
        );
    }

    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Howly User'; const username = user?.username || 'unknown';
    const streak = user?.streak ?? 0;
    const completed = user?.completedHabits ?? 0;

    return (
        <Page theme="forest">
            <Heading
                title="Profile"
                subtitle="Manage your Howly account."
                streakDays={streak}
            />

            <section className="rounded-2xl bg-theme-surface/80 px-6 py-8 text-center shadow-lg">
                <div className="mx-auto flex flex-col items-center gap-3">
                    <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-theme-surface-2">
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

                    <div className="flex items-center justify-center gap-3">
                        <label className="cursor-pointer rounded-xl bg-theme-success px-4 py-2 text-sm font-semibold text-theme-on-success hover:bg-theme-success/85">
                            {isUploadingPicture ? 'Uploading...' : 'Change picture'}
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={handleProfilePictureChange}
                                disabled={isUploadingPicture}
                                className="hidden"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={handleDeleteProfilePicture}
                            disabled={isUploadingPicture || isDeletingPicture}
                            className="rounded-xl bg-theme-surface-2 px-4 py-2 text-sm font-semibold text-theme-text hover:bg-theme-surface-2 disabled:opacity-50"
                        >
                            {isDeletingPicture ? 'Removing...' : 'Remove'}
                        </button>
                    </div>

                    {pictureError && (
                        <p className="text-sm text-theme-danger">{pictureError}</p>
                    )}
                </div>

                <h2 className="mt-5 text-2xl font-bold text-theme-text">{fullName}</h2>
                <p className="mt-1 text-sm text-theme-text-muted">@{username}</p>

                <div className="mt-6 flex items-center justify-center gap-10">
                    <div>
                        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-theme-text">
                            <Flame className="size-5 text-theme-gold" />
                            <span>{streak}</span>
                        </div>
                        <p className="mt-1 text-sm text-theme-text-muted">Day Streak</p>
                    </div>

                    <div>
                        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-theme-text">
                            <Target className="size-5 text-theme-success" />
                            <span>{completed}</span>
                        </div>
                        <p className="mt-1 text-sm text-theme-text-muted">Completed</p>
                    </div>
                </div>
            </section>

            <PageSection title="Appearance">
                <ThemePicker />
            </PageSection>

            <PageSection title="Privacy">
                <GhostModeRow />
            </PageSection>

            <PageSection title="Account">
                <div className="overflow-hidden rounded-2xl">
                    <SettingsRow
                        icon={Crown}
                        iconColor="text-theme-gold"
                        title={isStartingCheckout ? 'Starting checkout...' : 'Upgrade to Premium'}
                        onClick={handleUpgradeToPremium}
                        disabled={isStartingCheckout}
                    />
                    <SettingsRow icon={Bell} title="Notifications" />
                    <SettingsRow icon={Lock} title="Privacy & Security" />
                </div>
                {premiumError && (
                    <p className="mt-3 rounded-xl bg-theme-danger/10 px-4 py-3 text-sm text-theme-danger">
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
                    className="w-full rounded-2xl bg-theme-danger/90 px-5 py-4 text-sm font-semibold text-white transition-colors hover:bg-theme-danger"
                >
                    Log out
                </button>
            </PageSection>
        </Page>
    );
}
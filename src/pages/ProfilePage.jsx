import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    ChevronRight,
    Crown,
    EyeOff,
    Flame,
    Info,
    MessageSquare,
    Target,
    Ban,
} from 'lucide-react';

import { Page, PageSection, Heading } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
// import { ThemeToggle } from '@/components/brand/ThemeToggle.jsx';
import { logoutUser } from '@/services/authService';
import {
    uploadCurrentUserProfilePicture,
    deleteCurrentUserProfilePicture,
    updateNotificationPreferences,
    updateCurrentUser,
} from '@/services/userService';
import { BlockedUsersDialog } from '@/components/social/BlockedUsersDialog.jsx';
import { NotificationMuteDialog } from '@/components/social/NotificationMuteDialog.jsx';
import { useAuth } from '@/context/authContext';
import { createManagePremiumSession } from '@/services/paymentService';
import { sendFeedback } from '@/services/feedbackService';


const DEFAULT_NOTIFICATION_PREFERENCES = {
    emailEnabled: false,
    challengeInvitations: false,
    friendRequests: false,
    streakReminders: false,
};

function getNotificationPreferences(user) {
    return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(user?.notificationPreferences ?? {}),
    };
}

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


function ToggleControl({ checked, onChange, disabled, label }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            disabled={disabled}
            aria-label={label}
            aria-pressed={checked}
            className={`flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-emerald-400' : 'bg-slate-600'}`}
        >
            <span className={`size-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );
}

function NotificationPreferenceRow({ title, description, checked, onChange, disabled, variant = 'default' }) {
    const isPrimary = variant === 'primary';

    return (
        <div className={`flex min-h-24 items-center justify-between gap-4 rounded-2xl px-5 py-4 ${isPrimary ? 'border border-emerald-300/25 bg-emerald-400/10' : 'bg-slate-800/80'}`}>
            <div className="min-w-0">
                <p className={`font-semibold ${isPrimary ? 'text-emerald-100' : 'text-white'}`}>{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{description}</p>
            </div>
            <ToggleControl checked={checked} onChange={onChange} disabled={disabled} label={title} />
        </div>
    );
}

function NotificationPreferencesDialog({ open, onOpenChange, preferences, onToggle, isSaving, error }) {
    const emailEnabled = preferences.emailEnabled;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border border-white/10 bg-slate-950 p-6 text-white sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">Notifications</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Choose which email updates Howly may send you.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <section className="space-y-2">
                        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                            General email notifications
                        </p>
                        <NotificationPreferenceRow
                            title="All optional emails"
                            description="Turn this off to disable every optional Howly email below at once. Account emails still work."
                            checked={preferences.emailEnabled}
                            onChange={(value) => onToggle('emailEnabled', value)}
                            disabled={isSaving}
                            variant="primary"
                        />
                    </section>

                    <section className="space-y-3">
                        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Email types
                        </p>
                        <NotificationPreferenceRow
                            title="Challenge invitations"
                            description="Get an email when a friend invites you to a challenge."
                            checked={emailEnabled && preferences.challengeInvitations}
                            onChange={(value) => onToggle('challengeInvitations', value)}
                            disabled={isSaving || !emailEnabled}
                        />
                        <NotificationPreferenceRow
                            title="Friend requests"
                            description="Get an email when someone sends you a friend request."
                            checked={emailEnabled && preferences.friendRequests}
                            onChange={(value) => onToggle('friendRequests', value)}
                            disabled={isSaving || !emailEnabled}
                        />
                        <NotificationPreferenceRow
                            title="Streak reminders"
                            description="Get an email around 2 hours before your streak repair window expires."
                            checked={emailEnabled && preferences.streakReminders}
                            onChange={(value) => onToggle('streakReminders', value)}
                            disabled={isSaving || !emailEnabled}
                        />
                    </section>
                </div>

                {error ? (
                    <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function FeedbackDialog({ open, onOpenChange, form, onFormChange, onSubmit, isSubmitting, error, success }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border border-white/10 bg-slate-950 p-6 text-white sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">Help & Feedback</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Send a problem report or suggestion to the Howly team.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1">
                        {[
                            { value: 'problem', label: 'Problem' },
                            { value: 'suggestion', label: 'Suggestion' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onFormChange({ ...form, type: option.value })}
                                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${form.type === option.value ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <label className="block space-y-2">
                        <span className="text-sm font-semibold text-white">Subject</span>
                        <input
                            type="text"
                            value={form.subject}
                            onChange={(event) => onFormChange({ ...form, subject: event.target.value })}
                            maxLength={120}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-howly-primary"
                            placeholder="Briefly summarize the topic."
                        />
                    </label>

                    <label className="block space-y-2">
                        <span className="text-sm font-semibold text-white">Message</span>
                        <textarea
                            value={form.message}
                            onChange={(event) => onFormChange({ ...form, message: event.target.value })}
                            rows={6}
                            maxLength={2000}
                            className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-howly-primary"
                            placeholder="Tell us what happened or what would make Howly better."
                        />
                    </label>

                    {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
                    {success ? <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}

                    <Button
                        type="submit"
                        disabled={isSubmitting || form.subject.trim().length < 3 || form.message.trim().length < 10}
                        className="w-full rounded-xl bg-white text-slate-950 hover:bg-slate-200"
                    >
                        {isSubmitting ? 'Sending...' : 'Send feedback'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
function GhostModeRow() {
    const { user, setUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const isGhost = user?.ghostMode === true;

    async function handleToggle() {
        if (isSaving) {
            return;
        }

        setIsSaving(true);

        try {
            const updated = await updateCurrentUser({ ghostMode: !isGhost });
            setUser((current) => (current ? { ...current, ghostMode: updated?.ghostMode ?? !isGhost } : current));
        } catch (error) {
            console.error('Failed to toggle ghost mode:', error);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex items-center justify-between rounded-2xl bg-slate-800/80 px-5 py-4">
            <div className="flex items-center gap-4">
                <EyeOff className="size-5 text-slate-400" />
                <div>
                    <p className="font-semibold text-white">Ghost Mode</p>
                    <p className="mt-1 text-sm text-slate-400">
                        Hide your streak from friends
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={handleToggle}
                disabled={isSaving}
                role="switch"
                aria-checked={isGhost}
                aria-label="Toggle ghost mode"
                className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${isGhost ? 'justify-end bg-howly-primary' : 'justify-start bg-slate-600'}`}
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
    const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);
    const [isSavingNotificationPreferences, setIsSavingNotificationPreferences] = useState(false);
    const [notificationError, setNotificationError] = useState('');
    const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
    const [feedbackForm, setFeedbackForm] = useState({ type: 'problem', subject: '', message: '' });
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');
    const [feedbackSuccess, setFeedbackSuccess] = useState('');
    const [isMuteDialogOpen, setIsMuteDialogOpen] = useState(false);

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

    async function handleNotificationPreferenceToggle(key, value) {
        const currentPreferences = getNotificationPreferences(user);
        const nextPreferences = {
            ...currentPreferences,
            [key]: value,
        };

        try {
            setNotificationError('');
            setIsSavingNotificationPreferences(true);
            const updatedUser = await updateNotificationPreferences(nextPreferences);
            setUser(updatedUser);
        } catch (error) {
            setNotificationError(error.message || 'Could not update notification settings.');
        } finally {
            setIsSavingNotificationPreferences(false);
        }
    }

    async function handleSendFeedback(event) {
        event.preventDefault();

        try {
            setFeedbackError('');
            setFeedbackSuccess('');
            setIsSendingFeedback(true);
            await sendFeedback(feedbackForm);
            setFeedbackSuccess('Thanks, your feedback was sent.');
            setFeedbackForm({ type: 'problem', subject: '', message: '' });
        } catch (error) {
            setFeedbackError(error.message || 'Could not send feedback right now.');
        } finally {
            setIsSendingFeedback(false);
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
    const notificationPreferences = getNotificationPreferences(user);

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
                <button
                    type="button"
                    onClick={() => navigate('/stories')}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl bg-slate-800/80 px-5 py-4 text-left transition-colors hover:bg-slate-800"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-howly-primary/15 text-xl">
                            <span aria-hidden="true">📸</span>
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-white">Story Archive</p>
                            <p className="truncate text-sm text-slate-400">Your shared moments from the last 90 days</p>
                        </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
                </button>
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
                    <SettingsRow
                        icon={Bell}
                        title="Notifications"
                        subtitle="Mute likes, tags, comments, friend requests, or reactions"
                        onClick={() => setIsMuteDialogOpen(true)}
                    />
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
                    <SettingsRow icon={MessageSquare} title="Help & Feedback" subtitle="Report a problem or share an idea" onClick={() => setIsFeedbackDialogOpen(true)} />
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
            <NotificationPreferencesDialog
                open={isNotificationsDialogOpen}
                onOpenChange={setIsNotificationsDialogOpen}
                preferences={notificationPreferences}
                onToggle={handleNotificationPreferenceToggle}
                isSaving={isSavingNotificationPreferences}
                error={notificationError}
            />
            <FeedbackDialog
                open={isFeedbackDialogOpen}
                onOpenChange={setIsFeedbackDialogOpen}
                form={feedbackForm}
                onFormChange={setFeedbackForm}
                onSubmit={handleSendFeedback}
                isSubmitting={isSendingFeedback}
                error={feedbackError}
                success={feedbackSuccess}
            />

            <NotificationMuteDialog
                open={isMuteDialogOpen}
                onOpenChange={setIsMuteDialogOpen}
            />
        </Page>
    );
}






import { useState } from 'react';
import { BellOff } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appTabsListFullWidthClassName, appTabsTriggerClassName } from '@/components/cards/cardStyles';
import { useAuth } from '@/context/AuthContext';
import { updateCurrentUser } from '@/services/userService';

const DEFAULT_NOTIFICATION_PREFERENCES = {
    emailEnabled: false,
    challengeInvitations: false,
    friendRequests: false,
    streakReminders: false,
    muteAll: false,
    muteTag: false,
    muteFriendRequest: false,
    muteComment: false,
    muteLike: false,
    muteReaction: false,
    muteChallengeInvitation: false,
};

const MUTE_OPTIONS = [
    {
        key: 'muteAll',
        label: 'All in-app notifications',
        description: 'Receive all in-app notification types',
        featured: true,
    },
    {
        key: 'muteFriendRequest',
        label: 'Friend Requests',
        description: 'Sent and accepted friend requests',
    },
    {
        key: 'muteChallengeInvitation',
        label: 'Challenge Invites',
        description: 'Invitations to join challenges',
    },
    {
        key: 'muteTag',
        label: 'Tags & Mentions',
        description: 'Notifications when users tag you in stories',
    },
    {
        key: 'muteComment',
        label: 'Comments',
        description: 'Replies and comments on your stories',
    },
    {
        key: 'muteLike',
        label: 'Likes',
        description: 'When users like your stories',
    },
    {
        key: 'muteReaction',
        label: 'Reactions',
        description: 'Reactions to your milestones',
    },
];

const EMAIL_NOTIFICATION_OPTIONS = [
    {
        key: 'emailEnabled',
        label: 'All optional emails',
        description: 'Turn this off to disable every optional Howly email below at once',
        featured: true,
    },
    {
        key: 'challengeInvitations',
        label: 'Challenge invitations',
        description: 'Email when a friend invites you to a challenge',
    },
    {
        key: 'friendRequests',
        label: 'Friend requests',
        description: 'Email when someone sends you a friend request',
    },
    {
        key: 'streakReminders',
        label: 'Streak reminders',
        description: 'Email around 2 hours before your streak repair window expires',
    },
];

const IN_APP_NOTIFICATION_KEYS = MUTE_OPTIONS
    .filter((option) => !option.featured)
    .map((option) => option.key);

const EMAIL_NOTIFICATION_KEYS = EMAIL_NOTIFICATION_OPTIONS
    .filter((option) => !option.featured)
    .map((option) => option.key);

function NotificationToggleRow({ option, checked, disabled, onToggle }) {
    return (
        <div className={`flex min-h-[4.5rem] items-center justify-between gap-4 p-3 ${option.featured ? 'rounded-2xl border border-theme-text/10' : 'rounded-xl'} bg-theme-text/5`}>
            <div className="min-w-0">
                <p className="font-semibold text-sm text-theme-text">{option.label}</p>
                <p className="text-xs text-theme-text-muted">{option.description}</p>
            </div>
            <button
                type="button"
                onClick={onToggle}
                disabled={disabled}
                role="switch"
                aria-checked={checked}
                className={`flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
                    checked ? 'justify-end bg-theme-accent' : 'justify-start bg-theme-surface-2'
                }`}
            >
                <span className="size-5 rounded-full bg-white shadow-sm" />
            </button>
        </div>
    );
}

export function NotificationMuteDialog({ open, onOpenChange }) {
    const { user, setUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const prefs = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(user?.notificationPreferences ?? {}),
    };

    const allInAppEnabled = !prefs.muteAll
        && IN_APP_NOTIFICATION_KEYS.every((key) => !prefs[key]);
    const allEmailEnabled = prefs.emailEnabled
        && EMAIL_NOTIFICATION_KEYS.every((key) => prefs[key]);

    async function savePreferences(changes) {
        if (isSaving) return;
        setIsSaving(true);
        setError('');

        const nextPrefs = { ...prefs, ...changes };

        try {
            const updated = await updateCurrentUser({ notificationPreferences: changes });
            setUser((current) => (current ? { ...current, notificationPreferences: updated?.notificationPreferences ?? nextPrefs } : current));
        } catch (err) {
            setError(err.message || 'Failed to update preferences');
        } finally {
            setIsSaving(false);
        }
    }

    function handleToggle(key) {
        void savePreferences({ [key]: !prefs[key] });
    }

    function handleToggleAllInApp() {
        const enableAll = !allInAppEnabled;
        const changes = { muteAll: !enableAll };

        if (enableAll) {
            IN_APP_NOTIFICATION_KEYS.forEach((key) => {
                changes[key] = false;
            });
        }

        void savePreferences(changes);
    }

    function handleToggleAllEmail() {
        const enableAll = !allEmailEnabled;
        const changes = { emailEnabled: enableAll };

        if (enableAll) {
            EMAIL_NOTIFICATION_KEYS.forEach((key) => {
                changes[key] = true;
            });
        }

        void savePreferences(changes);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-theme-text/10 bg-theme-surface text-theme-text shadow-2xl sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <BellOff className="size-5 text-theme-accent" />
                        Notification Settings
                    </DialogTitle>
                    <DialogDescription className="text-theme-text-muted text-sm">
                        Choose which in-app notifications and optional emails you want to receive.
                    </DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-theme-danger mt-2">{error}</p>}

                <Tabs defaultValue="inapp" className="mt-4 gap-4">
                    <TabsList className={`h-10 p-1 ${appTabsListFullWidthClassName}`}>
                        <TabsTrigger
                            value="inapp"
                            className={appTabsTriggerClassName}
                        >
                            In-app
                        </TabsTrigger>
                        <TabsTrigger
                            value="email"
                            className={appTabsTriggerClassName}
                        >
                            Email
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inapp" className="min-h-[33rem] space-y-4">
                        {MUTE_OPTIONS.filter((option) => option.featured).map((option) => (
                            <NotificationToggleRow
                                key={option.key}
                                option={option}
                                checked={allInAppEnabled}
                                disabled={isSaving}
                                onToggle={handleToggleAllInApp}
                            />
                        ))}

                        <div className={`space-y-3 transition-all duration-300 ${prefs.muteAll ? 'opacity-40 pointer-events-none' : ''}`}>
                            {MUTE_OPTIONS.filter((option) => !option.featured).map((option) => (
                                <NotificationToggleRow
                                    key={option.key}
                                    option={option}
                                    checked={!prefs.muteAll && !prefs[option.key]}
                                    disabled={isSaving || prefs.muteAll}
                                    onToggle={() => handleToggle(option.key)}
                                />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="email" className="min-h-[33rem] space-y-3">
                        {EMAIL_NOTIFICATION_OPTIONS.filter((option) => option.featured).map((option) => (
                            <NotificationToggleRow
                                key={option.key}
                                option={option}
                                checked={allEmailEnabled}
                                disabled={isSaving}
                                onToggle={handleToggleAllEmail}
                            />
                        ))}

                        <div className={`space-y-3 transition-all duration-300 ${prefs.emailEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
                            {EMAIL_NOTIFICATION_OPTIONS.filter((option) => !option.featured).map((option) => (
                                <NotificationToggleRow
                                    key={option.key}
                                    option={option}
                                    checked={prefs.emailEnabled && prefs[option.key]}
                                    disabled={isSaving || !prefs.emailEnabled}
                                    onToggle={() => handleToggle(option.key)}
                                />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

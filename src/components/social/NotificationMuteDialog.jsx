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
import { useAuth } from '@/context/authContext';
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

function NotificationToggleRow({ option, checked, disabled, onToggle }) {
    return (
        <div className={`flex min-h-[4.5rem] items-center justify-between gap-4 p-3 ${option.featured ? 'rounded-2xl border border-white/5' : 'rounded-xl'} bg-white/5`}>
            <div className="min-w-0">
                <p className="font-semibold text-sm text-white">{option.label}</p>
                <p className="text-xs text-slate-400">{option.description}</p>
            </div>
            <button
                type="button"
                onClick={onToggle}
                disabled={disabled}
                role="switch"
                aria-checked={checked}
                className={`flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
                    checked ? 'justify-end bg-violet-500' : 'justify-start bg-slate-600'
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

    async function handleToggle(key) {
        if (isSaving) return;
        setIsSaving(true);
        setError('');

        const nextPrefs = { ...prefs, [key]: !prefs[key] };

        try {
            const updated = await updateCurrentUser({ notificationPreferences: { [key]: nextPrefs[key] } });
            setUser((current) => (current ? { ...current, notificationPreferences: updated?.notificationPreferences ?? nextPrefs } : current));
        } catch (err) {
            setError(err.message || 'Failed to update preferences');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-white/10 bg-[#24213d] text-white shadow-2xl sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <BellOff className="size-5 text-violet-400" />
                        Notification Settings
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        Choose which in-app notifications and optional emails you want to receive.
                    </DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

                <Tabs defaultValue="inapp" className="mt-4 gap-4">
                    <TabsList className="h-10 w-full border border-white/10 bg-white/10 p-1 text-white">
                        <TabsTrigger
                            value="inapp"
                            className="text-white/70 data-active:!bg-white/20 data-active:!text-white"
                        >
                            In-app
                        </TabsTrigger>
                        <TabsTrigger
                            value="email"
                            className="text-white/70 data-active:!bg-white/20 data-active:!text-white"
                        >
                            Email
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inapp" className="min-h-[33rem] space-y-4">
                        {MUTE_OPTIONS.filter((option) => option.featured).map((option) => (
                            <NotificationToggleRow
                                key={option.key}
                                option={option}
                                checked={!prefs[option.key]}
                                disabled={isSaving}
                                onToggle={() => handleToggle(option.key)}
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
                                checked={prefs[option.key]}
                                disabled={isSaving}
                                onToggle={() => handleToggle(option.key)}
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

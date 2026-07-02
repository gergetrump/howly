import { useState } from 'react';
import { BellOff } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/authContext';
import { updateCurrentUser } from '@/services/userService';

const DEFAULT_NOTIFICATION_PREFERENCES = {
    muteAll: false,
    muteTag: false,
    muteFriendRequest: false,
    muteComment: false,
    muteLike: false,
    muteReaction: false,
};

const MUTE_OPTIONS = [
    {
        key: 'muteAll',
        label: 'Mute All',
        description: 'Silence all notification types',
        featured: true,
    },
    {
        key: 'muteTag',
        label: 'Tags & Mentions',
        description: 'Notifications when users tag you in stories',
    },
    {
        key: 'muteFriendRequest',
        label: 'Friend Requests',
        description: 'Sent and accepted friend requests',
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

function NotificationToggleRow({ option, checked, disabled, onToggle }) {
    return (
        <div className={`flex items-center justify-between p-3 ${option.featured ? 'rounded-2xl border border-white/5' : 'rounded-xl'} bg-white/5`}>
            <div>
                <p className="font-semibold text-sm text-white">{option.label}</p>
                <p className="text-xs text-slate-400">{option.description}</p>
            </div>
            <button
                type="button"
                onClick={onToggle}
                disabled={disabled}
                role="switch"
                aria-checked={checked}
                className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
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
            <DialogContent className="border-white/10 bg-[#24213d] text-white shadow-2xl sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <BellOff className="size-5 text-violet-400" />
                        Mute Notifications
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        Select which types of notifications you want to temporarily mute.
                    </DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

                <div className="mt-4 space-y-4">
                    {MUTE_OPTIONS.filter((option) => option.featured).map((option) => (
                        <NotificationToggleRow
                            key={option.key}
                            option={option}
                            checked={prefs[option.key]}
                            disabled={isSaving}
                            onToggle={() => handleToggle(option.key)}
                        />
                    ))}

                    <div className={`space-y-3 transition-all duration-300 ${prefs.muteAll ? 'opacity-40 pointer-events-none' : ''}`}>
                        {MUTE_OPTIONS.filter((option) => !option.featured).map((option) => (
                            <NotificationToggleRow
                                key={option.key}
                                option={option}
                                checked={prefs[option.key]}
                                disabled={isSaving || prefs.muteAll}
                                onToggle={() => handleToggle(option.key)}
                            />
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

import { useState } from 'react';
import { BellOff, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/authContext';
import { updateCurrentUser } from '@/services/userService';

export function NotificationMuteDialog({ open, onOpenChange }) {
    const { user, setUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const prefs = user?.notificationPreferences ?? {
        muteAll: false,
        muteTag: false,
        muteFriendRequest: false,
        muteComment: false,
        muteLike: false,
        muteReaction: false,
    };

    async function handleToggle(key) {
        if (isSaving) return;
        setIsSaving(true);
        setError('');

        const nextPrefs = {
            ...prefs,
            [key]: !prefs[key],
        };

        try {
            const updated = await updateCurrentUser({ notificationPreferences: nextPrefs });
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
                    {/* Mute All Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div>
                            <p className="font-semibold text-sm text-white">Mute All</p>
                            <p className="text-xs text-slate-400">Silence all notification types</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggle('muteAll')}
                            disabled={isSaving}
                            role="switch"
                            aria-checked={prefs.muteAll}
                            className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
                                prefs.muteAll ? 'justify-end bg-violet-500' : 'justify-start bg-slate-600'
                            }`}
                        >
                            <span className="size-5 rounded-full bg-white shadow-sm" />
                        </button>
                    </div>

                    <div className={`space-y-3 transition-all duration-300 ${prefs.muteAll ? 'opacity-40 pointer-events-none' : ''}`}>
                        {/* Mute Tags */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                            <div>
                                <p className="font-semibold text-sm text-white">Tags & Mentions</p>
                                <p className="text-xs text-slate-400">Notifications when users tag you in stories</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggle('muteTag')}
                                disabled={isSaving || prefs.muteAll}
                                role="switch"
                                aria-checked={prefs.muteTag}
                                className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
                                    prefs.muteTag ? 'justify-end bg-violet-500' : 'justify-start bg-slate-600'
                                }`}
                            >
                                <span className="size-5 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Mute Friend Requests */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                            <div>
                                <p className="font-semibold text-sm text-white">Friend Requests</p>
                                <p className="text-xs text-slate-400">Sent and accepted friend requests</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggle('muteFriendRequest')}
                                disabled={isSaving || prefs.muteAll}
                                role="switch"
                                aria-checked={prefs.muteFriendRequest}
                                className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
                                    prefs.muteFriendRequest ? 'justify-end bg-violet-500' : 'justify-start bg-slate-600'
                                }`}
                            >
                                <span className="size-5 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Mute Comments */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                            <div>
                                <p className="font-semibold text-sm text-white">Comments</p>
                                <p className="text-xs text-slate-400">Replies and comments on your stories</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggle('muteComment')}
                                disabled={isSaving || prefs.muteAll}
                                role="switch"
                                aria-checked={prefs.muteComment}
                                className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
                                    prefs.muteComment ? 'justify-end bg-violet-500' : 'justify-start bg-slate-600'
                                }`}
                            >
                                <span className="size-5 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Mute Likes */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                            <div>
                                <p className="font-semibold text-sm text-white">Likes</p>
                                <p className="text-xs text-slate-400">When users like your stories</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggle('muteLike')}
                                disabled={isSaving || prefs.muteAll}
                                role="switch"
                                aria-checked={prefs.muteLike}
                                className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
                                    prefs.muteLike ? 'justify-end bg-violet-500' : 'justify-start bg-slate-600'
                                }`}
                            >
                                <span className="size-5 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Mute Reactions */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                            <div>
                                <p className="font-semibold text-sm text-white">Reactions</p>
                                <p className="text-xs text-slate-400">Reactions to your milestones</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleToggle('muteReaction')}
                                disabled={isSaving || prefs.muteAll}
                                role="switch"
                                aria-checked={prefs.muteReaction}
                                className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors disabled:opacity-60 ${
                                    prefs.muteReaction ? 'justify-end bg-violet-500' : 'justify-start bg-slate-600'
                                }`}
                            >
                                <span className="size-5 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>
                    </div>
                </div>


            </DialogContent>
        </Dialog>
    );
}


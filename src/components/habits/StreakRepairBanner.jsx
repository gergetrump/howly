import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { useAuth } from '@/context/authContext';
import { StreakShieldIcon } from '@/components/brand/StreakShieldIcon.jsx';
import { applyOverallStreakFreeze } from '@/services/streakFreezeApi';

/* Banner warning that the streak is at risk, letting the user spend a shield to rescue it or go buy one. */
export function StreakRepairBanner({ onRescued }) {
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const [now] = useState(() => Date.now());
    const [isSaving, setIsSaving] = useState(false);

    const deadline = user?.streakRepairDeadline ? new Date(user.streakRepairDeadline) : null;
    const msLeft = deadline ? deadline.getTime() - now : 0;

    if (!deadline || msLeft <= 0) {
        return null;
    }

    const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
    const daysLeft = Math.floor(hoursLeft / 24);
    const timeLeft = hoursLeft >= 24
        ? `${daysLeft} day${daysLeft === 1 ? '' : 's'}`
        : `${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}`;

    const canUseFreeze = (user?.streakShields ?? 0) > 0;

    /* Applies an overall streak freeze, updating the user's streak and shield count, then notifies the parent. */
    async function handleUseFreeze() {
        if (isSaving) {
            return;
        }

        setIsSaving(true);

        try {
            const result = await applyOverallStreakFreeze();
            setUser((current) => (current
                ? {
                    ...current,
                    streak: result?.streak ?? current.streak,
                    streakShields: result?.streakShields ?? current.streakShields,
                    streakRepairDeadline: null,
                }
                : current));
            onRescued?.();
        } catch {
            setIsSaving(false);
        }
    }

    return (
        <div className="mx-4 flex items-center gap-3 rounded-2xl border border-theme-gold/30 bg-amber-500/10 px-4 py-3">
            <ShieldAlert className="size-5 shrink-0 text-theme-gold" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-theme-text">Your streak is at risk!</p>
                <p className="text-xs text-theme-gold/90">
                    {canUseFreeze
                        ? `Use a shield within ${timeLeft} to save your daily streak and at-risk habits.`
                        : `Grab a shield within ${timeLeft} to save your daily streak and at-risk habits.`}
                </p>
            </div>
            {canUseFreeze ? (
                <button
                    type="button"
                    onClick={handleUseFreeze}
                    disabled={isSaving}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 disabled:opacity-60"
                >
                    <StreakShieldIcon className="h-4 w-auto" />
                    {isSaving ? 'Saving…' : 'Use shield'}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => navigate('/shop?category=powerUp')}
                    className="shrink-0 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300"
                >
                    Get a shield
                </button>
            )}
        </div>
    );
}

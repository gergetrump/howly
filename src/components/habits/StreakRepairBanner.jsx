import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { useAuth } from '@/context/authContext';

// Shown while a repair window is open (a missed day with no shield): the streak is held but breaks when the deadline passes. Renders nothing otherwise.
export function StreakRepairBanner() {
    const navigate = useNavigate();
    const { user } = useAuth();
    // Snapshot "now" once (Date.now is impure — must not run during render).
    // The countdown need not tick live; it refreshes on re-mount/navigation.
    const [now] = useState(() => Date.now());

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

    return (
        <div className="mx-4 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
            <ShieldAlert className="size-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Your streak is at risk!</p>
                <p className="text-xs text-amber-200/90">
                    Grab a Streak Freeze within {timeLeft} to save it.
                </p>
            </div>
            <button
                type="button"
                onClick={() => navigate('/shop?category=powerUp')}
                className="shrink-0 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300"
            >
                Get a freeze
            </button>
        </div>
    );
}

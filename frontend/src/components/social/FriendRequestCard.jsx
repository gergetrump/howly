import { Check, X } from 'lucide-react';
import { FriendCard } from '@/components/cards';
import { Button } from '@/components/ui/button';
import { getDisplayName, getUsername } from '@/components/social/socialHelpers.js';

export function FriendRequestCard({ request, busy, onAccept, onReject, onOpenProfile }) {
    const requester = request.requester;

    return (
        <FriendCard
            name={getDisplayName(requester)}
            username={getUsername(requester)}
            streakDays={requester?.streak ?? 0}
            avatarSrc={requester?.profilePictureUrl}
            user={requester}
            showStreak={false}
            onClick={() => onOpenProfile?.(requester)}
            action={(
                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        type="button"
                        size="icon"
                        className="size-9 rounded-full bg-emerald-600 text-white hover:bg-emerald-500"
                        aria-label="Accept friend request"
                        disabled={busy}
                        onClick={() => onAccept(request.id)}
                    >
                        <Check className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        className="size-9 rounded-full border border-theme-text/15 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
                        aria-label="Reject friend request"
                        disabled={busy}
                        onClick={() => onReject(request.id)}
                    >
                        <X className="size-4" aria-hidden="true" />
                    </Button>
                </div>
            )}
        />
    );
}

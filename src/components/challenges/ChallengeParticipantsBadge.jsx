import { useEffect, useRef, useState } from 'react';
import { Loader2, UsersRound } from 'lucide-react';
import { UserPanelRow } from '@/components/social/UserPanelRow.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/* Extracts the populated user from a challenge participant. */
function getParticipantUser(participant) {
    return typeof participant?.user === 'object' && participant.user
        ? participant.user
        : null;
}

/* Shows joined users on hover and opens their profiles. */
export function ChallengeParticipantsBadge({
    challenge,
    participants = [],
    isLoading = false,
    error = '',
    onLoad,
    onOpenProfile,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const closeTimerRef = useRef(null);
    const participantCount = challenge?.participantCount ?? 0;
    const participantUsers = participants.map(getParticipantUser).filter(Boolean);

    /* Clears the delayed hover-close timer. */
    function clearCloseTimer() {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }

    /* Opens the participant popover and triggers loading. */
    function openParticipants() {
        clearCloseTimer();
        setIsOpen(true);
        onLoad?.(challenge?.id);
    }

    /* Delays closing so the pointer can move into the popover. */
    function scheduleClose() {
        clearCloseTimer();
        closeTimerRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, 120);
    }

    useEffect(() => () => {
        if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
        }
    }, []);

    return (
        <Popover
            open={isOpen}
            onOpenChange={(nextOpen) => {
                setIsOpen(nextOpen);

                if (nextOpen) {
                    onLoad?.(challenge?.id);
                }
            }}
        >
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-6 items-center gap-1 rounded-full border border-theme-text/15 bg-theme-text/10 px-2.5 py-0.5 text-xs font-semibold text-theme-text transition hover:bg-theme-text/15"
                    onMouseEnter={openParticipants}
                    onMouseLeave={scheduleClose}
                    onFocus={openParticipants}
                    onBlur={scheduleClose}
                >
                    <UsersRound className="size-3" aria-hidden="true" />
                    {participantCount} joined
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                onOpenAutoFocus={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => event.preventDefault()}
                onMouseEnter={openParticipants}
                onMouseLeave={scheduleClose}
                className="z-[130] w-64 rounded-xl border border-theme-text/10 bg-theme-surface p-2 text-theme-text shadow-xl shadow-theme-bg/30"
            >
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                    Joined users
                </p>
                {isLoading ? (
                    <div className="flex items-center gap-2 px-2 py-3 text-sm text-theme-text-soft">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Loading users
                    </div>
                ) : error ? (
                    <p className="px-2 py-3 text-sm text-theme-danger">{error}</p>
                ) : participantUsers.length > 0 ? (
                    <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                        {participantUsers.map((participantUser) => (
                            <UserPanelRow
                                key={participantUser.id ?? participantUser._id}
                                user={participantUser}
                                avatarClassName="size-9"
                                relationship={{ status: 'self' }}
                                surfaceClassName="bg-transparent"
                                className="rounded-lg px-2 py-2 transition hover:bg-theme-text/10"
                                onOpenProfile={() => {
                                    setIsOpen(false);
                                    onOpenProfile?.(participantUser);
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="px-2 py-3 text-sm text-theme-text-soft">No joined users yet.</p>
                )}
            </PopoverContent>
        </Popover>
    );
}

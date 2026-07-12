import { Check, Loader2, X } from 'lucide-react';
import { ActionButton } from '@/components/common';
import { ChallengeCard } from '@/components/cards/ChallengeCard.jsx';
import { ChallengeParticipantsBadge } from '@/components/challenges/ChallengeParticipantsBadge.jsx';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/* Shows a challenge invitation from a notification before joining or rejecting. */
export function ChallengeInvitationPreviewDialog({
    invitation,
    categoryLabelByKey,
    busyAction,
    participantsByChallengeId,
    participantLoadingByChallengeId,
    participantErrorsByChallengeId,
    onClose,
    onJoin,
    onReject,
    onLoadParticipants,
    onOpenProfile,
    getReward,
}) {
    const challenge = typeof invitation?.challenge === 'object'
        ? invitation.challenge
        : null;
    const category = categoryLabelByKey?.get(challenge?.taxonomy?.categoryKey)
        ?? challenge?.habitTemplate?.category;

    return (
        <Dialog
            open={Boolean(invitation)}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    onClose?.();
                }
            }}
        >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader className="pr-8">
                    <DialogTitle className="text-2xl font-bold text-theme-text">
                        Challenge invitation
                    </DialogTitle>
                    <DialogDescription className="text-theme-text-soft">
                        Review the challenge and decide if you want to join.
                    </DialogDescription>
                </DialogHeader>

                {challenge ? (
                    <ChallengeCard
                        title={challenge.title}
                        description={challenge.description}
                        habitIcon={challenge.habitTemplate?.icon}
                        habitTitle={challenge.habitTitle}
                        category={category}
                        status={challenge.status}
                        visibility={challenge.visibility}
                        participants={challenge.participantCount ?? 0}
                        participantsSlot={(
                            <ChallengeParticipantsBadge
                                challenge={challenge}
                                participants={participantsByChallengeId[challenge.id] ?? []}
                                isLoading={participantLoadingByChallengeId[challenge.id] === true}
                                error={participantErrorsByChallengeId[challenge.id]}
                                onLoad={onLoadParticipants}
                                onOpenProfile={onOpenProfile}
                            />
                        )}
                        totalDays={challenge.durationDays ?? 0}
                        reward={getReward?.(challenge)}
                        startsAt={challenge.startsAt}
                    >
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onReject}
                            disabled={busyAction === `reject-${invitation.id}`}
                            className="border-theme-text/20 bg-theme-text/10 text-theme-text hover:bg-theme-text/20"
                        >
                            {busyAction === `reject-${invitation.id}` ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <X className="size-4" aria-hidden="true" />
                            )}
                            Reject
                        </Button>
                        <ActionButton
                            type="button"
                            onClick={onJoin}
                            disabled={busyAction === `accept-${invitation.id}`}
                        >
                            {busyAction === `accept-${invitation.id}` ? (
                                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Check className="size-4" aria-hidden="true" />
                            )}
                            Join
                        </ActionButton>
                    </ChallengeCard>
                ) : (
                    <div className="rounded-xl border border-theme-text/10 bg-theme-text/5 p-4 text-sm text-theme-text-soft">
                        This invitation is no longer available.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

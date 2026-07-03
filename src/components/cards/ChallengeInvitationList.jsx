import { Check, Loader2, X } from 'lucide-react';
import { ActionButton, CardGrid } from '@/components/common';
import { Button } from '@/components/ui/button';
import { ChallengeCard } from './ChallengeCard.jsx';

function getChallengeFromInvitation(invitation) {
    return typeof invitation?.challenge === 'object' ? invitation.challenge : null;
}

function getChallengeReward(challenge) {
    return challenge?.coinReward ?? challenge?.reward ?? 0;
}

export function ChallengeInvitationList({ invitations, busyAction, onAccept, onReject }) {
    if (invitations.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Invitations</h2>
            <CardGrid columns={2}>
                {invitations.map((invitation) => {
                    const challenge = getChallengeFromInvitation(invitation);

                    return (
                        <ChallengeCard
                            key={invitation.id}
                            title={challenge?.title ?? 'Challenge invitation'}
                            description={challenge?.description}
                            habitTitle={challenge?.habitTitle}
                            category={challenge?.habitTemplate?.category}
                            status={challenge?.status ?? invitation.status}
                            visibility={challenge?.visibility}
                            participants={challenge?.participantCount ?? 0}
                            totalDays={challenge?.durationDays ?? 0}
                            reward={getChallengeReward(challenge)}
                            startsAt={challenge?.startsAt}
                        >
                            <ActionButton
                                type="button"
                                onClick={() => onAccept(invitation.id)}
                                disabled={busyAction === `accept-${invitation.id}`}
                            >
                                {busyAction === `accept-${invitation.id}` ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Check className="size-4" aria-hidden="true" />
                                )}
                                Accept
                            </ActionButton>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onReject(invitation.id)}
                                disabled={busyAction === `reject-${invitation.id}`}
                                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                            >
                                {busyAction === `reject-${invitation.id}` ? (
                                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <X className="size-4" aria-hidden="true" />
                                )}
                                Reject
                            </Button>
                        </ChallengeCard>
                    );
                })}
            </CardGrid>
        </div>
    );
}

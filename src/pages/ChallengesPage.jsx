import { ActionButton } from '@/components/common';
import { ChallengeCard } from '@/components/cards';
import { Page, PageSection, Heading } from '@/components/layout';

export function ChallengesPage() {
    function handleJoinChallenge() {
        // Later: send join request to backend here.
    }

    return (
        <Page background="forest">
            <Heading title="Challenges" subtitle="Join friendly habit challenges." streakDays={100} />

            <PageSection width="lg" align="center">
                <ChallengeCard
                    title="No Social Media"
                    description="No social media for 30 days"
                    participants={30}
                    currentDay={15}
                    totalDays={30}
                    reward={300}
                />

                <ActionButton
                    type="button"
                    fullWidth
                    onClick={handleJoinChallenge}
                >
                    Join Challenge
                </ActionButton>
            </PageSection>
        </Page>
    );
}

import { CardGrid, ReactionButton } from '@/components/common';
import { FeedPostCard, FriendCard } from '@/components/cards';
import { Page, PageSection, Heading } from '@/components/layout';

export function SocialPage() {
    function handleLikePost(postId) {
        // Later: send reaction request to backend here.
        console.log(`Like post: ${postId}`);
    }

    return (
        <Page background="forest">
            <Heading title="Social" subtitle="See what your friends are building." streakDays={100} />

            <PageSection title="Friends">
                <CardGrid>
                    <FriendCard name="Mohammed" username="momo" streakDays={91} />
                    <FriendCard name="Lisa" username="lisa" streakDays={12} />
                </CardGrid>
            </PageSection>

            <PageSection title="Friend Feed">
                <FeedPostCard
                    authorName="Mohammed"
                    companionName="Shadow"
                    message="Shadow finished another reading streak."
                >
                    <ReactionButton count={18} onClick={() => handleLikePost('mohammed-reading')} />
                </FeedPostCard>
            </PageSection>
        </Page>
    );
}

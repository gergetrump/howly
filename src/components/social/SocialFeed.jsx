import { CardGrid } from '@/components/common';
import { FeedPostCard } from '@/components/cards';
import { PageSection } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { MilestoneReactionPicker } from '@/components/social/MilestoneReactionPicker.jsx';
import {
    buildMilestoneTitle,
    formatRelativeTime,
    getDisplayName,
    getUsername,
} from '@/components/social/socialHelpers.js';

function EmptyState({ children }) {
    return (
        <Card className="border-white/10 bg-white/8 text-slate-200 shadow-xl shadow-slate-950/20 backdrop-blur">
            <CardContent>
                <p className="text-sm text-slate-300">{children}</p>
            </CardContent>
        </Card>
    );
}

export function SocialFeed({
    feed,
    isLoading,
    busyPostId,
    onReact,
    onOpenReactions,
}) {
    return (
        <PageSection title="Feed" className="min-w-0">
            {isLoading ? (
                <EmptyState>Loading feed</EmptyState>
            ) : feed.length ? (
                <CardGrid columns={1}>
                    {feed.map((post) => (
                        <FeedPostCard
                            key={post.id}
                            authorName={getDisplayName(post.user)}
                            authorUsername={getUsername(post.user)}
                            authorAvatarSrc={post.user?.profilePictureUrl}
                            meta={formatRelativeTime(post.createdAt)}
                            companionName={post.companion?.name || 'Howly'}
                            milestoneTitle={buildMilestoneTitle(post)}
                        >
                            <MilestoneReactionPicker
                                post={post}
                                busy={busyPostId === post.id}
                                onReact={onReact}
                                onOpenReactions={onOpenReactions}
                            />
                        </FeedPostCard>
                    ))}
                </CardGrid>
            ) : (
                <EmptyState>No milestones today</EmptyState>
            )}
        </PageSection>
    );
}

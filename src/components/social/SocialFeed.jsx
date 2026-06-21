import { CardGrid, ReactionButton } from '@/components/common';
import { FeedPostCard, StoryFeedCard } from '@/components/cards';
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
    currentUserId,
    onReact,
    onOpenReactions,
    onToggleStoryLike,
    onDeleteStory,
}) {
    return (
        <PageSection title="Feed" className="min-w-0">
            {isLoading ? (
                <EmptyState>Loading feed</EmptyState>
            ) : feed.length ? (
                <CardGrid columns={1}>
                    {feed.map((post) =>
                        post.type === 'story' ? (
                            <StoryFeedCard
                                key={`story-${post.id}`}
                                authorName={getDisplayName(post.user)}
                                authorAvatarSrc={post.user?.profilePictureUrl}
                                story={post}
                                isOwn={post.user?.id === currentUserId}
                                onDelete={onDeleteStory}
                            >
                                {post.user?.id !== currentUserId ? (
                                    <ReactionButton
                                        liked={post.likedByCurrentUser}
                                        count={post.likeCount}
                                        label="Like story"
                                        disabled={busyPostId === post.id}
                                        onClick={() => onToggleStoryLike?.(post)}
                                    />
                                ) : null}
                            </StoryFeedCard>
                        ) : (
                            <FeedPostCard
                                key={`milestone-${post.id}`}
                                authorName={getDisplayName(post.user)}
                                authorUsername={getUsername(post.user)}
                                authorAvatarSrc={post.user?.profilePictureUrl}
                                meta={formatRelativeTime(post.createdAt)}
                                companionName={post.companion?.name || 'Howly'}
                                companionType={post.companion?.type || 'wolf'}
                                companionEquippedItemKeys={post.companion?.equippedItemKeys ?? []}
                                companionEquippedItemConfigs={post.companion?.equippedItemConfigs ?? []}
                                milestoneTitle={buildMilestoneTitle(post)}
                            >
                                <MilestoneReactionPicker
                                    post={post}
                                    busy={busyPostId === post.id}
                                    onReact={onReact}
                                    onOpenReactions={onOpenReactions}
                                />
                            </FeedPostCard>
                        ),
                    )}
                </CardGrid>
            ) : (
                <EmptyState>Nothing new today</EmptyState>
            )}
        </PageSection>
    );
}

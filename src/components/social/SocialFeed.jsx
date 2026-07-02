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
    onOpenStoryLikes,
    onDeleteStory,
    onOpenProfile,
    blockedUsers = [],
    blockers = [],
    targetStoryId = null,
    targetCommentId = null,
    targetCommentToken = null,
}) {
    return (
        <PageSection title="Feed" className="min-w-0 lg:max-w-[64rem]">
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
                                authorIsPremium={post.user?.isPremium === true || post.user?.role === 'admin'}
                                meta={formatRelativeTime(post.createdAt)}
                                story={post}
                                isOwn={post.user?.id === currentUserId}
                                currentUserId={currentUserId}
                                onDelete={onDeleteStory}
                                onOpenLikes={(_, likers) => onOpenStoryLikes?.(post, likers)}
                                onOpenProfile={onOpenProfile}
                                blockedUsers={blockedUsers}
                                blockers={blockers}
                                fullImage
                                defaultOpenComments={post.id === targetStoryId}
                                targetCommentId={post.id === targetStoryId ? targetCommentId : null}
                                targetCommentToken={post.id === targetStoryId ? targetCommentToken : null}
                            >
                                <ReactionButton
                                    liked={post.likedByCurrentUser}
                                    count={post.likeCount}
                                    label="Like story"
                                    disabled={busyPostId === post.id}
                                    onClick={() => onToggleStoryLike?.(post)}
                                />
                            </StoryFeedCard>
                        ) : (
                            <FeedPostCard
                                key={`milestone-${post.id}`}
                                authorName={getDisplayName(post.user)}
                                authorUsername={getUsername(post.user)}
                                authorAvatarSrc={post.user?.profilePictureUrl}
                                authorIsPremium={post.user?.isPremium === true || post.user?.role === 'admin'}
                                meta={formatRelativeTime(post.createdAt)}
                                companionName={post.companion?.name || 'Howly'}
                                companionType={post.companion?.type || 'wolf'}
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

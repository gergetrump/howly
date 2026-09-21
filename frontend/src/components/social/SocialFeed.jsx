import { ChevronDown } from 'lucide-react';
import { ActionButton, CardGrid, ReactionButton } from '@/components/common';
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
        <Card className="border-theme-text/10 bg-theme-text/5 text-theme-text">
            <CardContent>
                <p className="text-sm text-theme-text-soft">{children}</p>
            </CardContent>
        </Card>
    );
}

export function SocialFeed({
    feed,
    isLoading,
    busyPostId,
    currentUserId,
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
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
    onTargetCommentHandled,
    onTargetCommentUnavailable,
}) {
    return (
        <PageSection title="Feed" className="min-w-0 lg:max-w-[64rem]">
            {isLoading ? (
                <EmptyState>Loading feed</EmptyState>
            ) : feed.length ? (
                <div className="grid gap-4">
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
                                    onTargetCommentHandled={onTargetCommentHandled}
                                    onTargetCommentUnavailable={onTargetCommentUnavailable}
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
                                <div key={`milestone-${post.id}`} data-post-id={post.id}>
                                    <FeedPostCard
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
                                </div>
                            ),
                        )}
                    </CardGrid>

                    {hasMore ? (
                        <div className="flex justify-center">
                            <ActionButton
                                type="button"
                                className="gap-2 px-5"
                                disabled={isLoadingMore}
                                onClick={onLoadMore}
                            >
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                {isLoadingMore ? 'Loading...' : 'Load more'}
                            </ActionButton>
                        </div>
                    ) : null}
                </div>
            ) : (
                <EmptyState>Nothing new today</EmptyState>
            )}
        </PageSection>
    );
}

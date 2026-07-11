function getActorName(actor) {
    return actor?.firstName || actor?.username || 'Someone';
}

/* Builds the human-readable text shown for a notification based on its type and actor. */
export function getNotificationMessage(notification) {
    const actorName = getActorName(notification.actor);

    switch (notification.type) {
        case 'friend_request_received':
            return `${actorName} sent you a friend request`;
        case 'friend_request_accepted':
            return `${actorName} accepted your friend request`;
        case 'milestone_reacted': {
            const reactions = Array.isArray(notification.metadata?.emojis) && notification.metadata.emojis.length
                ? notification.metadata.emojis.join(' ')
                : notification.metadata?.emoji;

            return `${actorName} reacted to your milestone${reactions ? ` ${reactions}` : ''}`;
        }
        case 'story_liked':
            return `${actorName} liked your post`;
        case 'story_commented':
            return `${actorName} commented on your post`;
        case 'story_tagged': {
            if (notification.metadata?.taggedOnOwnPost) {
                return `${actorName} tagged you on your post`;
            }

            const storyOwnerName = notification.metadata?.storyOwnerName;
            return storyOwnerName
                ? `${actorName} tagged you on ${storyOwnerName}'s post`
                : `${actorName} tagged you in a post`;
        }
        case 'challenge_invitation_received': {
            const challengeTitle = notification.metadata?.challengeTitle;
            return challengeTitle
                ? `${actorName} invited you to ${challengeTitle}`
                : `${actorName} invited you to a challenge`;
        }
        default:
            return `${actorName} has an update for you`;
    }
}

/* Returns the in-app route a notification should link to based on its type and entity. */
export function getNotificationLink(notification) {
    const entityId = notification.entityId;
    const commentId = notification.metadata?.commentId;

    switch (notification.type) {
        case 'story_tagged':
        case 'story_commented':
            if (entityId && commentId) {
                return `/social?storyId=${entityId}&commentId=${commentId}`;
            }
            return '/social';
        case 'story_liked':
            return entityId ? `/social?storyId=${entityId}` : '/social';
        case 'milestone_reacted':
            return entityId ? `/social?postId=${entityId}` : '/social';
        case 'challenge_invitation_received':
            return '/challenges';
        default:
            return '/social';
    }
}

/* Builds the router navigation state ("jump" payload) so the target page can focus the related item. */
export function getNotificationNavigationState(notification) {
    const entityId = notification.entityId;
    const commentId = notification.metadata?.commentId;

    if (!entityId) {
        return undefined;
    }

    if (notification.type === 'friend_request_received') {
        return {
            notificationJump: {
                requestId: entityId,
                type: notification.type,
                actorId: notification.actor?.id ?? notification.actor?._id ?? null,
                metadata: notification.metadata ?? {},
                token: `${notification.id}-${Date.now()}`,
            },
        };
    }

    if (notification.type === 'story_tagged' || notification.type === 'story_commented' || notification.type === 'story_liked') {
        return {
            notificationJump: {
                storyId: entityId,
                commentId: commentId ?? null,
                type: notification.type,
                actorId: notification.actor?.id ?? notification.actor?._id ?? null,
                metadata: notification.metadata ?? {},
                token: `${notification.id}-${Date.now()}`,
            },
        };
    }

    if (notification.type === 'milestone_reacted') {
        return {
            notificationJump: {
                postId: entityId,
                postType: 'milestone',
                type: notification.type,
                actorId: notification.actor?.id ?? notification.actor?._id ?? null,
                metadata: notification.metadata ?? {},
                token: `${notification.id}-${Date.now()}`,
            },
        };
    }

    if (notification.type === 'challenge_invitation_received') {
        return {
            notificationJump: {
                invitationId: entityId,
                challengeId: notification.metadata?.challengeId ?? null,
                type: notification.type,
                actorId: notification.actor?.id ?? notification.actor?._id ?? null,
                metadata: notification.metadata ?? {},
                token: `${notification.id}-${Date.now()}`,
            },
        };
    }

    return undefined;
}

export function getDisplayName(user) {
    return user?.firstName || user?.username || 'Howly friend';
}

export function getUsername(user) {
    return user?.username || 'friend';
}

export function sameId(firstId, secondId) {
    return firstId?.toString?.() === secondId?.toString?.();
}

export function getUserId(user) {
    return (user?.id || user?._id || user || '').toString();
}

export function getNormalizedUsername(userOrUsername) {
    if (typeof userOrUsername === 'string') {
        return userOrUsername.toLowerCase();
    }

    return (userOrUsername?.username || '').toLowerCase();
}

export function isBlockedByRelationship(user, blockedUsers = [], blockers = []) {
    return isUserBlockedByMe(user, blockedUsers) || hasUserBlockedMe(user, blockers);
}

export function isUserBlockedByMe(user, blockedUsers = []) {
    const userId = getUserId(user);
    const username = getNormalizedUsername(user);

    return blockedUsers.some((blockedUser) => {
        const blockedId = getUserId(blockedUser);
        return (userId && blockedId === userId)
            || (username && getNormalizedUsername(blockedUser) === username);
    });
}

export function hasUserBlockedMe(user, blockers = []) {
    const userId = getUserId(user);
    const username = getNormalizedUsername(user);

    return blockers.some((blocker) => {
        const blockerId = getUserId(blocker);
        return (userId && blockerId === userId)
            || (username && getNormalizedUsername(blocker) === username);
    });
}

export function buildMilestoneTitle(post) {
    const habitTitle = post?.habit?.title || 'Habit';
    const habitFrequency = post?.habit?.frequency || 'Habit';

    return `Unlocked a ${post?.streakDays}-day milestone in ${habitFrequency} ${habitTitle}!`;
}

export function formatRelativeTime(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));

    if (elapsedMinutes < 1) {
        return 'Just now';
    }

    if (elapsedMinutes === 1) {
        return '1 minute ago';
    }

    if (elapsedMinutes < 60) {
        return `${elapsedMinutes} minutes ago`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);

    if (elapsedHours === 1) {
        return '1 hour ago';
    }

    if (elapsedHours < 24) {
        return `${elapsedHours} hours ago`;
    }

    const elapsedDays = Math.min(Math.floor(elapsedHours / 24), 6);

    if (elapsedDays === 1) {
        return '1 day';
    }

    return `${elapsedDays} days`;
}

export function getSocialErrorMessage(error, user) {
    switch (error.code) {
        case 'FRIEND_REQUEST_TO_SELF':
            return 'You cannot send a friend request to yourself';
        case 'FRIEND_REQUEST_RECIPIENT_NOT_FOUND':
        case 'USER_BLOCKED':
            return 'Hmm, that didn\'t work. Check if the username is correct.';
        case 'USERS_ALREADY_FRIENDS':
            return `You and ${getDisplayName(user)} are already friends`;
        case 'PENDING_FRIEND_REQUEST_EXISTS':
            return `Friend request to ${getDisplayName(user)} is already sent. Let's wait a bit`;
        case 'PENDING_FRIEND_REQUEST_NOT_FOUND':
            return 'That friend request is no longer available';
        case 'FRIENDSHIP_NOT_FOUND':
            return 'That friend is no longer in your friend list';
        case 'MILESTONE_POST_NOT_FOUND':
            return 'That milestone is no longer available';
        case 'MILESTONE_REACTION_INVALID':
            return 'Choose one of the available milestone reactions';
        case 'MILESTONE_REACTION_LIMIT_REACHED':
            return 'Premium users can react with up to 5 emojis';
        case 'CANNOT_LIKE_OWN_MILESTONE':
            return 'You cannot like your own milestone';
        case 'STORY_NOT_FOUND':
            return 'That story is no longer available';
        default:
            return error.message;
    }
}

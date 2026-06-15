export function getDisplayName(user) {
    return user?.firstName || user?.username || 'Howly friend';
}

export function getUsername(user) {
    return user?.username || 'friend';
}

export function sameId(firstId, secondId) {
    return firstId?.toString?.() === secondId?.toString?.();
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

    const elapsedDays = Math.floor(elapsedHours / 24);

    if (elapsedDays === 1) {
        return '1 day ago';
    }

    if (elapsedDays < 7) {
        return `${elapsedDays} days ago`;
    }

    const elapsedWeeks = Math.floor(elapsedDays / 7);

    return elapsedWeeks === 1 ? '1 week ago' : `${elapsedWeeks} weeks ago`;
}

export function getSocialErrorMessage(error, user) {
    switch (error.code) {
        case 'FRIEND_REQUEST_TO_SELF':
            return 'You cannot send a friend request to yourself';
        case 'FRIEND_REQUEST_RECIPIENT_NOT_FOUND':
            return 'Hmm, that didn\'t work. Check if the username is correct';
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
        case 'CANNOT_LIKE_OWN_MILESTONE':
            return 'You cannot like your own milestone';
        case 'CANNOT_LIKE_OWN_STORY':
            return 'You cannot like your own story';
        case 'STORY_NOT_FOUND':
            return 'That story is no longer available';
        default:
            return error.message;
    }
}

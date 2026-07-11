import { apiRequest } from './apiClient';

// Create a story: image file + source context, optional caption
export function createStory({ sourceType, sourceId, caption, imageFile }) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('sourceType', sourceType);
    formData.append('sourceId', sourceId);

    if (caption) {
        formData.append('caption', caption);
    }

    return apiRequest('/stories', {
        method: 'POST',
        body: formData,
    });
}

/* Fetches the current user's currently-active stories. */
export function getMyActiveStories() {
    return apiRequest('/stories/me');
}

/* Fetches the current user's archived (expired) stories. */
export function getMyStoryArchive() {
    return apiRequest('/stories/me/archive');
}

/* Toggles the current user's like on a story. */
export function toggleStoryLike(storyId) {
    return apiRequest(`/stories/${storyId}/like`, { method: 'POST' });
}

/* Builds a ?limit=&offset= query string from optional pagination options. */
function buildPaginationQuery({ limit, offset } = {}) {
    const params = new URLSearchParams();

    if (Number.isInteger(limit)) {
        params.set('limit', String(limit));
    }

    if (Number.isInteger(offset)) {
        params.set('offset', String(offset));
    }

    const query = params.toString();

    return query ? `?${query}` : '';
}

/* Fetches the paginated list of users who liked a story. */
export function getStoryLikes(storyId, pagination) {
    return apiRequest(`/stories/${storyId}/likes${buildPaginationQuery(pagination)}`);
}

/* Fetches the users eligible to be @-mentioned on a story. */
export function getStoryMentionCandidates(storyId) {
    return apiRequest(`/stories/${storyId}/mention-candidates`);
}

/* Deletes one of the current user's stories. */
export function deleteStory(storyId) {
    return apiRequest(`/stories/${storyId}`, { method: 'DELETE' });
}

/* Fetches the paginated comments on a story. */
export function getStoryComments(storyId, pagination) {
    return apiRequest(`/stories/${storyId}/comments${buildPaginationQuery(pagination)}`);
}

/* Posts a comment or threaded reply on a story. */
export function postStoryComment(storyId, content, parentCommentId = null) {
    return apiRequest(`/stories/${storyId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentCommentId }),
    });
}

/* Deletes a comment from a story. */
export function deleteStoryComment(storyId, commentId) {
    return apiRequest(`/stories/${storyId}/comments/${commentId}`, { method: 'DELETE' });
}

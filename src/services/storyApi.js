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

export function getMyActiveStories() {
    return apiRequest('/stories/me');
}

export function getMyStoryArchive() {
    return apiRequest('/stories/me/archive');
}

export function toggleStoryLike(storyId) {
    return apiRequest(`/stories/${storyId}/like`, { method: 'POST' });
}

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

export function getStoryLikes(storyId, pagination) {
    return apiRequest(`/stories/${storyId}/likes${buildPaginationQuery(pagination)}`);
}

export function getStoryMentionCandidates(storyId) {
    return apiRequest(`/stories/${storyId}/mention-candidates`);
}

export function deleteStory(storyId) {
    return apiRequest(`/stories/${storyId}`, { method: 'DELETE' });
}

export function getStoryComments(storyId, pagination) {
    return apiRequest(`/stories/${storyId}/comments${buildPaginationQuery(pagination)}`);
}

export function postStoryComment(storyId, content, parentCommentId = null) {
    return apiRequest(`/stories/${storyId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentCommentId }),
    });
}

export function deleteStoryComment(storyId, commentId) {
    return apiRequest(`/stories/${storyId}/comments/${commentId}`, { method: 'DELETE' });
}

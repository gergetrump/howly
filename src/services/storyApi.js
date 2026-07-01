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

export function getStoryLikes(storyId) {
    return apiRequest(`/stories/${storyId}/likes`);
}

export function deleteStory(storyId) {
    return apiRequest(`/stories/${storyId}`, { method: 'DELETE' });
}

export function getStoryComments(storyId) {
    return apiRequest(`/stories/${storyId}/comments`);
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

import { apiRequest } from './apiClient';

export function sendUserReport({ reportedUserId, tags, message, attachment }) {
    const formData = new FormData();

    formData.append('reportedUserId', reportedUserId);
    formData.append('message', message);
    formData.append('tags', JSON.stringify(tags ?? []));

    if (attachment) {
        formData.append('attachment', attachment);
    }

    return apiRequest('/reports', {
        method: 'POST',
        body: formData,
    });
}

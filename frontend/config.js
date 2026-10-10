export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Relative `/api` stays on the site that served the app. An absolute API URL
// opens the notification stream on that API's origin.
export function notificationStreamUrl(token) {
    const path = `/api/notifications/stream?token=${encodeURIComponent(token)}`;

    if (!API_BASE_URL || API_BASE_URL.startsWith('/')) {
        return path;
    }

    return `${new URL(API_BASE_URL).origin}${path}`;
}

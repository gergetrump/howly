import { useNotificationStream } from '@/hooks/useNotificationStream';
import { useAuth } from '@/context/AuthContext';

/* Invisible listener that subscribes to the notification SSE stream while logged in and broadcasts a window event on updates. */
export function NotificationStreamListener() {
    const { user } = useAuth();

    // This component renders nothing. It only bridges the SSE stream to a
    // browser event that the bell and social page already know how to refresh on.
    useNotificationStream(() => {
        window.dispatchEvent(new Event('howly:notifications-updated'));
    }, Boolean(user));

    return null;
}

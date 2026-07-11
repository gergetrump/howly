import { useNotificationStream } from '@/hooks/useNotificationStream';
import { useAuth } from '@/context/authContext';

/* Invisible listener that subscribes to the notification SSE stream while logged in and broadcasts a window event on updates. */
export function NotificationStreamListener() {
    const { user } = useAuth();

    useNotificationStream(() => {
        window.dispatchEvent(new Event('howly:notifications-updated'));
    }, Boolean(user));

    return null;
}

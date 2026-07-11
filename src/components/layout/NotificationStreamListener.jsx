import { useNotificationStream } from '@/hooks/useNotificationStream';
import { useAuth } from '@/context/AuthContext';

export function NotificationStreamListener() {
    const { user } = useAuth();

    useNotificationStream(() => {
        window.dispatchEvent(new Event('howly:notifications-updated'));
    }, Boolean(user));

    return null;
}

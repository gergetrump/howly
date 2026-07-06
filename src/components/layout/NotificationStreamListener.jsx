import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { useNotificationStream } from '@/hooks/useNotificationStream';
import { useAuth } from '@/context/authContext';
import {
    getNotificationLink,
    getNotificationMessage,
    getNotificationNavigationState,
} from '@/components/layout/notificationHelpers';
import { getNotificationMenuOpen } from '@/components/layout/notificationMenuState';

export function NotificationStreamListener() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useNotificationStream((notification) => {
        window.dispatchEvent(new Event('howly:notifications-updated'));

        if (getNotificationMenuOpen()) {
            return;
        }

        toast(getNotificationMessage(notification), {
            icon: <Bell className="size-4 text-theme-accent-soft" aria-hidden="true" />,
            action: {
                label: 'View',
                onClick: () => navigate(getNotificationLink(notification), {
                    state: getNotificationNavigationState(notification),
                }),
            },
        });
    }, Boolean(user));

    return null;
}

import { Outlet } from 'react-router-dom';
import { NotificationStreamListener } from '@/components/layout/NotificationStreamListener.jsx';

/* App shell for authenticated pages: mounts the notification stream listener and renders the routed page. */
export function PageLayout() {
    return (
        <>
            <NotificationStreamListener />
            <Outlet />
        </>
    );
}

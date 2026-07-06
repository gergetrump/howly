import { Outlet } from 'react-router-dom';
import { NotificationStreamListener } from '@/components/layout/NotificationStreamListener.jsx';

export function PageLayout() {
    return (
        <>
            <NotificationStreamListener />
            <Outlet />
        </>
    );
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/authContext';

function hasPremiumAccess(user) {
    return user?.role === 'admin' || user?.isPremium === true;
}

export function PremiumRoute({
    message = 'Analytics and Trends are Premium features. Upgrade to unlock deeper progress insights.',
}) {
    const { user, isLoadingUser } = useAuth();
    const location = useLocation();

    if (isLoadingUser) {
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!hasPremiumAccess(user)) {
        return (
            <Navigate
                to="/premium"
                replace
                state={{
                    message,
                    returnTo: location.pathname,
                }}
            />
        );
    }

    return <Outlet />;
}

/**
 * Route guard for authenticated pages.
 *
 * - Not logged in: redirect to /login.
 * - Logged in, onboarding not finished, and NOT already on an onboarding page:
 *   redirect into the onboarding flow.
 * - Logged in, onboarding finished, but sitting on an onboarding page:
 *   redirect to the dashboard.
 *
 * The "already on an onboarding page" check is what prevents an infinite
 * redirect loop when the onboarding routes themselves live under this guard.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
    const { user, isLoadingUser } = useAuth();
    const location = useLocation();

    // Wait for the initial /users/me fetch before deciding where to send the user.
    if (isLoadingUser) {
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const onOnboarding = location.pathname.startsWith('/onboarding');

    if (!user.onboardingCompleted && !onOnboarding) {
        return <Navigate to="/onboarding/companion" replace />;
    }

    if (user.onboardingCompleted && onOnboarding) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

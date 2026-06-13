/**
 * Route guard for the authenticated app pages (dashboard, social, shop, ...).
 *
 * - Not logged in: redirect to /login.
 * - Logged in but onboarding not finished: redirect into the onboarding flow.
 * - Otherwise the nested route renders via <Outlet />.
 *
 * The onboarding pages themselves live in the public route group, so they stay
 * viewable without an account; their save actions still require a token.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
    const { user, isLoadingUser } = useAuth();

    // Wait for the initial /users/me fetch before deciding where to send the user.
    if (isLoadingUser) {
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!user.onboardingCompleted) {
        return <Navigate to="/onboarding/companion" replace />;
    }

    return <Outlet />;
}

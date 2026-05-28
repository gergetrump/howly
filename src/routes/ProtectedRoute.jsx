/**
 * Placeholder route guard for pages that should only be accessible
 * to authenticated users.
 *
 * For the initial frontend setup, this component only renders the nested
 * route content via Outlet so protected pages can still be developed and
 * reviewed without a finished authentication flow.
 *
 * Real token validation and redirects to the login page will be added in
 * the dedicated authentication implementation.
 */
import { Outlet } from 'react-router-dom';

export function ProtectedRoute() {
    return <Outlet />;
}
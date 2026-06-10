import { Outlet } from 'react-router-dom';

export function AuthLayout() {
    return (
        <main className="min-h-screen bg-theme-bg bg-gradient-to-b from-theme-bg via-theme-bg to-theme-surface text-theme-text">
            <Outlet />
        </main>
    );
}
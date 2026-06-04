import { Outlet } from 'react-router-dom';

export function AuthLayout() {
    return (
        <main className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white">
            <Outlet />
        </main>
    );
}
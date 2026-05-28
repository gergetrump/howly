import { Outlet } from 'react-router-dom';

export function AuthLayout() {
    return (
        <main className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 px-6 py-10 text-white">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
                <Outlet />
            </div>
        </main>
    );
}
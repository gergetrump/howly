import { Outlet } from 'react-router-dom';

export function PageLayout() {
    return (
        <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
            <div className="mx-auto max-w-5xl">
                <Outlet />
            </div>
        </main>
    );
}
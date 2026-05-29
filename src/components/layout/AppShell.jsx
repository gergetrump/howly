import { Outlet } from 'react-router-dom';
import { NavBar } from '@/components/layout/NavBar.jsx';
import { Heading } from '@/components/layout/Heading.jsx';

export function AppShell({
    title = 'Dashboard',
    subtitle,
    coins,
    children,
}) {
    return (
        <main className="min-h-screen bg-slate-950 px-4 py-6 pb-24 text-white md:px-8 md:pb-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
                <Heading title={title} subtitle={subtitle} coins={coins} />
                {children ?? <Outlet />}
                <NavBar />
            </div>
        </main>
    );
}

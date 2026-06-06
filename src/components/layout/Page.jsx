import { Background } from '@/components/brand/background';
import { NavBar } from '@/components/layout/NavBar.jsx';
import { PageContent } from '@/components/layout/pageContent';
import { cn } from '@/lib/utils';

export function Page({ theme = 'forest', backgroundSrc, showNav = true, children, className }) {
    return (
        <main className={cn('relative min-h-screen pt-24', className)}>
            <Background theme={theme} backgroundSrc={backgroundSrc} />
            <PageContent>{children}</PageContent>
            {showNav ? <NavBar /> : null}
        </main>
    );
}

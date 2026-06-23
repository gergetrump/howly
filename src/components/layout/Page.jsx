import { Background } from '@/components/brand/background';
import { NavBar } from '@/components/layout/NavBar.jsx';
import { PageContent } from '@/components/layout/pageContent';
import { cn } from '@/lib/utils';

export function Page({ theme = 'forest', backgroundSrc, showNav = true, children, className, contentClassName }) {
    return (
        <main className={cn('relative min-h-screen pt-24', className)}>
            <Background theme={theme} backgroundSrc={backgroundSrc} />
            <PageContent className={contentClassName}>{children}</PageContent>
            {showNav ? <NavBar /> : null}
        </main>
    );
}

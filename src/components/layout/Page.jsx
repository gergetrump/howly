import { Background } from '@/components/brand/Background';
import { NavBar } from '@/components/layout/NavBar.jsx';
import { PageContent } from '@/components/layout/PageContent';
import { cn } from '@/lib/utils';

export function Page({ background = 'forest', backgroundSrc, showNav = true, children, className }) {
    return (
        <main className={cn('relative min-h-screen pt-24', className)}>
            <Background background={background} backgroundSrc={backgroundSrc} />
            <PageContent>{children}</PageContent>
            {showNav ? <NavBar /> : null}
        </main>
    );
}

import { cn } from '@/lib/utils';

export function PageContent({ children, className }) {
    return (
        <div className={cn('relative z-10 mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 lg:px-12', className)}>
            {children}
        </div>
    );
}

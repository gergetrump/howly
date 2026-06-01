import { cn } from '@/lib/utils';

export function PageContent({ children, className }) {
    return (
        <div className={cn('relative z-10 mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6', className)}>
            {children}
        </div>
    );
}

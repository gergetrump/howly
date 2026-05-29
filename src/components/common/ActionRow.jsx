import { cn } from '@/lib/utils';

export function ActionRow({ children, className }) {
    return (
        <div className={cn('flex items-center gap-3 [&>*:first-child]:flex-1', className)}>
            {children}
        </div>
    );
}

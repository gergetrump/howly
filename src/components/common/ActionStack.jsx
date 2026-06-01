import { cn } from '@/lib/utils';

export function ActionStack({ children, className }) {
    return (
        <div className={cn('space-y-3', className)}>
            {children}
        </div>
    );
}

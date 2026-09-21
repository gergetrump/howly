import { cn } from '@/lib/utils';

export function ActionStack({ children, className, ...props }) {
    return (
        <div className={cn('space-y-3', className)} {...props}>
            {children}
        </div>
    );
}

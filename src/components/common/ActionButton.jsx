import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ActionButton({ fullWidth = false, className, children, ...props }) {
    return (
        <Button
            className={cn(
                'bg-theme-invert text-theme-invert-text hover:bg-theme-invert/85',
                fullWidth && 'w-full',
                className,
            )}
            {...props}
        >
            {children}
        </Button>
    );
}

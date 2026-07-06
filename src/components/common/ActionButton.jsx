import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ActionButton({ fullWidth = false, variant, className, children, ...props }) {
    return (
        <Button
            variant={variant}
            className={cn(
                !variant && 'bg-theme-invert text-theme-invert-text hover:bg-theme-invert/85',
                fullWidth && 'w-full',
                className,
            )}
            {...props}
        >
            {children}
        </Button>
    );
}

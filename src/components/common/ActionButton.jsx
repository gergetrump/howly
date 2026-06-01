import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ActionButton({ fullWidth = false, className, children, ...props }) {
    return (
        <Button
            className={cn(
                'bg-white text-slate-950 hover:bg-slate-200',
                fullWidth && 'w-full',
                className,
            )}
            {...props}
        >
            {children}
        </Button>
    );
}

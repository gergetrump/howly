import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PrimaryButton({ fullWidth = false, className, children, ...props }) {
    return (
        <Button variant="primary" className={cn(fullWidth && 'w-full', className)} {...props}>
            {children}
        </Button>
    );
}

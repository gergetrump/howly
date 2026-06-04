import { cn } from '@/lib/utils';

export function Moon({ className, style }) {
    return (
        <div
            className={cn('absolute rounded-full bg-howly-moon', className)}
            style={{
                boxShadow:
                    '0 0 60px 20px rgba(245, 236, 216, 0.15), 0 0 120px 40px rgba(245, 236, 216, 0.05)',
                ...style
            }}
            aria-hidden="true"
        />
    );
}

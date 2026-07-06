import { cn } from '@/lib/utils';

export function Moon({ className, style }) {
    return (
        <div
            className={cn('absolute rounded-full bg-howly-moon', className)}
            style={{
                boxShadow:
                    '0 0 60px 20px color-mix(in srgb, var(--howly-moon) 18%, transparent), 0 0 120px 40px color-mix(in srgb, var(--howly-moon) 7%, transparent)',
                ...style
            }}
            aria-hidden="true"
        />
    );
}

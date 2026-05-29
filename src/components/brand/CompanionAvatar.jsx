import fallbackCompanion from '@/assets/hero.png';
import howlyCompanion from '@/assets/howly.png';
import { cn } from '@/lib/utils';

const sizeClasses = {
    sm: 'size-16',
    md: 'size-24',
    lg: 'size-36',
    xl: 'size-48',
};

export function CompanionAvatar({
    src = howlyCompanion || fallbackCompanion,
    name = 'Howly',
    size = 'md',
    showName = false,
    className,
}) {
    return (
        <figure className={cn('flex flex-col items-center gap-2', className)}>
            <img
                src={src}
                alt={name}
                className={cn('object-contain drop-shadow-2xl', sizeClasses[size] ?? sizeClasses.md)}
            />
            {showName ? (
                <figcaption className="text-sm font-semibold text-pink-100">{name}</figcaption>
            ) : null}
        </figure>
    );
}

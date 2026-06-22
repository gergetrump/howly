import { Companion } from '@/components/brand/Companion';
import howlyCompanion from '@/assets/howly.png';
import { cn } from '@/lib/utils';

export function CompanionStage({
                                   type = 'wolf',
                                   name = 'Howly',
                                   mood = 'ready',
                                   src = howlyCompanion,
                                   size = 'xl',
                                   equippedItemKeys = [],
                                   equippedItemConfigs = [],
                                   className,
                                   children,
                               }) {
    return (
        <section className={cn('flex min-h-72 flex-col items-center justify-end gap-3 text-center', className)}>
            <Companion
                type={type}
                name={name}
                mood={mood}
                src={src}
                size={size}
                equippedItemKeys={equippedItemKeys}
                equippedItemConfigs={equippedItemConfigs}
            />
            {children}
        </section>
    );
}

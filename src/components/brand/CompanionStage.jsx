import { Companion } from '@/components/brand/Companion';
import howlyCompanion from '@/assets/howly.png';
import { cn } from '@/lib/utils';

export function CompanionStage({
                                   name = 'Howly',
                                   mood = 'ready',
                                   src = howlyCompanion,
                                   size = 'xl',
                                   className,
                                   children,
                               }) {
    return (
        <section className={cn('flex min-h-72 flex-col items-center justify-end gap-3 text-center', className)}>
            <Companion name={name} mood={mood} src={src} size={size} />
            {children}
        </section>
    );
}

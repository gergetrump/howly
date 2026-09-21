import { cn } from '@/lib/utils';

export function CardGrid({ children, columns = 2, className }) {
    const columnClass = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
    }[columns];

    return (
        <div className={cn('grid gap-3', columnClass, className)}>
            {children}
        </div>
    );
}

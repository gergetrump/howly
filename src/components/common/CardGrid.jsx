import { cn } from '@/lib/utils';

export function CardGrid({ children, columns = 2, className }) {
    const columnClass = {
        1: 'md:grid-cols-1',
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-3',
        4: 'md:grid-cols-4',
    }[columns];

    return (
        <div className={cn('grid gap-3', columnClass, className)}>
            {children}
        </div>
    );
}

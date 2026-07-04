import { SectionHeader } from '@/components/common/sectionHeader';
import { cn } from '@/lib/utils';

const widthClasses = {
    default: '',
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    full: 'w-full',
};

const alignClasses = {
    left: '',
    center: 'mx-auto',
};

export function PageSection({
    title,
    description,
    actionLabel,
    onAction,
    titleAction,
    width = 'default',
    align = 'left',
    children,
    className,
}) {
    return (
        <section
            className={cn(
                'space-y-3',
                widthClasses[width] ?? widthClasses.default,
                alignClasses[align] ?? alignClasses.left,
                className,
            )}
        >
            {title ? (
                <SectionHeader
                    title={title}
                    description={description}
                    actionLabel={actionLabel}
                    onAction={onAction}
                    titleAction={titleAction}
                />
            ) : null}
            {children}
        </section>
    );
}

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ChallengeCategoryChips({
    options = [],
    value = 'all',
    onChange,
    disabled = false,
    className,
}) {
    if (!options.length) {
        return null;
    }

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {options.map((option) => {
                const isSelected = value === option.value;

                return (
                    <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        aria-pressed={isSelected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'rounded-full px-3 py-1.5 text-sm',
                            isSelected
                                ? 'border-theme-accent bg-theme-accent text-theme-on-accent hover:bg-theme-accent-strong hover:text-theme-on-accent'
                                : 'border-theme-text/20 bg-theme-text/5 text-theme-text-soft hover:bg-theme-text/10 hover:text-theme-text',
                        )}
                    >
                        {option.label}
                    </Button>
                );
            })}
        </div>
    );
}

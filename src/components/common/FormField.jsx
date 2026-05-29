import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function FormField({ id, label, hint, error, children, className }) {
    return (
        <div className={cn('space-y-2', className)}>
            {label ? <Label htmlFor={id}>{label}</Label> : null}
            {children}
            {error ? (
                <p className="text-sm font-medium text-red-300">{error}</p>
            ) : hint ? (
                <p className="text-sm text-slate-400">{hint}</p>
            ) : null}
        </div>
    );
}

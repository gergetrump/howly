import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function PlanLimitDialog({
    open,
    onOpenChange,
    title = 'Limit reached',
    message = 'You have reached the limit for your current plan.',
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl border-theme-text/10 bg-theme-surface p-8 text-theme-text shadow-2xl">
                <DialogHeader className="items-center text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-300 text-slate-950 shadow-lg shadow-sky-300/20">
                        <Info className="size-7" aria-hidden="true" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                    <DialogDescription className="text-base text-theme-text-soft">
                        {message}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="border-theme-text/10 bg-theme-text/5">
                    <Button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="bg-white text-slate-950 hover:bg-theme-invert/85"
                    >
                        Got it
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

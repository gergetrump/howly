import {Trophy} from 'lucide-react';
import {Progress} from '@/components/ui/progress';

export function DailyProgressCard({ completed = 0, total = 0 }) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-theme-accent to-pink-500 p-6 text-theme-text shadow-lg">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-theme-text/90">Today's Progress</h3>
                    <p className="text-2xl font-bold">
                        {completed} / {total} completed
                    </p>
                </div>
                <Trophy className="h-12 w-12 text-theme-text/80" />
            </div>
            
            <div className="mt-6">
                <Progress 
                    value={percentage} 
                    className="h-1.5 bg-theme-text/15" 
                    indicatorClassName="bg-theme-invert" 
                />
            </div>
        </div>
    );
}

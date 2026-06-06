import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function DailyProgressCard({ completed = 0, total = 0 }) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-white/90">Today's Progress</h3>
                    <p className="text-2xl font-bold">
                        {completed} / {total} completed
                    </p>
                </div>
                <Trophy className="h-12 w-12 text-white/80" />
            </div>
            
            <div className="mt-6">
                <Progress 
                    value={percentage} 
                    className="h-1.5 bg-black/20" 
                    indicatorClassName="bg-white" 
                />
            </div>
        </div>
    );
}

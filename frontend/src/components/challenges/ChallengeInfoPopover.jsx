import { CircleHelp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/* Explains how challenges work. */
export function ChallengeInfoPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-full border border-theme-text/10 bg-theme-surface text-theme-text transition hover:bg-theme-text/20 hover:text-theme-text"
                    aria-label="How do challenges work?"
                >
                    <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                sideOffset={8}
                className="z-[120] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-theme-text/10 bg-theme-bg/95 p-4 text-left text-xs leading-snug text-theme-text shadow-xl shadow-theme-bg/30"
            >
                <p className="text-sm font-bold text-theme-text">How Challenges Work</p>
                <div className="mt-3 space-y-3">
                    <div>
                        <p className="font-semibold text-theme-accent-soft">Find or Get Invited</p>
                        <p>Public Challenges can be found by everyone. Friend Challenges are visible to friends. Direct invitations always work, even for private Challenges.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-theme-accent-soft">Join and Track</p>
                        <p>After joining, the Challenge adds its Habit to your dashboard. Completing that Habit counts as progress for the Challenge.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-theme-accent-soft">Progress and Rewards</p>
                        <p>Each completed Challenge day increases your progress. When the Challenge is over, you can claim Coins if you completed at least one day.</p>
                    </div>
                    <div>
                        <p className="font-semibold text-theme-accent-soft">Leaving</p>
                        <p>Leaving removes the Challenge from your active limit, but you will not receive its reward later.</p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

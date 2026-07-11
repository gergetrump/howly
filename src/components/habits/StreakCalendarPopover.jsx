import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { StreakShieldIcon } from '@/components/brand/StreakShieldIcon.jsx';
import { cn } from '@/lib/utils';
import { getStreakCalendar } from '@/services/streakFreezeApi';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function monthKeyOf(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}


export function StreakCalendarPopover({ children }) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(() => monthKeyOf(new Date()));
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const closeTimer = useRef(null);

    const currentMonthKey = monthKeyOf(new Date());
    const atCurrentMonth = month >= currentMonthKey;

    const load = useCallback(async (targetMonth) => {
        setIsLoading(true);
        setError('');
        try {
            const response = await getStreakCalendar(targetMonth);
            setData(response?.data ?? null);
        } catch (err) {
            setError(err.message || 'Could not load your streak calendar.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const setOpenAndLoad = useCallback((next) => {
        setOpen(next);
        if (next && !data && !isLoading) {
            load(month);
        }
    }, [data, isLoading, load, month]);

    function openNow() {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        setOpenAndLoad(true);
    }

    function closeSoon() {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
        }
        closeTimer.current = setTimeout(() => setOpen(false), 140);
    }

    function goToPreviousMonth() {
        const [year, monthNumber] = month.split('-').map(Number);
        const target = monthKeyOf(new Date(year, monthNumber - 2, 1));
        setMonth(target);
        load(target);
    }

    function goToNextMonth() {
        if (atCurrentMonth) return;
        const [year, monthNumber] = month.split('-').map(Number);
        const target = monthKeyOf(new Date(year, monthNumber, 1));
        setMonth(target);
        load(target);
    }

    const streak = data?.streak ?? 0;
    // Best is the all-time record, so it can never be below the current streak (a never-broken
    // streak IS the record). Clamp defensively — also keeps it correct if the stored best lags.
    const bestStreak = Math.max(data?.bestStreak ?? 0, streak);
    const leadingBlanks = data ? Math.max(0, data.firstWeekday - 1) : 0;

    return (
        <Popover open={open} onOpenChange={setOpenAndLoad}>
            <PopoverTrigger asChild>
                <div onMouseEnter={openNow} onMouseLeave={closeSoon}>
                    {children}
                </div>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                onMouseEnter={openNow}
                onMouseLeave={closeSoon}
                onOpenAutoFocus={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => event.preventDefault()}
                className="z-[100] w-[320px] rounded-2xl border-theme-accent/20 bg-theme-surface p-4 text-theme-text shadow-xl"
            >
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-theme-gold">
                        <span aria-hidden="true">🔥</span>
                        {streak} day streak
                    </span>
                    <span className="shrink-0 text-xs font-medium text-theme-text-muted">
                        Longest streak{' '}
                        <span className="font-semibold text-theme-gold">{bestStreak}</span>
                    </span>
                </div>

                <div className="mb-3 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={goToPreviousMonth}
                        aria-label="Previous month"
                        className="grid size-7 place-items-center rounded-lg border border-theme-text/15 text-theme-text-soft transition-colors hover:bg-theme-text/10"
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <span className="text-sm font-medium text-theme-text">
                        {data?.monthLabel ?? ' '}
                    </span>
                    <button
                        type="button"
                        onClick={goToNextMonth}
                        disabled={atCurrentMonth}
                        aria-label="Next month"
                        className={cn(
                            'grid size-7 place-items-center rounded-lg border border-theme-text/15 text-theme-text-soft transition-colors hover:bg-theme-text/10',
                            atCurrentMonth && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                        )}
                    >
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-theme-text-muted">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Loading
                    </div>
                ) : error ? (
                    <p className="rounded-xl border border-theme-danger/30 bg-theme-danger/10 px-3 py-2 text-sm text-theme-danger">
                        {error}
                    </p>
                ) : data ? (
                    <>
                        <div className="mb-1.5 grid grid-cols-7 gap-1.5">
                            {WEEKDAYS.map((weekday) => (
                                <span key={weekday} className="text-center text-[10px] text-theme-text-muted">
                                    {weekday}
                                </span>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                            {Array.from({ length: leadingBlanks }).map((_, index) => (
                                <span key={`blank-${index}`} aria-hidden="true" />
                            ))}
                            {data.days.map((day) => {
                                const dayNumber = Number(day.date.split('-')[2]);
                                const title = `${day.date}${day.perfect ? ' · perfect day' : ''}${day.shieldUsed ? ' · shield used' : ''}`;

                                return (
                                    <div
                                        key={day.date}
                                        title={title}
                                        className={cn(
                                            'flex min-h-[34px] flex-col justify-between rounded-md border p-1',
                                            day.isToday
                                                ? 'border-2 border-theme-accent'
                                                : day.perfect
                                                    ? 'border-theme-gold/30 bg-theme-gold/10'
                                                    : day.shieldUsed
                                                        ? 'border-theme-accent/30 bg-theme-accent/10'
                                                        : 'border-theme-text/10',
                                            day.isFuture && 'opacity-40',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'text-[10px] leading-none',
                                                day.isToday
                                                    ? 'font-semibold text-theme-accent'
                                                    : day.perfect
                                                        ? 'text-theme-gold'
                                                        : 'text-theme-text-muted',
                                            )}
                                        >
                                            {dayNumber}
                                        </span>
                                        <span className="flex justify-end">
                                            {day.perfect ? (
                                                <span aria-hidden="true" className="text-xs leading-none">🔥</span>
                                            ) : day.shieldUsed ? (
                                                <StreakShieldIcon className="h-3.5 w-3.5" />
                                            ) : null}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-theme-text-muted">
                            <span className="flex items-center gap-1">
                                <span aria-hidden="true">🔥</span> Perfect day
                            </span>
                            <span className="flex items-center gap-1">
                                <StreakShieldIcon className="h-3 w-3" /> Shield used
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="inline-block size-2.5 rounded-full border-2 border-theme-accent" aria-hidden="true" />
                                Today
                            </span>
                        </div>
                    </>
                ) : null}
            </PopoverContent>
        </Popover>
    );
}

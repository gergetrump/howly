import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CompanionAvatar } from '@/components/brand/CompanionAvatar';
import { useAuth } from '@/context/authContext';
import { getMyInventory } from '@/services/inventoryApi';
import { getEquippedItemConfigsFromInventory } from '@/lib/inventoryItems';
import { cn } from '@/lib/utils';

const ROLL_START_MS = 320;
const ROW_HEIGHT = 72;

const CONFETTI_COLORS = ['#f5c451', '#a855f7', '#34d399', '#f472b6', '#38bdf8', '#fb7185', '#fbbf24'];

const CONFETTI = Array.from({ length: 30 }, (_, index) => ({
    dx: ((index * 53) % 260) - 130,
    dy: 210 + ((index * 29) % 140),
    spin: (((index * 97) % 8) - 4) * 200,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delay: (index % 10) * 0.05,
    duration: 1.6 + ((index * 13) % 10) / 10,
    size: 6 + (index % 3) * 2,
    round: index % 2 === 0,
}));

export function StreakCelebrationModal() {
    const { companion } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [range, setRange] = useState({ from: 0, to: 0 });
    const [isRolled, setIsRolled] = useState(false);
    const [outfit, setOutfit] = useState([]);
    const timersRef = useRef([]);

    useEffect(() => {
        function clearTimers() {
            timersRef.current.forEach((id) => clearTimeout(id));
            timersRef.current = [];
        }

        function handleStreakUp(event) {
            const from = Number(event.detail?.from ?? 0);
            const to = Number(event.detail?.to ?? from);

            if (!Number.isFinite(to) || to <= from) {
                return;
            }

            clearTimers();
            setRange({ from, to });
            setIsRolled(false);
            setIsOpen(true);
            timersRef.current.push(setTimeout(() => setIsRolled(true), ROLL_START_MS));

            getMyInventory()
                .then((inventory) => setOutfit(getEquippedItemConfigsFromInventory(inventory)))
                .catch(() => {});
        }

        window.addEventListener('howly:overall-streak-up', handleStreakUp);

        return () => {
            window.removeEventListener('howly:overall-streak-up', handleStreakUp);
            clearTimers();
        };
    }, []);

    if (!isOpen) {
        return null;
    }

    const numbers = [];
    for (let value = range.from; value <= range.to; value += 1) {
        numbers.push(value);
    }
    const steps = Math.max(0, numbers.length - 1);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Perfect day, ${range.to} day streak`}
                className="howly-celebrate-in relative w-full max-w-xs overflow-hidden rounded-3xl border border-theme-gold/30 bg-theme-surface p-8 text-center shadow-2xl shadow-black/50"
            >
                <div className="mx-auto mb-1 w-24">
                    <CompanionAvatar
                        type={companion?.type}
                        name={companion?.name}
                        size="sm"
                        equippedItemConfigs={outfit}
                    />
                </div>

                <p className="text-sm font-semibold uppercase tracking-wide text-theme-text-soft">Perfect day</p>

                <div className="mt-2 flex justify-center">
                    <div className="overflow-hidden" style={{ height: ROW_HEIGHT }}>
                        <div
                            className="howly-roll"
                            style={{ transform: `translateY(-${(isRolled ? steps : 0) * ROW_HEIGHT}px)` }}
                        >
                            {numbers.map((value) => (
                                <div
                                    key={value}
                                    className="flex items-center justify-center text-6xl font-bold leading-none tabular-nums text-theme-gold"
                                    style={{ height: ROW_HEIGHT }}
                                >
                                    {value}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="mt-2 text-base font-semibold text-theme-text-soft">day streak</p>

                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                        'mt-7 w-full rounded-xl bg-theme-accent px-4 py-2.5 text-sm font-semibold text-theme-on-accent transition',
                        'hover:bg-theme-accent-strong',
                    )}
                >
                    Nice!
                </button>

                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    {CONFETTI.map((piece, index) => (
                        <span
                            key={index}
                            className="howly-confetti-piece absolute left-1/2 top-7"
                            style={{
                                width: piece.size,
                                height: piece.size,
                                backgroundColor: piece.color,
                                borderRadius: piece.round ? '9999px' : '2px',
                                '--dx': `${piece.dx}px`,
                                '--dy': `${piece.dy}px`,
                                '--spin': `${piece.spin}deg`,
                                '--dur': `${piece.duration}s`,
                                '--delay': `${piece.delay}s`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}

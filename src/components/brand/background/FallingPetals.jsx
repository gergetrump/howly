import { useMemo } from 'react';

// Gently falling cherry blossom petals (Sakura Light theme only)
export function FallingPetals({ count = 18 }) {
    const petals = useMemo(() => {
        const generated = [];
        for (let i = 0; i < count; i++) {
            generated.push({
                left: `${Math.random() * 100}%`,
                size: Math.random() * 6 + 5,
                duration: Math.random() * 8 + 9,
                delay: Math.random() * 12,
                drift: Math.random() * 60 - 30,
                opacity: Math.random() * 0.4 + 0.4,
            });
        }
        return generated;
    }, [count]);

    return (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
            {petals.map((petal, i) => (
                <span
                    key={i}
                    className="howly-petal absolute"
                    style={{
                        left: petal.left,
                        width: `${petal.size}px`,
                        height: `${petal.size * 0.8}px`,
                        opacity: petal.opacity,
                        animationDuration: `${petal.duration}s`,
                        animationDelay: `${petal.delay}s`,
                        '--petal-drift': `${petal.drift}px`,
                    }}
                />
            ))}
        </div>
    );
}

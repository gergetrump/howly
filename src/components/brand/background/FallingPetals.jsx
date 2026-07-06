import { useMemo } from 'react';
import Flower from '@/components/brand/items/Flower';

// Gently falling cherry blossom petals + a few whole blossoms (Sakura Light theme only)
export function FallingPetals({ count = 18, flowerCount = 9 }) {
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

    const flowers = useMemo(() => {
        const generated = [];
        for (let i = 0; i < flowerCount; i++) {
            generated.push({
                left: `${Math.random() * 100}%`,
                size: Math.random() * 14 + 15,
                duration: Math.random() * 8 + 13,
                delay: Math.random() * 16,
                drift: Math.random() * 90 - 45,
                opacity: Math.random() * 0.3 + 0.5,
            });
        }
        return generated;
    }, [flowerCount]);

    return (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
            {petals.map((petal, i) => (
                <span
                    key={`petal-${i}`}
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

            {flowers.map((flower, i) => (
                <div
                    key={`flower-${i}`}
                    className="howly-flower-fall absolute"
                    style={{
                        left: flower.left,
                        width: `${flower.size}px`,
                        height: `${flower.size}px`,
                        opacity: flower.opacity,
                        animationDuration: `${flower.duration}s`,
                        animationDelay: `${flower.delay}s`,
                        '--petal-drift': `${flower.drift}px`,
                    }}
                >
                    <Flower color="#F6BBC7" width={flower.size} height={flower.size} />
                </div>
            ))}
        </div>
    );
}

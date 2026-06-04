import { useMemo } from 'react';

export function Starfield() {
    // Generate 150 static stars
    const stars = useMemo(() => {
        const generated = [];
        for (let i = 0; i < 150; i++) {
            generated.push({
                top: `${Math.random() * 60}%`,
                left: `${Math.random() * 100}%`,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.6 + 0.2,
            });
        }
        return generated;
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {stars.map((star, i) => (
                <span
                    key={i}
                    className="absolute"
                    style={{
                        top: star.top,
                        left: star.left,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        opacity: star.opacity,
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        boxShadow: `0 0 ${star.size * 2}px ${star.size}px rgba(255, 255, 255, 0.2)`,
                    }}
                />
            ))}
        </div>
    );
}

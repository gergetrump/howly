export function Tree({
    color = 'var(--color-howly-forest-front)',
    trunkColor = 'var(--color-howly-trunk)',
    width = 100,
    height = 150,
    x = 0,
    y = 0,
    zIndex = 1,
    blossoms = false,
}) {
    return (
        <svg
            className="absolute"
            style={{ left: `${x}%`, bottom: `${y}px`, zIndex, transform: 'translateX(-50%)' }}
            width={width}
            height={height}
            viewBox="0 0 100 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Trunk — visible below canopy */}
            <rect x="44" y="100" width="12" height="60" fill={trunkColor} rx="2" />

            {/* Triangle canopy */}
            <path d="M50 0 L100 120 L0 120 Z" fill={color} />

            {/* Sakura blossoms — tiny five-petal flowers scattered on the canopy */}
            {blossoms ? (
                <g fill="var(--color-howly-blossom)">
                    <Blossom cx={50} cy={24} r={3} />
                    <Blossom cx={38} cy={50} r={2.5} />
                    <Blossom cx={63} cy={56} r={3} />
                    <Blossom cx={28} cy={84} r={2.5} />
                    <Blossom cx={50} cy={78} r={2} />
                    <Blossom cx={73} cy={92} r={3} />
                    <Blossom cx={40} cy={105} r={2.5} />
                    <Blossom cx={60} cy={110} r={2} />
                    <Blossom cx={18} cy={110} r={2} />
                    <Blossom cx={83} cy={112} r={2.5} />
                </g>
            ) : null}
        </svg>
    );
}

// A tiny five-petal blossom built from circles around a center
function Blossom({ cx, cy, r }) {
    const petals = [0, 72, 144, 216, 288].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: cx + Math.cos(rad) * r,
            y: cy + Math.sin(rad) * r,
        };
    });

    return (
        <g opacity="0.9">
            {petals.map((petal, i) => (
                <circle key={i} cx={petal.x} cy={petal.y} r={r * 0.75} />
            ))}
            <circle cx={cx} cy={cy} r={r * 0.5} fill="var(--color-howly-primary)" />
        </g>
    );
}

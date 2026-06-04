export function Tree({ color = 'var(--color-howly-forest-front)', trunkColor = 'var(--color-howly-trunk)', width = 100, height = 150, x = 0, y = 0, zIndex = 1 }) {
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
        </svg>
    );
}

import Flower from '@/components/brand/items/Flower';

const FLOWERS = [
    [32, 24, 9], [54, 22, 8], [72, 30, 9],
    [24, 44, 8], [46, 40, 10], [64, 46, 8],
    [34, 60, 9], [56, 62, 8], [74, 58, 9],
    [28, 76, 8], [48, 80, 9], [66, 82, 8],
    [42, 94, 8],
];

export function SakuraTree({
    color = 'var(--color-howly-forest-front)',
    trunkColor = 'var(--color-howly-trunk)',
    flowerColor = '#F6BBC7',
    width = 100,
    height = 160,
    x = 0,
    y = 0,
    zIndex = 1,
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
            <path d="M46 160 C 45 140 47 122 48 108 L 52 108 C 53 122 55 140 54 160 Z" fill={trunkColor} />
            <path d="M50 114 C 42 108 34 106 27 102" stroke={trunkColor} strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <path d="M50 114 C 58 108 66 106 73 102" stroke={trunkColor} strokeWidth="4.5" fill="none" strokeLinecap="round" />

            <g fill={color}>
                <circle cx="50" cy="54" r="38" />
                <circle cx="26" cy="64" r="26" />
                <circle cx="74" cy="62" r="26" />
                <circle cx="36" cy="34" r="24" />
                <circle cx="64" cy="36" r="24" />
                <circle cx="50" cy="24" r="22" />
                <circle cx="20" cy="82" r="18" />
                <circle cx="80" cy="80" r="18" />
                <circle cx="40" cy="92" r="20" />
                <circle cx="62" cy="94" r="20" />
            </g>

            {FLOWERS.map(([cx, cy, s], index) => (
                <Flower key={index} x={cx - s / 2} y={cy - s / 2} width={s} height={s} color={flowerColor} />
            ))}
        </svg>
    );
}

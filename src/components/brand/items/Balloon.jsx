import { adjustColor } from '@/lib/colorUtils.js';

export function BalloonLayer({ transform = 'translate(1288 1055) scale(1.7) translate(-80 -600)', ...props }) {
    return (
        <g transform={transform}>
            <Balloon floaty {...props} />
        </g>
    );
}

export default function Balloon({ className, color = '#EF5A6F', floaty = false, ...props }) {
    const balloonStroke = adjustColor(color, 2, 'darken');
    const balloonDark = adjustColor(color, 1, 'darken');
    const height = floaty ? 620 : 320;
    const stringPath = floaty
        ? 'M80 162 C 98 262 62 392 80 482 C 94 546 72 576 80 600'
        : 'M80 162 C 94 200 66 244 80 278 C 90 293 76 298 80 302';

    return (
        <svg className={className} width="160" height={height} viewBox={`0 0 160 ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d={stringPath} fill="none" stroke="#A89B8F" strokeWidth="3" strokeLinecap="round" />

            <path
                d="M80 148 C 126 135 140 96 140 64 C 140 28 112 2 80 2 C 48 2 20 28 20 64 C 20 96 34 135 80 148 Z"
                fill={color}
                stroke={balloonStroke}
                strokeWidth="3"
            />
            <path d="M71 145 L89 145 L80 162 Z" fill={balloonDark} stroke={balloonStroke} strokeWidth="2" strokeLinejoin="round" />
            <ellipse cx="55" cy="40" rx="11" ry="18" fill="#FFFFFF" opacity="0.35" transform="rotate(-18 55 40)" />
        </svg>
    );
}

import { adjustColor } from '@/lib/colorUtils.js';

export function SensuFanLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <SensuFan width="248" height="158" {...props} />
        </g>
    );
}

export default function SensuFan({ className,
                                     color = '#F6BBC7',
                                     borderColor = '#FFF0F6',
                                     blossomColor = '#FFF5F9',
                                     rivetColor = '#C9A165',
                                     ...props }) {
    const fanStroke = adjustColor(color, 2, 'darken');
    const rivetStroke = adjustColor(rivetColor, 2, 'darken');

    return (
        <svg className={className} width="248" height="158" viewBox="46 152 248 158" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g transform="translate(170 295)">
                <path d="M0 0 L-112 -60 A128 128 0 0 1 112 -60 Z" fill={color} stroke={fanStroke} strokeWidth="3" strokeLinejoin="round" />
                <path d="M-112 -60 A128 128 0 0 1 112 -60 L92 -34 A96 96 0 0 0 -92 -34 Z" fill={borderColor} stroke={fanStroke} strokeWidth="2.5" />
                <g stroke={fanStroke} strokeWidth="2.5" opacity="0.8">
                    <path d="M0 0 L-74 -104" />
                    <path d="M0 0 L-26 -125" />
                    <path d="M0 0 L26 -125" />
                    <path d="M0 0 L74 -104" />
                </g>
                <g fill={blossomColor} stroke={fanStroke} strokeWidth="1.6">
                    <ellipse cx="-44" cy="-42" rx="7.5" ry="5.5" transform="rotate(-20 -44 -42)" />
                    <ellipse cx="38" cy="-48" rx="7.5" ry="5.5" transform="rotate(25 38 -48)" />
                    <ellipse cx="-4" cy="-78" rx="7.5" ry="5.5" transform="rotate(5 -4 -78)" />
                </g>
                <circle cx="0" cy="0" r="9" fill={rivetColor} stroke={rivetStroke} strokeWidth="2.5" />
            </g>
        </svg>
    );
}

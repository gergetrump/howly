import { adjustColor } from '@/lib/colorUtils.js';

export function DangoSkewerLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <DangoSkewer width="70" height="210" {...props} />
        </g>
    );
}

export default function DangoSkewer({ className,
                                        topColor = '#F6BBC7',
                                        middleColor = '#FFFDF5',
                                        bottomColor = '#BFE0B2',
                                        stickColor = '#C9A165',
                                        ...props }) {
    const topStroke = adjustColor(topColor, 2, 'darken');
    const middleStroke = adjustColor(middleColor, 2, 'darken');
    const bottomStroke = adjustColor(bottomColor, 2, 'darken');

    return (
        <svg className={className} width="70" height="210" viewBox="0 0 70 210" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M35 8 L35 202" stroke={stickColor} strokeWidth="6" strokeLinecap="round" />
            <circle cx="35" cy="45" r="27" fill={topColor} stroke={topStroke} strokeWidth="2.5" />
            <circle cx="35" cy="101" r="27" fill={middleColor} stroke={middleStroke} strokeWidth="2.5" />
            <circle cx="35" cy="157" r="27" fill={bottomColor} stroke={bottomStroke} strokeWidth="2.5" />
            <ellipse cx="26" cy="37" rx="7" ry="4.5" fill={adjustColor(topColor, 1, 'lighten')} transform="rotate(-20 26 37)" />
            <ellipse cx="26" cy="93" rx="7" ry="4.5" fill="#ffffff" transform="rotate(-20 26 93)" />
            <ellipse cx="26" cy="149" rx="7" ry="4.5" fill={adjustColor(bottomColor, 1, 'lighten')} transform="rotate(-20 26 149)" />
        </svg>
    );
}

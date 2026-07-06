import { adjustColor } from '@/lib/colorUtils.js';

export function StrawHatLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <StrawHat width="1430" height="574" {...props} />
        </g>
    );
}

export default function StrawHat({
    className,
    strawColor = '#E8C88A',
    ribbonColor = '#E6947A',
    ...props
}) {
    const strawStroke = adjustColor(strawColor, 2, 'darken');
    const strawShade = adjustColor(strawColor, 1, 'darken');
    const ribbonStroke = adjustColor(ribbonColor, 2, 'darken');

    return (
        <svg className={className} width="1430" height="574" viewBox="0 0 1430 574" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <ellipse cx="715" cy="446" rx="705" ry="122" fill={strawColor} stroke={strawStroke} strokeWidth="5" />

            <ellipse cx="715" cy="446" rx="560" ry="96" fill="none" stroke={strawShade} strokeWidth="3" opacity="0.55" />
            <ellipse cx="715" cy="446" rx="410" ry="70" fill="none" stroke={strawShade} strokeWidth="3" opacity="0.55" />

            <path
                d="M360 404 C360 250 470 196 715 196 C960 196 1070 250 1070 404 Q715 476 360 404 Z"
                fill={strawColor}
                stroke={strawStroke}
                strokeWidth="5"
                strokeLinejoin="round"
            />

            <path d="M470 214 C430 280 424 344 452 420" stroke={strawShade} strokeWidth="3" opacity="0.5" fill="none" />
            <path d="M600 200 C575 272 573 348 588 430" stroke={strawShade} strokeWidth="3" opacity="0.5" fill="none" />
            <path d="M715 196 C712 272 712 350 715 436" stroke={strawShade} strokeWidth="3" opacity="0.5" fill="none" />
            <path d="M830 200 C855 272 857 348 842 430" stroke={strawShade} strokeWidth="3" opacity="0.5" fill="none" />
            <path d="M960 214 C1000 280 1006 344 978 420" stroke={strawShade} strokeWidth="3" opacity="0.5" fill="none" />

            <path
                d="M360 402 Q715 470 1070 402 L1070 424 Q715 494 360 424 Z"
                fill={ribbonColor}
                stroke={ribbonStroke}
                strokeWidth="4"
                strokeLinejoin="round"
            />
            <path
                d="M1006 410 L1096 380 L1082 452 Z"
                fill={ribbonColor}
                stroke={ribbonStroke}
                strokeWidth="4"
                strokeLinejoin="round"
            />
            <circle cx="1012" cy="418" r="13" fill={ribbonColor} stroke={ribbonStroke} strokeWidth="4" />
        </svg>
    );
}

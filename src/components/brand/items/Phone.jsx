const DEFAULT_PHONE_FRAME_COLOR = '#D9D9D9';
const DEFAULT_PHONE_BACKGROUND_COLOR = '#575757';

function darkenColor(hexColor, amount = 0.18) {
    const cleanHex = hexColor.replace('#', '');
    const red = parseInt(cleanHex.slice(0, 2), 16);
    const green = parseInt(cleanHex.slice(2, 4), 16);
    const blue = parseInt(cleanHex.slice(4, 6), 16);
    const darken = (channel) => Math.max(0, Math.round(channel * (1 - amount)));

    return `#${[darken(red), darken(green), darken(blue)]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')}`;
}

export function PhoneLayer({ transform, frameColor, backgroundColor, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Phone width="330" height="404" frameColor={frameColor} backgroundColor={backgroundColor} />
        </g>
    );
}

export default function Phone({
    className,
    width = 320,
    height = 392,
    frameColor = DEFAULT_PHONE_FRAME_COLOR,
    backgroundColor = DEFAULT_PHONE_BACKGROUND_COLOR,
    ...props
}) {
    const frameStrokeColor = darkenColor(frameColor, 0.18);

    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 320 392"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g filter="url(#phone-frame-shadow)">
                <path d="M133.397 26.8392C140.799 12.0163 158.489 6.6169 172.907 14.7793L293.893 83.27C308.312 91.4323 313.999 110.066 306.597 124.888L186.604 365.161C179.201 379.984 161.512 385.383 147.093 377.221L26.1072 308.73C11.6887 300.568 6.00123 281.934 13.4038 267.112L133.397 26.8392Z" fill={frameColor} />
                <path d="M172.014 16.5685L293 85.0593C306.457 92.6775 311.765 110.068 304.856 123.903L184.863 364.175C177.954 378.01 161.444 383.049 147.987 375.431L27.0009 306.941C13.5436 299.322 8.23531 281.931 15.1444 268.097L135.137 27.8245C142.046 13.9898 158.556 8.95035 172.014 16.5685Z" stroke={frameStrokeColor} strokeWidth="4" />
            </g>
            <rect width="167.498" height="243.875" rx="10" transform="matrix(0.870232 0.492642 -0.446787 0.894641 146.386 36.0654)" fill={backgroundColor} />
            <rect width="77.8374" height="9.18359" rx="4.5918" transform="matrix(0.870232 0.492642 -0.446787 0.894641 193.632 40.5635)" fill={backgroundColor} />
            <path d="M105.525 305.081C114.314 310.057 117.995 320.836 113.854 329.129C109.712 337.421 99.26 340.2 90.4713 335.225C81.6824 330.249 78.0006 319.469 82.1419 311.176C86.2832 302.884 96.7362 300.106 105.525 305.081Z" fill={backgroundColor} stroke={frameStrokeColor} />
            <defs>
                <filter id="phone-frame-shadow" x="6.15771" y="6.97363" width="307.685" height="378.053" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_134_469" />
                </filter>
            </defs>
        </svg>
    );
}

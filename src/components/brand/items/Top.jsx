const WOLF_BODY_WIDTH = 1000;
const TOP_WIDTH = 800;
const TOP_HEIGHT = 541;
const TOP_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / TOP_WIDTH) * TOP_HEIGHT;
const DEFAULT_TOP_COLOR = '#F4EFE5';
const DEFAULT_TOP_BUTTON_COLOR = '#B18167';
const DEFAULT_TOP_POCKET_COLOR = '#DDCEAF';

function clampColorChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function darkenColor(hexColor, amount) {
    const normalizedColor = hexColor.replace('#', '');

    if (normalizedColor.length !== 6) {
        return hexColor;
    }

    const channels = normalizedColor.match(/.{2}/g).map((channel) => parseInt(channel, 16));
    const nextChannels = channels.map((channel) => clampColorChannel(channel * (1 - amount)));

    return `#${nextChannels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function TopLayer({ transform, color, buttonColor, pocketColor, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Top
                width={WOLF_BODY_WIDTH}
                height={TOP_HEIGHT_AT_WOLF_WIDTH}
                color={color}
                buttonColor={buttonColor}
                pocketColor={pocketColor}
            />
        </g>
    );
}

export default function Top({
    className,
    color = DEFAULT_TOP_COLOR,
    buttonColor = DEFAULT_TOP_BUTTON_COLOR,
    pocketColor = DEFAULT_TOP_POCKET_COLOR,
    ...props
}) {
    const topStrokeColor = darkenColor(color, 0.15);
    const buttonBorderColor = darkenColor(buttonColor, 0.35);
    const pocketStrokeColor = darkenColor(pocketColor, 0.15);

    return (
        <svg
            className={className}
            width="1043"
            height="541"
            viewBox="0 0 1043 541"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g>
                <g>
                    <g filter="url(#top-filter-shadow)">
                        <path d="M4 122.171C4 64.5177 63.1374 25.7933 115.983 48.8424L482.236 208.587C502.353 217.361 525.191 217.485 545.402 208.93L927.816 47.0619C980.565 24.7345 1039 63.4547 1039 120.734V453C1039 497.183 1003.18 533 959 533H84C39.8172 533 4 497.183 4 453V122.171Z" fill={color} />
                        <path d="M928.4 48.4434C980.16 26.5346 1037.5 64.5291 1037.5 120.734V453C1037.5 496.354 1002.35 531.5 959 531.5H84C40.6457 531.5 5.50001 496.354 5.5 453V122.171C5.50007 65.5987 63.5283 27.6011 115.383 50.2178L481.636 209.962C502.13 218.901 525.397 219.027 545.987 210.312L928.4 48.4434Z" stroke={topStrokeColor} strokeWidth="3" />
                    </g>
                    <path d="M6.64484 135.457C267.031 229.954 463.83 291.715 477.348 347.199" stroke={topStrokeColor} strokeWidth="6" />
                    <path d="M499.938 217.97C560.004 234.194 574.354 253.977 586.187 303.383" stroke={topStrokeColor} strokeWidth="6" />
                    <line x1="478.295" y1="346.644" x2="478.295" y2="533" stroke={topStrokeColor} strokeWidth="6" />
                    <line x1="586.107" y1="301.164" x2="586.107" y2="533" stroke={topStrokeColor} strokeWidth="6" />
                    <path d="M586.188 330.005C757.944 215.77 860.226 199.787 1037.46 135.885" stroke={topStrokeColor} strokeWidth="6" />
                    <path d="M577.668 278.227C645.086 238.743 682.97 230.367 750.473 204.659" stroke={topStrokeColor} strokeWidth="6" />
                    <ellipse cx="529.201" cy="480.31" rx="37.4777" ry="40.488" fill={buttonBorderColor} />
                    <ellipse cx="529.714" cy="479.755" rx="25.6696" ry="27.7315" fill={buttonColor} />
                    <ellipse cx="529.201" cy="378.258" rx="37.4777" ry="40.488" fill={buttonBorderColor} />
                    <ellipse cx="529.714" cy="377.704" rx="25.6696" ry="27.7315" fill={buttonColor} />
                </g>
                <g>
                    <g>
                        <g>
                            <mask id="top-left-sleeve-mask" fill="white">
                                <path d="M282.303 364.392C304.395 364.392 322.303 382.301 322.303 404.392V445.302C322.303 467.393 304.395 485.302 282.303 485.302H157.973C135.882 485.302 117.973 467.393 117.973 445.302V404.392C117.973 382.301 135.882 364.392 157.973 364.392H282.303Z" />
                            </mask>
                            <path d="M282.303 364.392C304.395 364.392 322.303 382.301 322.303 404.392V445.302C322.303 467.393 304.395 485.302 282.303 485.302H157.973C135.882 485.302 117.973 467.393 117.973 445.302V404.392C117.973 382.301 135.882 364.392 157.973 364.392H282.303Z" fill={pocketColor} />
                            <path d="M322.303 404.392H325.303V404.392H322.303ZM117.973 404.392H114.973V404.392H117.973ZM157.973 364.392V361.392V361.392V364.392ZM282.303 364.392V367.392C302.738 367.392 319.303 383.958 319.303 404.392H322.303H325.303C325.303 380.644 306.052 361.392 282.303 361.392V364.392ZM322.303 404.392H319.303V445.302H322.303H325.303V404.392H322.303ZM322.303 445.302H319.303C319.303 465.736 302.738 482.302 282.303 482.302V485.302V488.302C306.052 488.302 325.303 469.05 325.303 445.302H322.303ZM282.303 485.302V482.302H157.973V485.302V488.302H282.303V485.302ZM157.973 485.302V482.302C137.539 482.302 120.973 465.736 120.973 445.302H117.973H114.973C114.973 469.05 134.225 488.302 157.973 488.302V485.302ZM117.973 445.302H120.973V404.392H117.973H114.973V445.302H117.973ZM117.973 404.392H120.973C120.973 383.958 137.539 367.392 157.973 367.392V364.392V361.392C134.225 361.392 114.973 380.644 114.973 404.392H117.973ZM157.973 364.392V367.392H282.303V364.392V361.392H157.973V364.392Z" fill={pocketStrokeColor} mask="url(#top-left-sleeve-mask)" />
                        </g>
                        <rect x="119.669" y="365.892" width="201.135" height="39.0555" fill={pocketStrokeColor} stroke={pocketStrokeColor} strokeWidth="3" />
                        <path d="M320.804 365.892V404.948H119.669V365.892H320.804Z" fill={pocketStrokeColor} stroke={pocketStrokeColor} strokeWidth="3" />
                    </g>
                </g>
                <g>
                    <g>
                        <g>
                            <mask id="top-right-sleeve-mask" fill="white">
                                <path d="M906.589 364.392C928.68 364.392 946.589 382.301 946.589 404.392V445.302C946.589 467.393 928.68 485.302 906.589 485.302H782.259C760.168 485.302 742.259 467.393 742.259 445.302V404.392C742.259 382.301 760.168 364.392 782.259 364.392H906.589Z" />
                            </mask>
                            <path d="M906.589 364.392C928.68 364.392 946.589 382.301 946.589 404.392V445.302C946.589 467.393 928.68 485.302 906.589 485.302H782.259C760.168 485.302 742.259 467.393 742.259 445.302V404.392C742.259 382.301 760.168 364.392 782.259 364.392H906.589Z" fill={pocketColor} />
                            <path d="M946.589 404.392H949.589V404.392H946.589ZM742.259 404.392H739.259V404.392H742.259ZM782.259 364.392V361.392V361.392V364.392ZM906.589 364.392V367.392C927.024 367.392 943.589 383.958 943.589 404.392H946.589H949.589C949.589 380.644 930.337 361.392 906.589 361.392V364.392ZM946.589 404.392H943.589V445.302H946.589H949.589V404.392H946.589ZM946.589 445.302H943.589C943.589 465.736 927.024 482.302 906.589 482.302V485.302V488.302C930.337 488.302 949.589 469.05 949.589 445.302H946.589ZM906.589 485.302V482.302H782.259V485.302V488.302H906.589V485.302ZM782.259 485.302V482.302C761.824 482.302 745.259 465.736 745.259 445.302H742.259H739.259C739.259 469.05 758.511 488.302 782.259 488.302V485.302ZM742.259 445.302H745.259V404.392H742.259H739.259V445.302H742.259ZM742.259 404.392H745.259C745.259 383.958 761.824 367.392 782.259 367.392V364.392V361.392C758.511 361.392 739.259 380.644 739.259 404.392H742.259ZM782.259 364.392V367.392H906.589V364.392V361.392H782.259V364.392Z" fill={pocketStrokeColor} mask="url(#top-right-sleeve-mask)" />
                        </g>
                        <rect x="743.955" y="365.892" width="201.135" height="39.0555" fill={pocketStrokeColor} stroke={pocketStrokeColor} strokeWidth="3" />
                        <path d="M945.089 365.892V404.948H743.955V365.892H945.089Z" fill={pocketStrokeColor} stroke={pocketStrokeColor} strokeWidth="3" />
                    </g>
                </g>
            </g>
            <defs>
                <filter id="top-filter-shadow" x="0" y="40.649" width="1043" height="500.351" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_110_44" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_110_44" result="shape" />
                </filter>
            </defs>
        </svg>
    );
}

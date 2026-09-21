import { darkenColor, lightenColor } from '@/lib/colorUtils';
import TopWarm from './TopWarm';

const WOLF_BODY_WIDTH = 1250;
const OCEAN_TOP_WIDTH = 1289;
const OCEAN_TOP_HEIGHT = 541;
const OCEAN_TOP_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / OCEAN_TOP_WIDTH) * OCEAN_TOP_HEIGHT;
const DEFAULT_OCEAN_TOP_COLOR = '#123A4A';
const DEFAULT_OCEAN_TOP_WAVE_COLOR = '#38BDF8';
const DEFAULT_OCEAN_TOP_POCKET_COLOR = '#2DD4BF';
const DEFAULT_OCEAN_TOP_BUTTON_COLOR = '#DDF7FF';

export function OceanTopLayer({ transform, color, waveColor, pocketColor, buttonColor, ...props }) {
    return (
        <g transform={transform} {...props}>
            <OceanTop
                width={WOLF_BODY_WIDTH}
                height={OCEAN_TOP_HEIGHT_AT_WOLF_WIDTH}
                color={color}
                waveColor={waveColor}
                pocketColor={pocketColor}
                buttonColor={buttonColor}
            />
        </g>
    );
}

export default function OceanTop({
    className,
    color = DEFAULT_OCEAN_TOP_COLOR,
    waveColor = DEFAULT_OCEAN_TOP_WAVE_COLOR,
    pocketColor = DEFAULT_OCEAN_TOP_POCKET_COLOR,
    buttonColor = DEFAULT_OCEAN_TOP_BUTTON_COLOR,
    ...props
}) {
    const deepWaveColor = darkenColor(waveColor, 0.22);
    const glowColor = lightenColor(waveColor, 0.24);
    const pocketAccentColor = lightenColor(pocketColor, 0.2);

    return (
        <svg
            className={className}
            width="1289"
            height="541"
            viewBox="0 0 1289 541"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <TopWarm
                width={OCEAN_TOP_WIDTH}
                height={OCEAN_TOP_HEIGHT}
                color={color}
                buttonColor={buttonColor}
                pocketColor={pocketColor}
            />

            <g transform="translate(0 330)">
                <path
                    d="M146 161C235 185 306 189 394 162C486 134 555 135 643 165C735 197 812 196 908 164C1009 131 1087 137 1165 169"
                    stroke={waveColor}
                    strokeWidth="22"
                    strokeLinecap="round"
                    opacity="0.82"
                />
                <path
                    d="M153 193C238 217 316 219 404 190C496 160 564 162 651 193C742 226 820 225 916 192C1016 158 1089 164 1154 196"
                    stroke={deepWaveColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    opacity="0.72"
                />
            </g>
            <path
                d="M257 417C298 438 342 439 384 418"
                stroke={pocketAccentColor}
                strokeWidth="11"
                strokeLinecap="round"
                opacity="0.72"
            />
            <path
                d="M906 417C947 438 991 439 1033 418"
                stroke={pocketAccentColor}
                strokeWidth="11"
                strokeLinecap="round"
                opacity="0.72"
            />
            <circle cx="662" cy="378" r="14" fill={glowColor} opacity="0.9" />
            <circle cx="662" cy="480" r="14" fill={glowColor} opacity="0.9" />
        </svg>
    );
}

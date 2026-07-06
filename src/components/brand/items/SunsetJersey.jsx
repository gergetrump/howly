import Jersie from './Jersie';

const WOLF_BODY_WIDTH = 1300;
const JERSIE_WIDTH = 1230;
const JERSIE_HEIGHT = 550;
const JERSIE_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / JERSIE_WIDTH) * JERSIE_HEIGHT;
const DEFAULT_SUNSET_JERSEY_COLOR = '#3A2433';
const DEFAULT_SUNSET_JERSEY_LINE = '#FB923C';
const DEFAULT_SUNSET_JERSEY_TEXT_COLOR = '#FFE8B6';
const DEFAULT_SUNSET_JERSEY_TEXT = 'HOWLY';

export function SunsetJerseyLayer({ transform, ...props }) {
    return (
        <g transform={transform}>
            <SunsetJersey
                width={WOLF_BODY_WIDTH}
                height={JERSIE_HEIGHT_AT_WOLF_WIDTH}
                {...props}
            />
        </g>
    );
}

export default function SunsetJersey({
    className,
    color = DEFAULT_SUNSET_JERSEY_COLOR,
    line = DEFAULT_SUNSET_JERSEY_LINE,
    textColor = DEFAULT_SUNSET_JERSEY_TEXT_COLOR,
    text = DEFAULT_SUNSET_JERSEY_TEXT,
    ...props
}) {
    return (
        <svg
            className={className}
            width="1297"
            height="523"
            viewBox="0 0 1297 523"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <Jersie
                width="1297"
                height="523"
                color={color}
                line={line}
                textColor={textColor}
                text={text}
            />

            <g transform="translate(0 16)">
                <circle cx="648" cy="342" r="32" fill={line} opacity="0.9" />
                <path
                    d="M600 348H696"
                    stroke={color}
                    strokeWidth="9"
                    strokeLinecap="round"
                    opacity="0.85"
                />
                <path
                    d="M574 374C616 391 681 391 723 374"
                    stroke={textColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.78"
                />
                <path
                    d="M594 397C628 409 670 409 704 397"
                    stroke={line}
                    strokeWidth="7"
                    strokeLinecap="round"
                    opacity="0.72"
                />
            </g>
        </svg>
    );
}

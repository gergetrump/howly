import { darkenColor } from '@/lib/colorUtils';

const WOLF_BODY_WIDTH = 1200;
const HOODIE_NEW_WIDTH = 1211;
const HOODIE_NEW_HEIGHT = 578;
const HOODIE_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / HOODIE_NEW_WIDTH) * HOODIE_NEW_HEIGHT;
const DEFAULT_HOODIE_COLOR = '#C66E6E';
const DEFAULT_HOODIE_STRING_COLOR = '#DADADA';
const DEFAULT_HOODIE_TEXT_COLOR = '#FFFFFF';
const DEFAULT_HOODIE_TEXT = 'HOWLY';
const MIN_HOODIE_TEXT_WIDTH = 330;
const MAX_HOODIE_TEXT_WIDTH = 760;
const HOODIE_TEXT_WIDTH_PER_EXTRA_CHARACTER = 28;

function getHoodieTextWidth(text) {
    const extraCharacters = Math.max(0, text.length - DEFAULT_HOODIE_TEXT.length);

    return Math.min(
        MAX_HOODIE_TEXT_WIDTH,
        MIN_HOODIE_TEXT_WIDTH + extraCharacters * HOODIE_TEXT_WIDTH_PER_EXTRA_CHARACTER,
    );
}

export function HoodieLayer({ transform, color, stringColor, textColor, text, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Hoodie
                width={WOLF_BODY_WIDTH}
                height={HOODIE_HEIGHT_AT_WOLF_WIDTH}
                color={color}
                stringColor={stringColor}
                textColor={textColor}
                text={text}
            />
        </g>
    );
}

export default function Hoodie({
    className,
    color = DEFAULT_HOODIE_COLOR,
    stringColor = DEFAULT_HOODIE_STRING_COLOR,
    textColor = DEFAULT_HOODIE_TEXT_COLOR,
    text = DEFAULT_HOODIE_TEXT,
    ...props
}) {
    const hoodieColor = color;
    const hoodieShadowColor = darkenColor(hoodieColor, 0.16);
    const hoodieSeamColor = darkenColor(hoodieColor, 0.08);
    const hoodieText = text?.trim() || DEFAULT_HOODIE_TEXT;
    const hoodieTextWidth = getHoodieTextWidth(hoodieText);

    return (
        <svg
            className={className}
            width="1211"
            height="578"
            viewBox="0 0 1211 578"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M79 172.219C79 102.698 148.186 54.39 213.451 78.3412L574.218 210.736C596.66 218.972 621.311 218.895 643.703 210.52L993.967 79.5077C1059.33 55.0597 1129 103.385 1129 173.17V475C1129 530.228 1084.23 575 1029 575H179C123.772 575 79 530.228 79 475V172.219Z" fill={hoodieColor} />
            <g>
                <path d="M366.5 573.5V504.5C418.985 490.726 439.74 471.757 456 411H769C785.26 471.757 806.015 490.726 858.5 504.5V573.5" stroke={hoodieShadowColor} strokeWidth="8" />
            </g>
            <text
                x="612"
                y="342"
                fill={textColor}
                fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="52"
                fontWeight="700"
                letterSpacing="3"
                textAnchor="middle"
                textLength={hoodieText.length > DEFAULT_HOODIE_TEXT.length ? hoodieTextWidth : undefined}
                lengthAdjust="spacingAndGlyphs"
            >
                {hoodieText}
            </text>
            <ellipse cx="1108.13" cy="65.0712" rx="83.5" ry="34.0527" transform="rotate(-24 1108.13 65.0712)" fill={hoodieColor} />
            <ellipse cx="1120.13" cy="98.0712" rx="83.5" ry="34.0527" transform="rotate(-24 1120.13 98.0712)" fill={hoodieColor} />
            <ellipse cx="1119.09" cy="138.175" rx="83.5" ry="39.0581" transform="rotate(-5 1119.09 138.175)" fill={hoodieColor} />
            <rect x="1083.35" y="40" width="100" height="100" transform="rotate(66 1083.35 40)" fill={hoodieColor} />
            <ellipse cx="83.5" cy="34.0527" rx="83.5" ry="34.0527" transform="matrix(-0.913545 -0.406737 -0.406737 0.913545 192.263 68.925)" fill={hoodieColor} />
            <ellipse cx="83.5" cy="34.0527" rx="83.5" ry="34.0527" transform="matrix(-0.913545 -0.406737 -0.406737 0.913545 180.263 101.925)" fill={hoodieColor} />
            <ellipse cx="83.5" cy="39.0581" rx="83.5" ry="39.0581" transform="matrix(-0.996195 -0.0871557 -0.0871557 0.996195 177.759 107.543)" fill={hoodieColor} />
            <rect width="100" height="100" transform="matrix(-0.406737 0.913545 0.913545 0.406737 126.909 41)" fill={hoodieColor} />
            <g>
                <path d="M84 177L531 259" stroke={hoodieSeamColor} strokeWidth="6" strokeLinecap="round" />
            </g>
            <g>
                <path d="M1124 177L684 259" stroke={hoodieSeamColor} strokeWidth="6" strokeLinecap="round" />
            </g>
            <g>
                <path d="M45.4348 106L393.339 234.036" stroke={hoodieSeamColor} strokeWidth="6" strokeLinecap="round" />
            </g>
            <g>
                <path d="M1171.6 104L974 202" stroke={hoodieSeamColor} strokeWidth="6" strokeLinecap="round" />
            </g>
            <g>
                <path d="M35.6932 57L255 145" stroke={hoodieSeamColor} strokeWidth="6" strokeLinecap="round" />
            </g>
            <g>
                <path d="M1177.13 57L942 154" stroke={hoodieSeamColor} strokeWidth="6" strokeLinecap="round" />
            </g>
            <line x1="793" y1="190" x2="793" y2="326" stroke={stringColor} strokeWidth="14" strokeLinecap="round" />
            <circle cx="793" cy="298" r="15" fill={stringColor} />
            <line x1="432" y1="190" x2="432" y2="326" stroke={stringColor} strokeWidth="14" strokeLinecap="round" />
            <circle cx="432" cy="298" r="14.5" fill={stringColor} stroke={stringColor} />
            <defs>
            </defs>
        </svg>
    );
}

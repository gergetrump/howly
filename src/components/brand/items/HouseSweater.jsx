import { useId } from 'react';
import { darkenColor } from '@/lib/colorUtils';

const WOLF_BODY_WIDTH = 1300;
const SWEATER_WIDTH = 1230;
const SWEATER_HEIGHT = 550;
const SWEATER_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / SWEATER_WIDTH) * SWEATER_HEIGHT;

const BODY_PATH = 'M194.5 4C232.048 4 289.967 16.9476 298.446 50.4902L403.027 95.9131C411.304 99.5079 420.03 101.966 428.966 103.22L639.562 132.775C651.675 134.475 663.998 133.939 675.918 131.191L894.26 80.8682C899.412 79.6807 904.461 78.0864 909.361 76.1006L1011.44 34.7305C1012.08 34.4704 1012.72 34.2184 1013.37 33.9727C1033.23 12.6129 1077.39 4.00586 1108 4.00586C1126.94 4.00586 1141.6 7.3016 1151.84 14.874C1158.14 17.6565 1164.25 21.5485 1169.99 26.5908H1169.99L1292.86 134.534L1206.83 288.694L1149 237.893V419C1149 474.228 1104.23 519 1049 519H247.325C191.582 519 146.6 473.422 147.334 417.684L149.702 237.739L90.0361 288.695L4 138.836L126.872 33.9023H126.873C131.64 29.8314 136.66 26.5299 141.835 23.9785C151.545 9.87969 169.198 4 194.5 4Z';
const COLLAR_LEFT_PATH = 'M270 72.4105V25.1387C411.341 76.7008 523.323 102.079 630 104.228L651 157.503C535.06 156.806 418.575 128.684 270 72.4105Z';
const COLLAR_RIGHT_PATH = 'M1032 71.8548V24.583C890.659 76.1452 778.677 101.524 672 103.673L651 156.948C766.94 156.251 883.425 128.128 1032 71.8548Z';

const KNIT_RIB_XS = Array.from({ length: 29 }, (_, index) => 90 + index * 40);
const HEM_TICK_XS = Array.from({ length: 27 }, (_, index) => 160 + index * 38);

function HouseSweaterBase({ className, body, trim, accent, crestLetter, crestText, ...props }) {
    const rawId = useId();
    const clipId = `house-sweater-clip-${rawId}`;
    const bodyStroke = darkenColor(body, 0.22);
    const bodyRib = darkenColor(body, 0.12);
    const trimStroke = darkenColor(trim, 0.24);
    const shield = darkenColor(body, 0.34);

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
            <defs>
                <clipPath id={clipId}>
                    <path d={BODY_PATH} />
                </clipPath>
            </defs>

            <path d={BODY_PATH} fill={body} />

            <g clipPath={`url(#${clipId})`}>
                {KNIT_RIB_XS.map((x) => (
                    <line key={x} x1={x} y1="0" x2={x} y2="523" stroke={bodyRib} strokeWidth="4" opacity="0.45" />
                ))}

                <line x1="39" y1="117" x2="117" y2="253" stroke={trim} strokeWidth="28" strokeLinecap="round" />
                <line x1="39" y1="117" x2="117" y2="253" stroke={accent} strokeWidth="9" strokeLinecap="round" />
                <line x1="1261" y1="114" x2="1180" y2="255" stroke={trim} strokeWidth="28" strokeLinecap="round" />
                <line x1="1261" y1="114" x2="1180" y2="255" stroke={accent} strokeWidth="9" strokeLinecap="round" />

                <rect x="120" y="450" width="1060" height="92" fill={trim} />
                <rect x="120" y="436" width="1060" height="12" fill={accent} />
                {HEM_TICK_XS.map((x) => (
                    <line key={x} x1={x} y1="450" x2={x} y2="523" stroke={trimStroke} strokeWidth="4" opacity="0.55" />
                ))}
            </g>

            <path d={BODY_PATH} fill="none" stroke={bodyStroke} strokeWidth="5" />

            <path d={COLLAR_LEFT_PATH} fill={trim} stroke={trimStroke} strokeWidth="4" />
            <path d={COLLAR_RIGHT_PATH} fill={trim} stroke={trimStroke} strokeWidth="4" />
            <path d="M300 96 L651 153 L992 94" fill="none" stroke={accent} strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />

            <g transform="translate(648 300)">
                <path
                    d="M-62 -72 Q-62 -80 -54 -80 H54 Q62 -80 62 -72 V10 C62 46 34 66 0 84 C-34 66 -62 46 -62 10 Z"
                    fill={shield}
                    stroke={trim}
                    strokeWidth="6"
                    strokeLinejoin="round"
                />
                <text
                    x="0"
                    y="6"
                    fill={crestText}
                    fontFamily="Georgia, 'Times New Roman', serif"
                    fontSize="92"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="central"
                >
                    {crestLetter}
                </text>
            </g>
        </svg>
    );
}

export function GryffindorSweater(props) {
    return <HouseSweaterBase body="#8f1d1d" trim="#d3a625" accent="#f4d879" crestLetter="G" crestText="#f6dc8a" {...props} />;
}

export function GryffindorSweaterLayer({ transform, ...props }) {
    return (
        <g transform={transform}>
            <GryffindorSweater width={WOLF_BODY_WIDTH} height={SWEATER_HEIGHT_AT_WOLF_WIDTH} {...props} />
        </g>
    );
}

export function SlytherinSweater(props) {
    return <HouseSweaterBase body="#1a5336" trim="#b9bec4" accent="#e6eaee" crestLetter="S" crestText="#e8ebef" {...props} />;
}

export function SlytherinSweaterLayer({ transform, ...props }) {
    return (
        <g transform={transform}>
            <SlytherinSweater width={WOLF_BODY_WIDTH} height={SWEATER_HEIGHT_AT_WOLF_WIDTH} {...props} />
        </g>
    );
}

export function RavenclawSweater(props) {
    return <HouseSweaterBase body="#21316b" trim="#b0854a" accent="#d9b982" crestLetter="R" crestText="#dcbf8c" {...props} />;
}

export function RavenclawSweaterLayer({ transform, ...props }) {
    return (
        <g transform={transform}>
            <RavenclawSweater width={WOLF_BODY_WIDTH} height={SWEATER_HEIGHT_AT_WOLF_WIDTH} {...props} />
        </g>
    );
}

export function HufflepuffSweater(props) {
    return <HouseSweaterBase body="#e3ab1f" trim="#35302a" accent="#5b544b" crestLetter="H" crestText="#f4c430" {...props} />;
}

export function HufflepuffSweaterLayer({ transform, ...props }) {
    return (
        <g transform={transform}>
            <HufflepuffSweater width={WOLF_BODY_WIDTH} height={SWEATER_HEIGHT_AT_WOLF_WIDTH} {...props} />
        </g>
    );
}

import { adjustColor } from '@/lib/colorUtils.js';

export function ShellCrownLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <ShellCrown width="950" height="340" {...props} />
        </g>
    );
}

function Scallop({ x, y, scale = 1, rotate = 0, shellColor, shellStroke }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${rotate})`}>
            <path
                d="M0 4 L-34 -42 Q-25.5 -54 -17 -42 Q-8.5 -54 0 -42 Q8.5 -54 17 -42 Q25.5 -54 34 -42 Z"
                fill={shellColor}
                stroke={shellStroke}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <line x1="0" y1="2" x2="-26" y2="-44" stroke={shellStroke} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="2" x2="-13" y2="-47" stroke={shellStroke} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="2" x2="0" y2="-48" stroke={shellStroke} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="2" x2="13" y2="-47" stroke={shellStroke} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="2" x2="26" y2="-44" stroke={shellStroke} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="0" cy="2" r="4.5" fill={shellStroke} />
        </g>
    );
}

function Starfish({ x, y, scale = 1, starColor, starStroke }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <path
                d="M0 -34 L8.8 -12.1 L32.3 -10.5 L14.3 4.6 L20 27.5 L0 15 L-20 27.5 L-14.3 4.6 L-32.3 -10.5 L-8.8 -12.1 Z"
                fill={starColor}
                stroke={starStroke}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <circle cx="0" cy="-19" r="2.4" fill={starStroke} />
            <circle cx="15" cy="-2" r="2.4" fill={starStroke} />
            <circle cx="9" cy="15" r="2.4" fill={starStroke} />
            <circle cx="-9" cy="15" r="2.4" fill={starStroke} />
            <circle cx="-15" cy="-2" r="2.4" fill={starStroke} />
            <circle cx="0" cy="-1" r="3" fill={starStroke} />
        </g>
    );
}

function Pearl({ x, y, r = 9, pearlColor, pearlStroke }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <circle r={r} fill={pearlColor} stroke={pearlStroke} strokeWidth="2.5" />
            <circle cx={-r * 0.32} cy={-r * 0.32} r={r * 0.28} fill="#FFFFFF" opacity="0.85" />
        </g>
    );
}

export default function ShellCrown({
    className,
    shellColor = '#F6CDBA',
    starfishColor = '#E8895A',
    pearlColor = '#FBF4EC',
    bandColor = '#7FB8AE',
    ...props
}) {
    const shellStroke = adjustColor(shellColor, 2, 'darken');
    const starStroke = adjustColor(starfishColor, 2, 'darken');
    const pearlStroke = adjustColor(pearlColor, 2, 'darken');
    const bandStroke = adjustColor(bandColor, 2, 'darken');

    return (
        <svg className={className} width="950" height="340" viewBox="0 0 950 340" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M35 250 Q475 40 915 250" stroke={bandStroke} strokeWidth="34" strokeLinecap="round" fill="none" />
            <path d="M35 250 Q475 70 915 250" stroke={bandColor} strokeWidth="20" strokeLinecap="round" fill="none" />

            <Pearl x="195" y="178" r="9" pearlColor={pearlColor} pearlStroke={pearlStroke} />
            <Pearl x="755" y="178" r="9" pearlColor={pearlColor} pearlStroke={pearlStroke} />
            <Pearl x="388" y="120" r="8" pearlColor={pearlColor} pearlStroke={pearlStroke} />
            <Pearl x="562" y="120" r="8" pearlColor={pearlColor} pearlStroke={pearlStroke} />

            <Scallop x="105" y="228" scale="1.35" rotate="-16" shellColor={shellColor} shellStroke={shellStroke} />
            <Scallop x="845" y="228" scale="1.3" rotate="16" shellColor={shellColor} shellStroke={shellStroke} />
            <Scallop x="285" y="150" scale="1.05" rotate="-7" shellColor={shellColor} shellStroke={shellStroke} />
            <Scallop x="665" y="150" scale="1.05" rotate="7" shellColor={shellColor} shellStroke={shellStroke} />

            <Starfish x="475" y="120" scale="1.55" starColor={starfishColor} starStroke={starStroke} />
        </svg>
    );
}

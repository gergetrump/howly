import { adjustColor } from '@/lib/colorUtils.js';

export function BlossomCrownLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <BlossomCrown width="950" height="340" {...props} />
        </g>
    );
}

function Blossom({ x, y, scale = 1, petalColor, petalStroke, centerColor }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="-19" rx="11" ry="14" fill={petalColor} stroke={petalStroke} strokeWidth="3" />
            <ellipse cx="18" cy="-6" rx="14" ry="11" fill={petalColor} stroke={petalStroke} strokeWidth="3" />
            <ellipse cx="11" cy="16" rx="11" ry="13" fill={petalColor} stroke={petalStroke} strokeWidth="3" />
            <ellipse cx="-11" cy="16" rx="11" ry="13" fill={petalColor} stroke={petalStroke} strokeWidth="3" />
            <ellipse cx="-18" cy="-6" rx="14" ry="11" fill={petalColor} stroke={petalStroke} strokeWidth="3" />
            <circle r="8" fill={centerColor} />
        </g>
    );
}

export default function BlossomCrown({ className,
                                         color = '#FFE1EB',
                                         accentColor = '#FFF5F9',
                                         leafColor = '#A8C48A',
                                         centerColor = '#FFD76E',
                                         ...props }) {
    const petalStroke = adjustColor(color, 2, 'darken');
    const accentStroke = adjustColor(accentColor, 2, 'darken');
    const leafStroke = adjustColor(leafColor, 2, 'darken');

    return (
        <svg className={className} width="950" height="340" viewBox="0 0 950 340" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M35 250 Q475 40 915 250" stroke={leafStroke} strokeWidth="34" strokeLinecap="round" fill="none" />
            <path d="M35 250 Q475 70 915 250" stroke={leafColor} strokeWidth="20" strokeLinecap="round" fill="none" />
            <ellipse cx="205" cy="152" rx="16" ry="27" fill={leafColor} stroke={leafStroke} strokeWidth="3" transform="rotate(-42 205 152)" />
            <ellipse cx="475" cy="88" rx="16" ry="27" fill={leafColor} stroke={leafStroke} strokeWidth="3" transform="rotate(4 475 88)" />
            <ellipse cx="742" cy="150" rx="16" ry="27" fill={leafColor} stroke={leafStroke} strokeWidth="3" transform="rotate(40 742 150)" />
            <Blossom x="105" y="225" scale="1.35" petalColor={color} petalStroke={petalStroke} centerColor={centerColor} />
            <Blossom x="845" y="225" scale="1.3" petalColor={color} petalStroke={petalStroke} centerColor={centerColor} />
            <Blossom x="285" y="140" scale="1.1" petalColor={color} petalStroke={petalStroke} centerColor={centerColor} />
            <Blossom x="665" y="140" scale="1.05" petalColor={color} petalStroke={petalStroke} centerColor={centerColor} />
            <Blossom x="475" y="105" scale="1.7" petalColor={accentColor} petalStroke={accentStroke} centerColor={centerColor} />
        </svg>
    );
}

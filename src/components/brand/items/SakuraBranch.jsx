import { adjustColor } from '@/lib/colorUtils.js';

export function SakuraBranchLayer({ transform = 'translate(1288 1055) scale(1.9) translate(-100 -294)', ...props }) {
    return (
        <g transform={transform}>
            <SakuraBranch width="220" height="300" {...props} />
        </g>
    );
}

function Blossom({ x, y, scale = 1, petalColor, petalStroke, centerColor }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="-14" rx="8" ry="11" fill={petalColor} stroke={petalStroke} strokeWidth="2.5" />
            <ellipse cx="13" cy="-4" rx="11" ry="8" fill={petalColor} stroke={petalStroke} strokeWidth="2.5" />
            <ellipse cx="8" cy="12" rx="8" ry="10" fill={petalColor} stroke={petalStroke} strokeWidth="2.5" />
            <ellipse cx="-8" cy="12" rx="8" ry="10" fill={petalColor} stroke={petalStroke} strokeWidth="2.5" />
            <ellipse cx="-13" cy="-4" rx="11" ry="8" fill={petalColor} stroke={petalStroke} strokeWidth="2.5" />
            <circle r="5" fill={centerColor} />
        </g>
    );
}

export default function SakuraBranch({ className, blossomColor = '#F6BBC7', branchColor = '#7A5A3E', ...props }) {
    const petalStroke = adjustColor(blossomColor, 2, 'darken');
    const branchStroke = adjustColor(branchColor, 2, 'darken');
    const leaf = '#A8C48A';
    const leafStroke = adjustColor(leaf, 2, 'darken');
    const center = '#FFD76E';

    return (
        <svg className={className} width="220" height="300" viewBox="0 0 220 300" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M100 294 C 96 240 106 190 96 140 C 90 108 98 84 92 58" stroke={branchStroke} strokeWidth="13" fill="none" strokeLinecap="round" />
            <path d="M100 294 C 96 240 106 190 96 140 C 90 108 98 84 92 58" stroke={branchColor} strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M98 176 C 128 160 148 138 154 106" stroke={branchColor} strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M100 232 C 78 220 64 200 60 176" stroke={branchColor} strokeWidth="7" fill="none" strokeLinecap="round" />

            <ellipse cx="118" cy="150" rx="7" ry="14" fill={leaf} stroke={leafStroke} strokeWidth="2" transform="rotate(38 118 150)" />
            <ellipse cx="80" cy="206" rx="6" ry="12" fill={leaf} stroke={leafStroke} strokeWidth="2" transform="rotate(-40 80 206)" />

            <Blossom x="92" y="56" scale="1.15" petalColor={blossomColor} petalStroke={petalStroke} centerColor={center} />
            <Blossom x="154" y="104" scale="1" petalColor={blossomColor} petalStroke={petalStroke} centerColor={center} />
            <Blossom x="58" y="174" scale="0.95" petalColor={blossomColor} petalStroke={petalStroke} centerColor={center} />
            <Blossom x="100" y="112" scale="1.05" petalColor={blossomColor} petalStroke={petalStroke} centerColor={center} />
            <Blossom x="104" y="236" scale="0.9" petalColor={blossomColor} petalStroke={petalStroke} centerColor={center} />
        </svg>
    );
}

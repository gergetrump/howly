import { adjustColor } from '@/lib/colorUtils.js';

export function MatchaBowlLayer({ transform = 'translate(1288 1055) scale(2.0) translate(-120 -184)', ...props }) {
    return (
        <g transform={transform}>
            <MatchaBowl width="240" height="210" {...props} />
        </g>
    );
}

export default function MatchaBowl({ className, bowlColor = '#E3D6C0', matchaColor = '#7CAD3E', ...props }) {
    const bowlStroke = adjustColor(bowlColor, 2, 'darken');
    const bowlDark = adjustColor(bowlColor, 1, 'darken');
    const matchaStroke = adjustColor(matchaColor, 2, 'darken');
    const matchaLight = adjustColor(matchaColor, 2, 'lighten');

    return (
        <svg className={className} width="240" height="210" viewBox="0 0 240 210" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M46 96 C 50 150 82 184 120 184 C 158 184 190 150 194 96 Z" fill={bowlColor} stroke={bowlStroke} strokeWidth="3" />
            <ellipse cx="120" cy="182" rx="30" ry="7" fill={bowlDark} />
            <path d="M54 122 C 74 134 166 134 186 122" fill="none" stroke={bowlStroke} strokeWidth="2" opacity="0.35" />

            <ellipse cx="120" cy="96" rx="76" ry="20" fill={bowlColor} stroke={bowlStroke} strokeWidth="3" />
            <ellipse cx="120" cy="98" rx="66" ry="15" fill={matchaColor} stroke={matchaStroke} strokeWidth="1.5" />
            <ellipse cx="106" cy="96" rx="26" ry="7" fill={matchaLight} opacity="0.7" />
        </svg>
    );
}

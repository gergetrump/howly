import { adjustColor } from '@/lib/colorUtils.js';

export function EyepatchLayer({ transform = 'translate(1032 639) scale(2.2) translate(-200 -210)', ...props }) {
    return (
        <g transform={transform}>
            <Eyepatch {...props} />
        </g>
    );
}

export default function Eyepatch({ className, color = '#26262B', ...props }) {
    const patchStroke = adjustColor(color, 1, 'darken');
    const patchLight = adjustColor(color, 4, 'lighten');
    const strapColor = adjustColor(color, 1, 'lighten');
    const strapStroke = adjustColor(strapColor, 2, 'darken');

    return (
        <svg className={className} width="300" height="320" viewBox="0 0 300 320" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M118 8 L260 244 L240 256 L98 20 Z" fill={strapColor} stroke={strapStroke} strokeWidth="2" strokeLinejoin="round" />
            <ellipse cx="200" cy="210" rx="62" ry="70" fill={color} stroke={patchStroke} strokeWidth="3" />
            <ellipse cx="200" cy="210" rx="50" ry="58" fill="none" stroke={patchLight} strokeWidth="2" opacity="0.3" />
            <path d="M174 186 Q200 177 226 186" fill="none" stroke={patchLight} strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        </svg>
    );
}

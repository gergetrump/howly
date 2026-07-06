import { adjustColor } from '@/lib/colorUtils.js';

export function BookLayer({ transform = 'translate(1288 1055) rotate(16) scale(1.7) translate(-82 -197)', ...props }) {
    return (
        <g transform={transform}>
            <Book width="180" height="210" {...props} />
        </g>
    );
}

export default function Book({ className, coverColor = '#7D3A4A', bookmarkColor = '#E0B13A', ...props }) {
    const coverStroke = adjustColor(coverColor, 2, 'darken');
    const coverDark = adjustColor(coverColor, 1, 'darken');
    const coverLight = adjustColor(coverColor, 3, 'lighten');
    const pages = '#F4EFE5';
    const pagesStroke = adjustColor(pages, 2, 'darken');
    const bookmarkStroke = adjustColor(bookmarkColor, 2, 'darken');

    return (
        <svg className={className} width="180" height="210" viewBox="0 0 180 210" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect x="28" y="24" width="138" height="176" rx="6" fill={pages} stroke={pagesStroke} strokeWidth="2.5" />
            <line x1="158" y1="34" x2="158" y2="190" stroke={pagesStroke} strokeWidth="2" opacity="0.4" />
            <line x1="150" y1="34" x2="150" y2="190" stroke={pagesStroke} strokeWidth="1.5" opacity="0.3" />

            <rect x="12" y="16" width="140" height="180" rx="9" fill={coverColor} stroke={coverStroke} strokeWidth="3" />
            <path d="M12 25 Q12 16 21 16 L34 16 L34 196 L21 196 Q12 196 12 187 Z" fill={coverDark} />
            <line x1="36" y1="24" x2="36" y2="188" stroke={coverLight} strokeWidth="2" opacity="0.5" />

            <rect x="50" y="38" width="90" height="140" rx="6" fill="none" stroke={coverLight} strokeWidth="2.5" opacity="0.75" />
            <path d="M95 88 L101 106 L119 112 L101 118 L95 136 L89 118 L71 112 L89 106 Z" fill={coverLight} opacity="0.9" />

            <path d="M116 2 L116 40 L124 32 L132 40 L132 2 Z" fill={bookmarkColor} stroke={bookmarkStroke} strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}

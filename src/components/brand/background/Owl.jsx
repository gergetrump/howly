export function Owl({ className, style }) {
    return (
        <svg
            className={className}
            style={style}
            viewBox="0 0 120 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <g fill="#eef2f8" opacity="0.95">
                <path d="M60 34 Q44 20 22 16 Q10 14 2 20 Q14 22 24 28 Q38 36 52 42 Z" />
                <path d="M60 34 Q76 20 98 16 Q110 14 118 20 Q106 22 96 28 Q82 36 68 42 Z" />
                <ellipse cx="60" cy="42" rx="13" ry="16" />
                <circle cx="60" cy="29" r="9.5" />
                <path d="M55 56 Q60 65 65 56 L60 50 Z" />
            </g>
            <g stroke="#5b6a85" strokeWidth="1.6" strokeLinecap="round" opacity="0.65">
                <path d="M22 20 L26 22" /><path d="M32 24 L36 26" /><path d="M42 30 L46 32" />
                <path d="M98 20 L94 22" /><path d="M88 24 L84 26" /><path d="M78 30 L74 32" />
                <path d="M55 44 L58 45" /><path d="M62 48 L65 49" />
            </g>
            <circle cx="56" cy="28.5" r="3" fill="#e3b34a" />
            <circle cx="64" cy="28.5" r="3" fill="#e3b34a" />
            <circle cx="56.5" cy="28.5" r="1.4" fill="#101726" />
            <circle cx="63.5" cy="28.5" r="1.4" fill="#101726" />
            <path d="M60 31 L58.2 34.5 L61.8 34.5 Z" fill="#2a3145" />
        </svg>
    );
}

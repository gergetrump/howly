export default function BubbleSymbol({ className, color = '#0F0F0F', ...props }) {
    return (
        <svg
            className={className}
            width="143"
            height="143"
            viewBox="0 0 143 143"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <circle cx="42" cy="44" r="16" fill={color} />
            <circle cx="87" cy="39" r="12" fill={color} />
            <circle cx="104" cy="82" r="17" fill={color} />
            <circle cx="55" cy="97" r="13" fill={color} />
        </svg>
    );
}

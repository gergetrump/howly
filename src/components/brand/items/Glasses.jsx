const DEFAULT_GLASSES_COLOR = '#000000';

export function GlassesLayer({ transform, color, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Glasses width="420" height="159" color={color} />
        </g>
    );
}

export function GlassesPreview({ className, color, ...props }) {
    return (
        <Glasses
            className={className}
            width="424"
            height="160"
            color={color}
            {...props}
        />
    );
}

export default function Glasses({
    className,
    width = 424,
    height = 160,
    color = DEFAULT_GLASSES_COLOR,
    ...props
}) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 424 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M88 7.5C133.148 7.5 168.5 40.616 168.5 80C168.5 119.384 133.148 152.5 88 152.5C42.8524 152.5 7.5 119.384 7.5 80C7.5 40.616 42.8524 7.5 88 7.5Z" stroke={color} strokeWidth="15" />
            <path d="M336 7.5C381.148 7.5 416.5 40.616 416.5 80C416.5 119.384 381.148 152.5 336 152.5C290.852 152.5 255.5 119.384 255.5 80C255.5 40.616 290.852 7.5 336 7.5Z" stroke={color} strokeWidth="15" />
            <path d="M168 72.4981C205.856 52.6093 253.177 68.3288 254 72.4981" stroke={color} strokeWidth="15" />
        </svg>
    );
}

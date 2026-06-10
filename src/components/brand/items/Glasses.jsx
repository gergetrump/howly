import glassesSrc from '@/assets/items/Glasses.svg';

export function GlassesLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Glasses width="760" height="287" />
        </g>
    );
}

export function GlassesPreview({ className, ...props }) {
    return (
        <Glasses
            className={className}
            imageX="52"
            imageWidth="320"
            {...props}
        />
    );
}

export default function Glasses({
    className,
    width = 424,
    height = 160,
    imageX = 0,
    imageWidth = 250,
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
            <image href={glassesSrc} x={imageX} width={imageWidth} height="160" />
        </svg>
    );
}

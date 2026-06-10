import warmHatSrc from '@/assets/items/WarmHat.svg';

export function WarmHatLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <WarmHat width="1100" height="600" />
        </g>
    );
}

export default function WarmHat({ className, width = 1096, height = 550, ...props }) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 1096 550"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <image href={warmHatSrc} width="1096" height="550" />
        </svg>
    );
}

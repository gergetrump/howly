import sneakerSrc from '@/assets/items/Sneaker.svg';

export function SneakerLayer({
    transform,
    leftShoeTransform = 'translate(330 1310)',
    rightShoeTransform = 'translate(790 1310)',
    ...props
}) {
    return (
        <g transform={transform} {...props}>
            <g transform={leftShoeTransform}>
                <Sneaker width="230" height="188" />
            </g>
            <g transform={rightShoeTransform}>
                <Sneaker width="230" height="188" />
            </g>
        </g>
    );
}

export function SneakerPair({ className, ...props }) {
    return (
        <svg
            className={className}
            width="520"
            height="230"
            viewBox="0 0 520 230"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g transform="translate(35 28)">
                <Sneaker width="208" height="170" />
            </g>
            <g transform="translate(277 28)">
                <Sneaker width="208" height="170" />
            </g>
        </svg>
    );
}

export default function Sneaker({ className, width = 208, height = 170, ...props }) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 208 170"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <image href={sneakerSrc} width="208" height="170" />
        </svg>
    );
}

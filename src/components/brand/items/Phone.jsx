import phoneSrc from '@/assets/items/Phone.svg';

export function PhoneLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Phone width="330" height="404" />
        </g>
    );
}

export default function Phone({ className, width = 320, height = 392, ...props }) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 320 392"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <image href={phoneSrc} width="320" height="392" />
        </svg>
    );
}

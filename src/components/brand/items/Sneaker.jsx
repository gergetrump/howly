const DEFAULT_SNEAKER_COLOR = '#1A1A1A';

function darkenColor(hexColor, amount = 0.2) {
    const cleanHex = hexColor.replace('#', '');
    const red = parseInt(cleanHex.slice(0, 2), 16);
    const green = parseInt(cleanHex.slice(2, 4), 16);
    const blue = parseInt(cleanHex.slice(4, 6), 16);
    const darken = (channel) => Math.max(0, Math.round(channel * (1 - amount)));

    return `#${[darken(red), darken(green), darken(blue)]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')}`;
}

export function SneakerLayer({
    transform,
    leftShoeTransform = 'translate(330 1310)',
    rightShoeTransform = 'translate(790 1310)',
    color,
    ...props
}) {
    return (
        <g transform={transform} {...props}>
            <g transform={leftShoeTransform}>
                <Sneaker width="230" height="188" color={color} />
            </g>
            <g transform={rightShoeTransform}>
                <Sneaker width="230" height="188" color={color} />
            </g>
        </g>
    );
}

export function SneakerPair({ className, color, ...props }) {
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
                <Sneaker width="208" height="170" color={color} />
            </g>
            <g transform="translate(277 28)">
                <Sneaker width="208" height="170" color={color} />
            </g>
        </svg>
    );
}

export default function Sneaker({
    className,
    width = 208,
    height = 170,
    color = DEFAULT_SNEAKER_COLOR,
    ...props
}) {
    const laceColor = darkenColor(color, 0.55);

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
            <path d="M104 0C159.228 0 177 7.5 204 60.5C204 115.728 159.228 160.5 104 160.5C48.7715 160.5 4 115.728 4 60.5C27.5 8.5 48.7715 0 104 0Z" fill={color} />
            <path d="M104 50.5C114.243 50.5 124.386 52.2709 133.85 55.7119C143.313 59.1529 151.911 64.1966 159.154 70.5547C166.397 76.9128 172.143 84.4612 176.062 92.7686C177.839 96.5325 179.223 100.419 180.207 104.381C189.044 93.8581 196.486 80.3871 204.001 63C204.001 119.451 159.229 165.215 104.001 165.215C48.7725 165.215 4.00006 119.452 4 63C11.8804 79.6443 19.509 92.6626 28.167 102.946C29.1174 99.4806 30.3763 96.0772 31.9375 92.7686C35.8574 84.4612 41.6027 76.9128 48.8457 70.5547C56.0886 64.1966 64.6871 59.1529 74.1504 55.7119C83.6138 52.2709 93.7569 50.5 104 50.5Z" fill="white" />
            <path d="M5.73633 70.0068C16.6071 91.8043 27.3935 107.04 41.5264 117.895C57.0035 129.782 76.3328 136.293 103.767 140.632L103.989 140.667L104.212 140.635C132.747 136.57 152.58 130.136 168.038 118.206C182.013 107.421 192.269 92.2535 202.218 70.6787C198.38 122.741 155.846 163.715 104.001 163.715C51.9329 163.715 9.25573 122.388 5.73633 70.0068Z" fill="white" stroke={laceColor} strokeWidth="3" />
            <path d="M84.3613 19.3905C84.3613 8.72265 93.0832 0.113929 103.75 0.253265C114.222 0.390051 122.639 8.9179 122.639 19.3905V30.8611C122.639 41.4312 114.07 50 103.5 50C92.9301 50 84.3613 41.4312 84.3613 30.8611V19.3905Z" fill="#D9D9D9" />
            {[79.9444, 127.056].map((cx) => (
                [10, 20, 31, 42].map((cy) => (
                    <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="2.94444" ry="2" fill="#676767" />
                ))
            ))}
            <path d="M80.7021 9.12977C80.7021 9.12977 85.8133 5.60078 103.479 5.50434C121.145 5.4079 127.812 8.8726 127.812 8.8726" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M79.2294 20.1298C79.2294 20.1298 84.3406 16.6008 102.007 16.5043C119.673 16.4079 126.339 19.8726 126.339 19.8726" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M79.9858 31.7577C79.9858 31.7577 85.0969 28.2287 102.763 28.1323C120.429 28.0358 127.095 31.5005 127.095 31.5005" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M79.9858 42.7587C79.9858 42.7587 85.0969 39.2297 102.763 39.1332C120.429 39.0368 127.095 42.5015 127.095 42.5015" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M81.4168 9.26273C81.4168 9.26273 88.0878 7.26906 104.552 11.6201C121.017 15.9712 125.322 20.8656 125.322 20.8656" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M81.4168 20.2627C81.4168 20.2627 88.0878 18.2691 104.552 22.6201C121.017 26.9712 125.322 31.8656 125.322 31.8656" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M82.8889 32.2627C82.8889 32.2627 89.5599 30.2691 106.024 34.6201C122.489 38.9712 126.794 43.8656 126.794 43.8656" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M125.718 8.26273C125.718 8.26273 119.047 6.26906 102.583 10.6201C86.1186 14.9712 81.8133 19.8656 81.8133 19.8656" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M125.718 19.2627C125.718 19.2627 119.047 17.2691 102.583 21.6201C86.1186 25.9712 81.8133 30.8656 81.8133 30.8656" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
            <path d="M125.718 31.2627C125.718 31.2627 119.047 29.2691 102.583 33.6201C86.1186 37.9712 81.8133 42.8656 81.8133 42.8656" stroke={laceColor} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

import Eclipse from './Eclipse';
import Flower from './Flower';
import Heart from './Heart';

const DEFAULT_CUP_COLOR = '#E09AAB';

const CUP_SYMBOLS = {
    eclipse: {
        Component: Eclipse,
        placement: {
            x: 178,
            y: 345,
            width: 112,
            height: 126,
        },
    },
    heart: {
        Component: Heart,
        placement: {
            x: 166,
            y: 351,
            width: 136,
            height: 110,
        },
    },
    flower: {
        Component: Flower,
        placement: {
            x: 182,
            y: 353,
            width: 90,
            height: 90,
        },
    },
};

function darkenColor(hexColor, amount = 0.15) {
    const cleanHex = hexColor.replace('#', '');
    const red = parseInt(cleanHex.slice(0, 2), 16);
    const green = parseInt(cleanHex.slice(2, 4), 16);
    const blue = parseInt(cleanHex.slice(4, 6), 16);
    const darken = (channel) => Math.max(0, Math.round(channel * (1 - amount)));

    return `#${[darken(red), darken(green), darken(blue)]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')}`;
}

function CupSymbol({ symbol, color }) {
    const symbolEntry = CUP_SYMBOLS[symbol];

    if (!symbolEntry) {
        return null;
    }

    const Symbol = symbolEntry.Component;

    return <Symbol aria-hidden="true" color={color} {...symbolEntry.placement} />;
}

export function CupLayer({ transform, color, symbol, symbolColor, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Cup width="320" height="449" color={color} symbol={symbol} symbolColor={symbolColor} />
        </g>
    );
}

export default function Cup({ className, color = DEFAULT_CUP_COLOR, symbol = 'eclipse', symbolColor, ...props }) {
    const cupStrokeColor = darkenColor(color, 0.15);
    const cupRimColor = darkenColor(color, 0.28);

    return (
        <svg
            className={className}
            width="390"
            height="547"
            viewBox="0 0 390 547"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M122 321.9C125.936 321.9 129.068 321.982 131.488 322.147C133.934 322.314 135.563 322.56 136.546 322.854C136.637 322.882 136.717 322.91 136.79 322.936C136.647 323.062 136.464 323.208 136.236 323.373C134.399 324.701 130.757 326.462 125.757 328.728C120.829 330.96 114.688 333.638 108.074 336.755C94.8463 342.99 79.5204 351.075 67.4863 361.259C55.4668 371.43 46.5 383.897 46.5 398.901C46.5002 413.891 55.4521 426.759 67.4531 437.53C79.4739 448.32 94.7892 457.219 108.009 464.264C114.531 467.739 120.839 470.915 125.673 473.477C130.665 476.122 134.297 478.221 136.127 479.824C136.572 480.214 136.855 480.528 137.017 480.766C137.048 480.812 137.072 480.853 137.091 480.887C136.985 480.96 136.791 481.071 136.447 481.2C135.496 481.558 133.895 481.87 131.459 482.083C129.051 482.294 125.93 482.4 122 482.4C90.5699 482.4 60.369 475.546 38.0791 461.666C15.8424 447.819 1.50017 427.013 1.5 398.901C1.5 370.819 15.8089 351.654 38.0098 339.426C60.2949 327.151 90.5094 321.9 122 321.9Z" fill={color} stroke={cupStrokeColor} strokeWidth="3" />
            <path d="M325.782 544.901H120.251L66.9375 253.656C67.6035 253.885 68.3984 254.159 69.3164 254.47C72.4171 255.518 76.9094 257.011 82.4805 258.791C93.6222 262.351 109.085 267.061 126.364 271.663C160.858 280.849 202.822 289.665 232.091 287.898C261.249 286.139 300.621 277.355 332.627 269.041C348.647 264.88 362.851 260.828 373.05 257.816C378.15 256.311 382.249 255.065 385.074 254.195C385.805 253.97 386.45 253.768 387.006 253.596L325.782 544.901Z" fill={color} stroke={cupStrokeColor} strokeWidth="3" />
            <CupSymbol symbol={symbol} color={symbolColor} />
            <line x1="116" y1="505.901" x2="336" y2="505.901" stroke={cupStrokeColor} strokeWidth="3" strokeLinecap="round" />
            <path d="M65.5 250.401C185.105 225.836 256.378 226.974 389.5 250.401" stroke={cupStrokeColor} strokeWidth="3" />
            <path d="M388 251.401C388 257.14 383.981 262.93 375.921 268.459C367.909 273.955 356.216 278.964 341.634 283.194C312.488 291.65 272.135 296.901 227.5 296.901C182.865 296.901 142.512 291.65 113.366 283.194C98.7835 278.964 87.0913 273.955 79.0791 268.459C71.0189 262.93 67 257.14 67 251.401C67 245.663 71.0189 239.872 79.0791 234.344C87.0913 228.848 98.7835 223.839 113.366 219.608C142.512 211.152 182.865 205.901 227.5 205.901C272.135 205.901 312.488 211.152 341.634 219.608C356.216 223.839 367.909 228.848 375.921 234.344C383.981 239.872 388 245.663 388 251.401Z" fill={cupRimColor} stroke={cupStrokeColor} strokeWidth="3" />
            <path d="M248.101 1.6756C332.424 126.93 174.631 56.1671 245.13 202.676" stroke="#F5F5F5" strokeWidth="6" />
            <path d="M187.908 117.517C221.561 181.73 158.316 145.635 186.382 220.791" stroke="#F5F5F5" strokeWidth="6" />
            <path d="M292.597 109.642C363.028 185.683 231.776 142.356 290.8 231.207" stroke="#F5F5F5" strokeWidth="6" />
        </svg>
    );
}

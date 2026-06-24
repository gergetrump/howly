import { adjustColor } from '@/lib/colorUtils';
import Diamond from './Diamond';
import Eclipse from './Eclipse';
import Heart from './Heart';

function NecklaceSymbol({ symbol, color }) {
    if (symbol === 'moon') {
        return (
            <g transform="translate(118 112) scale(0.42)">
                <Eclipse color={color} />
            </g>
        );
    }

    if (symbol === 'diamond') {
        return (
            <g transform="translate(117 117) scale(0.45)">
                <Diamond color={color} strokeColor={adjustColor(color, 2, 'darken')} />
            </g>
        );
    }

    return (
        <g transform="translate(117 122) scale(0.45)">
            <Heart color={color} />
        </g>
    );
}

export default function Necklace({ className, color = '#990000', symbol = 'heart', symbolColor = color, ...props }) {
    return (
        <svg className={className} width="299" height="166" viewBox="0 0 299 166" fill="none" overflow="visible" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 123">
                <g id="Group 122">
                    <path id="Line 103" d="M5.21012 1.17793C4.48093 0.00611434 2.93931 -0.351925 1.76683 0.378232C0.594351 1.10839 0.234997 2.65024 0.964193 3.82207L3.08716 2.5L5.21012 1.17793ZM298.071 10.4898C298.845 9.34556 298.545 7.7916 297.401 7.01888C296.257 6.24617 294.703 6.54732 293.929 7.69152L296 9.09065L298.071 10.4898ZM3.08716 2.5L0.964193 3.82207C29.0699 48.9881 54.2634 82.932 78.1158 105.684C101.97 128.438 124.729 140.23 147.93 140.556C171.128 140.881 194.161 129.734 218.544 107.972C242.926 86.2104 268.914 53.6086 298.071 10.4898L296 9.09065L293.929 7.69152C264.845 50.7036 239.132 82.8976 215.217 104.243C191.302 125.587 169.439 135.857 148.004 135.556C126.572 135.256 104.961 124.378 81.5686 102.065C58.1741 79.7495 33.244 46.2285 5.21012 1.17793L3.08716 2.5Z" fill="#CEB88B"/>
                </g>
                <NecklaceSymbol symbol={symbol} color={symbolColor} />
            </g>
        </svg>
    );
}

export function NecklaceLayer({ transform = 'translate(555 690)', ...props }) {
    return (
        <g transform={transform}>
            <Necklace width="420" height="233" {...props} />
        </g>
    );
}

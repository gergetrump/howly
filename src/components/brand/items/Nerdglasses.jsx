export default function Nerdglasses({ className, color = '#4C4C4C', ...props }) {
    return (
        <svg className={className} width="1022" height="307" viewBox="0 0 1022 307" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 91">
                <path id="Ellipse 67" d="M819.121 21.54C893.389 21.54 953.91 82.9255 953.91 159.04C953.91 235.154 893.389 296.539 819.121 296.539C744.853 296.539 684.332 235.154 684.332 159.04C684.332 82.9256 744.853 21.5401 819.121 21.54ZM200.306 10C274.574 10 335.095 71.3847 335.095 147.499C335.095 223.614 274.574 284.999 200.306 284.999C126.038 284.999 65.5173 223.614 65.5173 147.499C65.5175 71.3847 126.039 10.0001 200.306 10Z" stroke={color} strokeWidth="20"/>
                <path id="Line 87" d="M333.096 148.952C478.002 110.728 554.695 115.149 687.096 147.952" stroke={color} strokeWidth="18"/>
                <line id="Line 88" x1="9.00006" y1="148.833" x2="66.0017" y2="148.073" stroke={color} strokeWidth="18" strokeLinecap="round"/>
                <line id="Line 89" x1="955" y1="149.833" x2="1012" y2="149.073" stroke={color} strokeWidth="18" strokeLinecap="round"/>
            </g>
        </svg>
    );
}

export function NerdglassesLayer({ transform = 'translate(485 550)', ...props }) {
    return (
        <g transform={transform}>
            <Nerdglasses width="430" height="129" {...props} />
        </g>
    );
}

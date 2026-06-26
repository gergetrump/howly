const BAMBUS_SHOE_WIDTH = 214;
const BAMBUS_SHOE_HEIGHT = 126;
const PREVIEW_SHOE_WIDTH = 208;
const LAYER_SHOE_WIDTH = 230;
const PREVIEW_SHOE_HEIGHT = (PREVIEW_SHOE_WIDTH / BAMBUS_SHOE_WIDTH) * BAMBUS_SHOE_HEIGHT;
const LAYER_SHOE_HEIGHT = (LAYER_SHOE_WIDTH / BAMBUS_SHOE_WIDTH) * BAMBUS_SHOE_HEIGHT;

export function BambusShoesLayer({
    transform,
    leftShoeTransform = 'translate(370 1390)',
    rightShoeTransform = 'translate(795 1390)',
    color,
    ...props
}) {
    return (
        <g transform={transform} {...props}>
            <g transform={leftShoeTransform}>
                <BambusShoes width={LAYER_SHOE_WIDTH} height={LAYER_SHOE_HEIGHT} color={color} />
            </g>
            <g transform={rightShoeTransform}>
                <BambusShoes width={LAYER_SHOE_WIDTH} height={LAYER_SHOE_HEIGHT} color={color} />
            </g>
        </g>
    );
}

export function BambusShoesPair({ className, color, ...props }) {
    return (
        <svg className={className} width="520" height="230" viewBox="0 0 520 230" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g transform="translate(35 52)">
                <BambusShoes width={PREVIEW_SHOE_WIDTH} height={PREVIEW_SHOE_HEIGHT} color={color} />
            </g>
            <g transform="translate(277 52)">
                <BambusShoes width={PREVIEW_SHOE_WIDTH} height={PREVIEW_SHOE_HEIGHT} color={color} />
            </g>
        </svg>
    );
}

export default function BambusShoes({ className, color = '#E1D3AE', ...props }) {
    return (
        <svg className={className} width="214" height="126" viewBox="0 0 214 126" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 72">
                <path id="Ellipse 3" d="M7.18848 22.9872C31.0148 73.3115 52.5343 90.4936 107.189 99.1373C164.056 91.0371 185.312 73.604 207.189 22.9872C207.189 79.4389 162.417 125.202 107.189 125.202C51.9606 125.202 7.18848 79.4389 7.18848 22.9872Z" fill={color}/>
                <path id="Ellipse 34" d="M206.829 27.1026C181.22 13.0367 175.943 24.4443 144.83 38.1016C116.88 59.6623 105.292 72.882 106.829 101.602C92.2236 77.3273 109.65 48.6581 138.83 31.1016C168.01 13.545 192.223 2.82775 206.829 27.1026Z" fill={color}/>
                <path id="Ellipse 35" d="M8.19056 24.4998C33.7992 10.4339 36.4074 24.4444 67.5202 38.1017C95.47 59.6624 107.059 72.8821 105.521 101.602C120.127 77.3275 102.7 48.6582 73.5202 31.1017C44.3406 13.5452 22.796 0.224954 8.19056 24.4998Z" fill={color}/>
            </g>
        </svg>
    );
}

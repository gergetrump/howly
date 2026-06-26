const CUTE_BALLERINAS_WIDTH = 224;
const CUTE_BALLERINAS_HEIGHT = 188;
const PREVIEW_SHOE_WIDTH = 208;
const LAYER_SHOE_WIDTH = 230;
const PREVIEW_SHOE_HEIGHT = (PREVIEW_SHOE_WIDTH / CUTE_BALLERINAS_WIDTH) * CUTE_BALLERINAS_HEIGHT;
const LAYER_SHOE_HEIGHT = (LAYER_SHOE_WIDTH / CUTE_BALLERINAS_WIDTH) * CUTE_BALLERINAS_HEIGHT;

export function CuteBallerinasLayer({
    transform,
    leftShoeTransform = 'translate(370 1345)',
    rightShoeTransform = 'translate(795 1345)',
    color,
    stripeColor,
    ...props
}) {
    return (
        <g transform={transform} {...props}>
            <g transform={leftShoeTransform}>
                <CuteBallerinas width={LAYER_SHOE_WIDTH} height={LAYER_SHOE_HEIGHT} color={color} stripeColor={stripeColor} />
            </g>
            <g transform={rightShoeTransform}>
                <CuteBallerinas width={LAYER_SHOE_WIDTH} height={LAYER_SHOE_HEIGHT} color={color} stripeColor={stripeColor} />
            </g>
        </g>
    );
}

export function CuteBallerinasPair({ className, color, stripeColor, ...props }) {
    return (
        <svg className={className} width="520" height="230" viewBox="0 0 520 230" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g transform="translate(35 24)">
                <CuteBallerinas width={PREVIEW_SHOE_WIDTH} height={PREVIEW_SHOE_HEIGHT} color={color} stripeColor={stripeColor} />
            </g>
            <g transform="translate(277 24)">
                <CuteBallerinas width={PREVIEW_SHOE_WIDTH} height={PREVIEW_SHOE_HEIGHT} color={color} stripeColor={stripeColor} />
            </g>
        </svg>
    );
}

export default function CuteBallerinas({ className, color = '#F1EBDF', stripeColor = '#B3A6C1', ...props }) {
    return (
        <svg className={className} width="224" height="188" viewBox="0 0 224 188" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 120">
                <g id="Ellipse 76" filter="url(#filter0_d_178_481)">
                    <path d="M7.00244 63.002C30.8288 113.326 52.3482 118.858 107.003 127.502C163.87 119.402 186.126 113.619 208.002 63.002C208.002 119.454 162.231 179.217 107.003 179.217C51.7745 179.217 7.00244 119.454 7.00244 63.002Z" fill={color}/>
                    <path d="M8.72803 69.9219C19.6325 91.3524 30.4665 103.983 44.6929 112.182C60.1658 121.099 79.4991 124.671 106.769 128.983L106.992 129.019L107.214 128.987C135.59 124.945 155.669 121.451 171.368 112.499C185.666 104.345 196.201 91.7539 206.227 70.5732C204.401 95.9822 193.564 121.532 177.061 141.318C158.917 163.073 134.057 177.717 107.003 177.717C79.9533 177.717 55.3449 163.077 37.4507 141.326C21.0357 121.373 10.378 95.553 8.72803 69.9219Z" stroke={color} strokeWidth="3"/>
                </g>
                <path id="Line 101" d="M10.0024 10.002L214.002 59.002" stroke={stripeColor} strokeWidth="20" strokeLinecap="round"/>
                <path id="Line 102" d="M207.002 10.002L10.0024 59.002" stroke={stripeColor} strokeWidth="20" strokeLinecap="round"/>
            </g>
            <defs>
                <filter id="filter0_d_178_481" x="3.00244" y="63.002" width="209" height="124.215" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="4"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_178_481"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_178_481" result="shape"/>
                </filter>
            </defs>
        </svg>
    );
}

const BALLERINA_WIDTH = 209;
const BALLERINA_HEIGHT = 125;
const PREVIEW_SHOE_WIDTH = 208;
const LAYER_SHOE_WIDTH = 230;
const PREVIEW_SHOE_HEIGHT = (PREVIEW_SHOE_WIDTH / BALLERINA_WIDTH) * BALLERINA_HEIGHT;
const LAYER_SHOE_HEIGHT = (LAYER_SHOE_WIDTH / BALLERINA_WIDTH) * BALLERINA_HEIGHT;

export function BallerinaLayer({
    transform,
    leftShoeTransform = 'translate(370 1390)',
    rightShoeTransform = 'translate(795 1390)',
    color,
    ...props
}) {
    return (
        <g transform={transform} {...props}>
            <g transform={leftShoeTransform}>
                <Ballerina width={LAYER_SHOE_WIDTH} height={LAYER_SHOE_HEIGHT} color={color} />
            </g>
            <g transform={rightShoeTransform}>
                <Ballerina width={LAYER_SHOE_WIDTH} height={LAYER_SHOE_HEIGHT} color={color} />
            </g>
        </g>
    );
}

export function BallerinaPair({ className, color, ...props }) {
    return (
        <svg className={className} width="520" height="230" viewBox="0 0 520 230" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g transform="translate(35 52)">
                <Ballerina width={PREVIEW_SHOE_WIDTH} height={PREVIEW_SHOE_HEIGHT} color={color} />
            </g>
            <g transform="translate(277 52)">
                <Ballerina width={PREVIEW_SHOE_WIDTH} height={PREVIEW_SHOE_HEIGHT} color={color} />
            </g>
        </svg>
    );
}

export default function Ballerina({ className, color = '#F1EBDF', ...props }) {
    return (
        <svg className={className} width="209" height="125" viewBox="0 0 209 125" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Ellipse 36" filter="url(#filter0_d_135_490)">
                <path d="M4 0C27.8263 50.3243 49.3458 55.8563 104.001 64.5C160.868 56.3998 183.123 50.6168 205 0C205 56.4517 159.229 116.215 104.001 116.215C48.7721 116.215 4 56.4517 4 0Z" fill={color}/>
                <path d="M5.72559 6.91992C16.6301 28.3504 27.464 40.9809 41.6904 49.1797C57.1634 58.0968 76.4966 61.6687 103.767 65.9814L103.989 66.0166L104.212 65.9854C132.588 61.9435 152.667 58.4489 168.365 49.4971C182.664 41.3435 193.198 28.7519 203.225 7.57129C201.399 32.9803 190.561 58.5298 174.059 78.3164C155.914 100.071 131.054 114.715 104.001 114.715C76.9509 114.715 52.3424 100.075 34.4482 78.3242C18.0333 58.371 7.37559 32.5511 5.72559 6.91992Z" stroke={color} strokeWidth="3"/>
            </g>
            <defs>
                <filter id="filter0_d_135_490" x="0" y="0" width="209" height="124.215" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="4"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_135_490"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_135_490" result="shape"/>
                </filter>
            </defs>
        </svg>
    );
}

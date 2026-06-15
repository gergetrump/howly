const WOLF_BODY_WIDTH = 1200;
const HOODIE_NEW_WIDTH = 1211;
const HOODIE_NEW_HEIGHT = 578;
const HOODIE_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / HOODIE_NEW_WIDTH) * HOODIE_NEW_HEIGHT;

export function HoodieLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Hoodie
                width={WOLF_BODY_WIDTH}
                height={HOODIE_HEIGHT_AT_WOLF_WIDTH}
            />
        </g>
    );
}

export default function Hoodie({ className, ...props }) {
    return (
        <svg
            className={className}
            width="1211"
            height="578"
            viewBox="0 0 1211 578"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path d="M79 172.219C79 102.698 148.186 54.39 213.451 78.3412L574.218 210.736C596.66 218.972 621.311 218.895 643.703 210.52L993.967 79.5077C1059.33 55.0597 1129 103.385 1129 173.17V475C1129 530.228 1084.23 575 1029 575H179C123.772 575 79 530.228 79 475V172.219Z" fill="#C66E6E" />
            <g filter="url(#hoodie-new-filter-bottom)">
                <path d="M366.5 573.5V504.5C418.985 490.726 439.74 471.757 456 411H769C785.26 471.757 806.015 490.726 858.5 504.5V573.5" stroke="#A65252" strokeWidth="8" />
            </g>
            <path d="M505.12 297H519.968V302.12H515.488V318.44H535.2V302.12H530.72V297H545.568V302.12H541.088V339.88H545.568V345H530.72V339.88H535.2V323.56H515.488V339.88H519.968V345H505.12V339.88H509.6V302.12H505.12V297ZM562.464 345L555.808 337.96V310.44L562.464 303.4H580.512L587.168 310.44V337.96L580.512 345H562.464ZM564.96 339.496H577.952L581.28 336.104V312.296L578.016 308.904H565.024L561.696 312.296V336.104L564.96 339.496ZM607.673 345L596.793 308.52H593.593V303.4H607.161V308.52H602.681L611.705 338.92L620.793 308.52H618.233V303.4H632.057V308.52H629.497L638.521 338.92L647.609 308.52H643.129V303.4H656.697V308.52H653.497L642.617 345H634.745L625.145 312.808L615.545 345H607.673ZM663.12 303.4H678.608V308.52H673.488V339.88H687.44V332.456H692.304V345H663.12V339.88H667.6V308.52H663.12V303.4ZM719.16 345H701.752V339.88H707.512V331.944L696.376 308.52H692.28V303.4H705.848V308.52H702.008L710.392 326.248L718.84 308.52H715V303.4H728.568V308.52H724.472L713.4 331.816V339.88H719.16V345Z" fill="white" />
            <ellipse cx="1108.13" cy="65.0712" rx="83.5" ry="34.0527" transform="rotate(-24 1108.13 65.0712)" fill="#C66E6E" />
            <ellipse cx="1120.13" cy="98.0712" rx="83.5" ry="34.0527" transform="rotate(-24 1120.13 98.0712)" fill="#C66E6E" />
            <ellipse cx="1119.09" cy="138.175" rx="83.5" ry="39.0581" transform="rotate(-5 1119.09 138.175)" fill="#C66E6E" />
            <rect x="1083.35" y="40" width="100" height="100" transform="rotate(66 1083.35 40)" fill="#C66E6E" />
            <ellipse cx="83.5" cy="34.0527" rx="83.5" ry="34.0527" transform="matrix(-0.913545 -0.406737 -0.406737 0.913545 192.263 68.925)" fill="#C66E6E" />
            <ellipse cx="83.5" cy="34.0527" rx="83.5" ry="34.0527" transform="matrix(-0.913545 -0.406737 -0.406737 0.913545 180.263 101.925)" fill="#C66E6E" />
            <ellipse cx="83.5" cy="39.0581" rx="83.5" ry="39.0581" transform="matrix(-0.996195 -0.0871557 -0.0871557 0.996195 177.759 107.543)" fill="#C66E6E" />
            <rect width="100" height="100" transform="matrix(-0.406737 0.913545 0.913545 0.406737 126.909 41)" fill="#C66E6E" />
            <g filter="url(#hoodie-new-filter-left-shoulder)">
                <path d="M84 177L531 259" stroke="#B85D5D" strokeWidth="6" strokeLinecap="round" />
            </g>
            <g filter="url(#hoodie-new-filter-right-shoulder)">
                <path d="M1124 177L684 259" stroke="#B85D5D" strokeWidth="6" strokeLinecap="round" />
            </g>
            <g filter="url(#hoodie-new-filter-left-sleeve-upper)">
                <path d="M45.4348 106L393.339 234.036" stroke="#B85D5D" strokeWidth="6" strokeLinecap="round" />
            </g>
            <g filter="url(#hoodie-new-filter-right-sleeve-upper)">
                <path d="M1171.6 104L974 202" stroke="#B85D5D" strokeWidth="6" strokeLinecap="round" />
            </g>
            <g filter="url(#hoodie-new-filter-left-sleeve-lower)">
                <path d="M35.6932 57L255 145" stroke="#B85D5D" strokeWidth="6" strokeLinecap="round" />
            </g>
            <g filter="url(#hoodie-new-filter-right-sleeve-lower)">
                <path d="M1177.13 57L942 154" stroke="#B85D5D" strokeWidth="6" strokeLinecap="round" />
            </g>
            <line x1="793" y1="190" x2="793" y2="326" stroke="#DADADA" strokeWidth="14" strokeLinecap="round" />
            <circle cx="793" cy="298" r="15" fill="#DADADA" />
            <line x1="432" y1="190" x2="432" y2="326" stroke="#DADADA" strokeWidth="14" strokeLinecap="round" />
            <circle cx="432" cy="298" r="14.5" fill="#DADADA" stroke="#DADADA" />
            <defs>
                <filter id="hoodie-new-filter-bottom" x="358.5" y="403" width="508" height="174.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_7_51" />
                </filter>
                <filter id="hoodie-new-filter-left-shoulder" x="76.9995" y="169.999" width="461.001" height="96.0011" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_7_51" />
                </filter>
                <filter id="hoodie-new-filter-right-shoulder" x="676.999" y="169.999" width="454.001" height="96.0011" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_7_51" />
                </filter>
                <filter id="hoodie-new-filter-left-sleeve-upper" x="38.434" y="98.9992" width="361.906" height="142.038" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_7_51" />
                </filter>
                <filter id="hoodie-new-filter-right-sleeve-upper" x="966.999" y="96.9993" width="211.599" height="112.001" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_7_51" />
                </filter>
                <filter id="hoodie-new-filter-left-sleeve-lower" x="28.6924" y="49.9992" width="233.308" height="102.002" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_7_51" />
                </filter>
                <filter id="hoodie-new-filter-right-sleeve-lower" x="934.999" y="49.9992" width="249.13" height="111.002" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_7_51" />
                </filter>
            </defs>
        </svg>
    );
}

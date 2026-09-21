const WOLF_BODY_WIDTH = 1280;
const HOGWARTS_CAPE_WIDTH = 1352;
const HOGWARTS_CAPE_HEIGHT = 628;
const HOGWARTS_CAPE_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / HOGWARTS_CAPE_WIDTH) * HOGWARTS_CAPE_HEIGHT;

export function HogwartsCapeLayer({ transform, ...props }) {
    return (
        <g transform={transform}>
            <HogwartsCape
                width={WOLF_BODY_WIDTH}
                height={HOGWARTS_CAPE_HEIGHT_AT_WOLF_WIDTH}
                {...props}
            />
        </g>
    );
}

export default function HogwartsCape({ className, color = '#1A1A1A', ...props }) {
    return (
        <svg className={className} width="1352" height="628" viewBox="0 0 1352 628" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 152">
                <g id="Rectangle 9" filter="url(#filter0_d_233_59)">
                    <path d="M199 131.47C199 72.9769 259.723 34.2597 312.755 58.9398L643.477 212.854C664.591 222.679 688.937 222.818 710.161 213.232L1056.07 57.0037C1109.02 33.0892 1169 71.8126 1169 129.912V459C1169 503.183 1133.18 539 1089 539H279C234.817 539 199 503.183 199 459V131.47Z" fill="white"/>
                    <path d="M1056.69 58.3711C1108.65 34.905 1167.5 72.9018 1167.5 129.912V459C1167.5 502.354 1132.35 537.5 1089 537.5H279C235.646 537.5 200.5 502.354 200.5 459V131.47C200.5 74.0735 260.085 36.0825 312.122 60.2998L642.845 214.214C664.354 224.224 689.157 224.365 710.778 214.6L1056.69 58.3711Z" stroke="white" strokeWidth="3"/>
                </g>
                <g id="Group 92">
                    <g id="Rectangle 45">
                        <path d="M549 513H792V588C697.11 598.595 643.893 598.366 549 588V513Z" fill="#5D1818"/>
                        <path d="M791.5 513.5V587.552C697.074 598.076 643.931 597.849 549.5 587.551V513.5H791.5Z" stroke="white"/>
                    </g>
                    <g id="Group 87" filter="url(#filter2_g_233_59)">
                        <g id="Group 85">
                            <path id="Union" d="M167.582 78.5664C311.01 38.0827 286.123 52.7825 296.726 85.5361C306.919 86.6939 317.179 89.4715 327.197 94.0527L561.365 201.135C596.005 216.975 618.637 251.118 619.736 289.191L626.302 516.646C628.117 579.534 572.099 628.456 510.027 618.19L198.877 566.732C173.137 562.475 154.997 539.142 157.217 513.147L174.627 309.314L142.813 331.067C129.137 340.419 110.222 337.084 100.566 323.62L4 188.952L166.878 77.5859L167.582 78.5664Z" fill={color}/>
                            <path id="Union_2" d="M175 4C186.701 4 197.836 6.11567 207.932 9.93164L206 8C454.547 105.074 623.808 206.841 620.818 281.212L629.572 286.789C626.734 285.177 623.808 283.564 620.783 281.948C620.7 283.449 620.547 284.94 620.321 286.418L591.816 267.784C521.769 236.287 405.901 201.466 177.439 148.968C176.629 148.988 175.816 149 175 149C129.16 149 92 116.541 92 76.5C92 36.4594 129.16 4 175 4Z" fill="#5D1818"/>
                        </g>
                        <g id="Group 86">
                            <path id="Union_3" d="M1183.99 82.5654C1040.56 42.0817 1065.45 56.7825 1054.85 89.5361C1044.65 90.6939 1034.39 93.4716 1024.38 98.0527L790.207 205.134C755.568 220.974 732.935 255.118 731.836 293.191L725.271 520.646C723.455 583.535 779.473 632.456 841.545 622.19L1152.7 570.731C1178.44 566.474 1196.58 543.142 1194.36 517.146L1176.95 313.313L1208.76 335.066C1222.44 344.418 1241.35 341.084 1251.01 327.619L1347.57 192.951L1184.69 81.585L1183.99 82.5654Z" fill={color}/>
                            <path id="Union_4" d="M1176.57 8C1164.87 8 1153.74 10.1157 1143.64 13.9316L1145.57 12C897.026 109.074 727.764 210.841 730.754 285.212L722 290.789C724.838 289.177 727.765 287.564 730.789 285.948C730.873 287.449 731.025 288.94 731.251 290.418L759.756 271.784C829.804 240.287 945.672 205.466 1174.13 152.968C1174.94 152.988 1175.76 153 1176.57 153C1222.41 153 1259.57 120.541 1259.57 80.5C1259.57 40.4594 1222.41 8 1176.57 8Z" fill="#5D1818"/>
                        </g>
                    </g>
                </g>
            </g>
            <defs>
                <filter id="filter0_d_233_59" x="195" y="49.8203" width="978" height="497.18" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="4"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_233_59"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_233_59" result="shape"/>
                </filter>
                <filter id="filter2_g_233_59" x="0" y="0" width="1351.57" height="627.557" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feTurbulence type="fractalNoise" baseFrequency="0.99900001287460327 0.99900001287460327" numOctaves="3" seed="9269" />
                    <feDisplacementMap in="shape" scale="8" xChannelSelector="R" yChannelSelector="G" result="displacedImage" width="100%" height="100%" />
                    <feMerge result="effect1_texture_233_59">
                        <feMergeNode in="displacedImage"/>
                    </feMerge>
                </filter>
            </defs>
        </svg>
    );
}

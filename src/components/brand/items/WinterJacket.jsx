const WOLF_BODY_WIDTH = 1280;
const WINTER_JACKET_WIDTH = 1347;
const WINTER_JACKET_HEIGHT = 657;
const WINTER_JACKET_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / WINTER_JACKET_WIDTH) * WINTER_JACKET_HEIGHT;

export function WinterJacketLayer({ transform, ...props }) {
    return (
        <g transform={transform}>
            <WinterJacket
                width={WOLF_BODY_WIDTH}
                height={WINTER_JACKET_HEIGHT_AT_WOLF_WIDTH}
                {...props}
            />
        </g>
    );
}

export default function WinterJacket({ className, color = '#394F32', ...props }) {
    return (
        <svg className={className} width="1347" height="657" viewBox="0 0 1347 657" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 151">
                <g id="Rectangle 9" filter="url(#filter0_d_233_56)">
                    <path d="M195 168.47C195 109.977 255.723 71.2597 308.755 95.9398L639.477 249.854C660.591 259.679 684.937 259.818 706.161 250.232L1052.07 94.0037C1105.02 70.0892 1165 108.813 1165 166.912V496C1165 540.183 1129.18 576 1085 576H275C230.817 576 195 540.183 195 496V168.47Z" fill={color}/>
                    <path d="M1052.69 95.3711C1104.65 71.905 1163.5 109.902 1163.5 166.912V496C1163.5 539.354 1128.35 574.5 1085 574.5H275C231.646 574.5 196.5 539.354 196.5 496V168.47C196.5 111.074 256.085 73.0825 308.122 97.2998L638.845 251.214C660.354 261.224 685.157 261.365 706.778 251.6L1052.69 95.3711Z" stroke="#CEB88B" strokeWidth="3"/>
                </g>
                <g id="Group 129">
                    <foreignObject x="538" y="564.001" width="251" height="90.8604"><div xmlns="http://www.w3.org/1999/xhtml" style={{ backdropFilter: 'blur(2px)', clipPath: 'url(#bgblur_0_233_56_clip_path)', height: '100%', width: '100%' }}></div></foreignObject><path id="Rectangle 46" data-figma-bg-blur-radius="4" d="M542 568.001H785V643.001C690.11 653.596 636.893 653.367 542 643.001V568.001Z" fill="#141414"/>
                    <g id="Group 127">
                        <g id="Union" filter="url(#filter2_f_233_56)">
                            <path d="M154.947 107.467C299.162 66.7359 274.174 81.4313 284.795 114.239C294.988 115.397 305.248 118.175 315.266 122.756L549.433 229.837C584.073 245.677 606.706 279.821 607.805 317.894L614.371 545.348C616.186 608.237 560.169 657.159 498.096 646.893L186.946 595.434C161.206 591.177 143.065 567.845 145.286 541.85L162.696 338.016L130.882 359.769C117.206 369.121 98.2906 365.787 88.6354 352.323L9.5514 242.034C-0.103539 228.57 3.15665 210.074 16.8336 200.723L130.182 123.221C133.664 120.84 137.486 119.283 141.408 118.505C145.505 114.511 150.022 110.812 154.947 107.467ZM1144.93 134.75L1140.93 217.751L1139.93 217.702L1143.93 134.702L1144.93 134.75Z" fill={color}/>
                        </g>
                        <ellipse id="Ellipse 65" cx="160.5" cy="104.233" rx="88.5" ry="89" fill="#E1D3AE"/>
                        <path id="Polygon 12" d="M579.496 247.174C581.414 248.297 580.342 251.243 578.15 250.871L132.039 175.086C124.605 173.823 121.19 165.101 125.79 159.127L167.875 104.467L219.027 38.0282C219.642 37.2301 220.754 37.0135 221.623 37.5226L579.496 247.174Z" fill="#E1D3AE"/>
                    </g>
                    <g id="Group 128">
                        <g id="Union_2" filter="url(#filter3_f_233_56)">
                            <path d="M1191.99 111.457C1047.77 70.7257 1072.76 85.4221 1062.14 118.23C1051.94 119.388 1041.69 122.165 1031.67 126.746L797.499 233.828C762.86 249.668 740.226 283.811 739.127 321.884L732.562 549.339C730.746 612.228 786.765 661.149 848.837 650.883L1159.99 599.425C1185.73 595.168 1203.87 571.836 1201.65 545.84L1184.24 342.005L1216.05 363.759C1229.73 373.111 1248.64 369.777 1258.3 356.313L1337.38 246.024C1347.04 232.56 1343.78 214.064 1330.1 204.713L1216.75 127.211C1213.27 124.83 1209.45 123.273 1205.53 122.495C1201.43 118.501 1196.91 114.801 1191.99 111.457ZM202 138.741L206 221.742L206.999 221.693L202.999 138.693L202 138.741Z" fill={color}/>
                        </g>
                        <ellipse id="Ellipse 65_2" cx="88.5" cy="89" rx="88.5" ry="89" transform="matrix(-1 0 0 1 1274.93 19.2246)" fill="#E1D3AE"/>
                        <path id="Polygon 12_2" d="M767.437 251.165C765.519 252.289 766.591 255.235 768.783 254.862L1214.89 179.077C1222.33 177.814 1225.74 169.092 1221.14 163.118L1179.06 108.458L1127.91 42.0194C1127.29 41.2213 1126.18 41.0047 1125.31 41.5138L767.437 251.165Z" fill="#E1D3AE"/>
                    </g>
                </g>
            </g>
            <defs>
                <filter id="filter0_d_233_56" x="191" y="86.8203" width="978" height="497.18" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="4"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_233_56"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_233_56" result="shape"/>
                </filter>
                <clipPath id="bgblur_0_233_56_clip_path" transform="translate(-538 -564.001)"><path d="M542 568.001H785V643.001C690.11 653.596 636.893 653.367 542 643.001V568.001Z"/>
                </clipPath><filter id="filter2_f_233_56" x="0" y="78.7021" width="1148.93" height="573.558" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_233_56"/>
            </filter>
                <filter id="filter3_f_233_56" x="198" y="82.6924" width="1148.93" height="573.558" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_233_56"/>
                </filter>
            </defs>
        </svg>
    );
}

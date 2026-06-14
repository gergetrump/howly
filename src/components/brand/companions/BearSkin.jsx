const BODY_TO_WOLF = 'translate(0.1544 -13.7806) scale(0.9926445 1.1415511)';

const LIMB_COLOR = '#5e4128';

const EYE_SHIFT = 60;
const MOUTH_SHIFT = 60;

export function BearSkin({ part = 'back' }) {
    if (part === 'front') {
        return null;
    }

    return (
        <>

            <g>
                {/* Front left leg */}
                <circle cx="486.999" cy="1228" r="100" transform="rotate(-90 486.999 1228)" fill={LIMB_COLOR} />
                <circle cx="486.999" cy="1428" r="100" transform="rotate(-90 486.999 1428)" fill={LIMB_COLOR} />
                <rect x="386.999" y="1428" width="200" height="200" transform="rotate(-90 386.999 1428)" fill={LIMB_COLOR} />

                {/* Front right leg */}
                <circle cx="904.997" cy="1229" r="100" transform="rotate(-90 904.997 1229)" fill={LIMB_COLOR} />
                <circle cx="904.997" cy="1429" r="100" transform="rotate(-90 904.997 1429)" fill={LIMB_COLOR} />
                <rect x="804.997" y="1429" width="200" height="200" transform="rotate(-90 804.997 1429)" fill={LIMB_COLOR} />

                {/* Back right leg (right arm) */}
                <ellipse cx="1165.45" cy="969.455" rx="75" ry="75" transform="rotate(-145 1165.45 969.455)" fill={LIMB_COLOR} />
                <ellipse cx="1288.33" cy="1055.49" rx="75" ry="75" transform="rotate(-145 1288.33 1055.49)" fill={LIMB_COLOR} />
                <rect x="1245.31" y="1116.93" width="150" height="150" transform="rotate(-145 1245.31 1116.93)" fill={LIMB_COLOR} />

                {/* Back left leg (left arm) */}
                <ellipse cx="75" cy="75" rx="75" ry="75" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 208.909 1073.91)" fill={LIMB_COLOR} />
                <ellipse cx="75" cy="75" rx="75" ry="75" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 86.0364 1159.95)" fill={LIMB_COLOR} />
                <rect width="150" height="150" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 147.473 1116.93)" fill={LIMB_COLOR} />
            </g>


            <g transform={BODY_TO_WOLF}>
                {/* Ohren */}
                <ellipse cx="239.5" cy="166.5" rx="174.5" ry="166.5" fill={LIMB_COLOR} />
                <ellipse cx="1192.5" cy="166.5" rx="174.5" ry="166.5" transform="rotate(-180 1192.5 166.5)" fill={LIMB_COLOR} />

                {/* Wangen-Fell (Seiten-Büschel, hinter dem Körper) */}
                <ellipse cx="184" cy="772" rx="58" ry="40" fill="#75503C" />
                <ellipse cx="176" cy="846" rx="50" ry="34" fill="#75503C" />
                <ellipse cx="1218" cy="772" rx="58" ry="40" fill="#75503C" />
                <ellipse cx="1226" cy="846" rx="50" ry="34" fill="#75503C" />

                {/* Gesicht / Körper */}
                <rect x="197.295" y="168" width="1007.41" height="1007.41" rx="100" fill="#75503C" />

                {/* Schnauze + Nase  */}
                <g transform={`translate(0 ${-MOUTH_SHIFT})`}>
                    {/* Schnauze (weiße Unterlage) */}
                    <g>
                        <ellipse cx="777.5" cy="778.955" rx="72.5" ry="101.488" fill="white" />
                        <ellipse cx="632.5" cy="778.955" rx="72.5" ry="101.488" fill="white" />
                        <rect x="632.5" y="677.468" width="145" height="202.975" fill="white" />
                    </g>

                    {/* Schnauze (creme Maulpartie) */}
                    <g>
                        <ellipse cx="777.5" cy="778.955" rx="72.5" ry="101.488" fill="#F4EFE5" />
                        <ellipse cx="705.242" cy="827.91" rx="72.5" ry="120.398" transform="rotate(89.3264 705.242 827.91)" fill="#F4EFE5" />
                        <ellipse cx="632.5" cy="778.955" rx="72.5" ry="101.488" fill="#F4EFE5" />
                        <rect x="632.5" y="677.468" width="145" height="202.975" fill="#F4EFE5" />
                    </g>

                    {/* Nase */}
                    <ellipse cx="700" cy="750.521" rx="60" ry="35.5207" fill="#341F13" />
                </g>

                {/* Augen */}
                <g transform={`translate(0 ${-EYE_SHIFT})`}>
                    {/* Rechtes Auge */}
                    <g>
                        <path d="M1165.49 565.955C1202.85 649.786 1204.52 751.607 1109.49 793.955C1014.47 836.302 937.849 784.284 900.49 700.453C863.131 616.622 846.465 518.802 941.49 476.454C1036.52 434.107 1128.13 482.124 1165.49 565.955Z" fill="#341F13" />
                        <ellipse cx="1031.88" cy="638.875" rx="96.8751" ry="96.8749" fill="#F4EFE5" />
                        <path d="M1115.83 639.413C1115.83 685.485 1078.48 722.833 1032.41 722.833C986.34 722.833 948.992 685.485 948.992 639.413C948.992 593.342 986.34 555.993 1032.41 555.993C1078.48 555.993 1115.83 593.342 1115.83 639.413Z" fill="#2C2A27" />
                        <path d="M1089.58 640.777C1089.58 672.739 1063.67 698.65 1031.71 698.65C999.744 698.65 973.834 672.739 973.834 640.777C973.834 608.815 999.744 582.904 1031.71 582.904C1063.67 582.904 1089.58 608.815 1089.58 640.777Z" fill="#161514" />
                        <path d="M1013.17 602.571C1013.17 613.432 1004.36 622.237 993.5 622.237C982.639 622.237 973.834 613.432 973.834 602.571C973.834 591.709 982.639 582.904 993.5 582.904C1004.36 582.904 1013.17 591.709 1013.17 602.571Z" fill="#5F5D5A" />
                        <path d="M1079.41 693.658C1079.41 698.803 1075.24 702.974 1070.1 702.974C1064.95 702.974 1060.78 698.803 1060.78 693.658C1060.78 688.514 1064.95 684.343 1070.1 684.343C1075.24 684.343 1079.41 688.514 1079.41 693.658Z" fill="#5F5D5A" />
                    </g>

                    {/* Linkes Auge */}
                    <g>
                        <path d="M242.492 565.955C205.133 649.786 203.467 751.607 298.492 793.955C393.517 836.302 470.133 784.284 507.492 700.453C544.851 616.622 561.517 518.802 466.492 476.454C371.467 434.107 279.851 482.124 242.492 565.955Z" fill="#341F13" />
                        <ellipse cx="96.8751" cy="96.8749" rx="96.8751" ry="96.8749" transform="matrix(-1 0 0 1 472.982 542)" fill="#F4EFE5" />
                        <path d="M292.15 639.413C292.15 685.485 329.499 722.833 375.57 722.833C421.642 722.833 458.99 685.485 458.99 639.413C458.99 593.342 421.642 555.993 375.57 555.993C329.499 555.993 292.15 593.342 292.15 639.413Z" fill="#2C2A27" />
                        <path d="M318.403 640.777C318.403 672.739 344.314 698.65 376.276 698.65C408.238 698.65 434.149 672.739 434.149 640.777C434.149 608.815 408.238 582.904 376.276 582.904C344.314 582.904 318.403 608.815 318.403 640.777Z" fill="#161514" />
                        <path d="M394.815 602.571C394.815 613.432 403.62 622.237 414.482 622.237C425.343 622.237 434.148 613.432 434.148 602.571C434.148 591.709 425.343 582.904 414.482 582.904C403.62 582.904 394.815 591.709 394.815 602.571Z" fill="#5F5D5A" />
                        <path d="M328.57 693.658C328.57 698.803 332.741 702.974 337.885 702.974C343.03 702.974 347.201 698.803 347.201 693.658C347.201 688.514 343.03 684.343 337.885 684.343C332.741 684.343 328.57 688.514 328.57 693.658Z" fill="#5F5D5A" />
                    </g>
                </g>

                {/* Mund: senkrechte Mittellinie + Lächeln  */}
                <g transform={`translate(0 ${-MOUTH_SHIFT})`}>
                    <line x1="704" y1="856" x2="704" y2="749" stroke="#341F13" strokeWidth="10" />
                    <path d="M640 820C693.377 870.773 720.234 865.145 765 820" stroke="#341F13" strokeWidth="10" fill="none" />
                </g>
            </g>
        </>
    );
}

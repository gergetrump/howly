export function HatWithPompomLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <HatWithPompom width="1096" height="723" {...props} />
        </g>
    );
}

export default function HatWithPompom({ className, color = '#32326F', pompomColor =  '#32326F', ...props }) {
    return (
        <svg className={className} width="1096" height="723" viewBox="0 0 1096 723" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 132">
                <g id="Group 130">
                    <g id="Rectangle 29" filter="url(#filter0_f_179_69)">
                        <rect x="4" y="554.77" width="1088" height="163.951" rx="20" fill={color}/>
                        <rect x="6.5" y="557.27" width="1083" height="158.951" rx="17.5" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Ellipse 64" filter="url(#filter1_f_179_69)">
                        <path d="M1061.25 557.114H36.2148C36.2148 369.551 265.676 217.501 548.732 217.501C831.787 217.501 1061.25 369.551 1061.25 557.114Z" fill={color}/>
                        <path d="M548.731 220.001C689.837 220.001 817.471 257.905 909.755 319.056C1001.23 379.668 1057.72 462.922 1058.73 554.614H38.7305C39.7398 462.922 96.2364 379.668 187.708 319.056C279.991 257.905 407.626 220.001 548.731 220.001Z" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 60" filter="url(#filter2_f_179_69)">
                        <line x1="103.146" y1="557.112" x2="103.146" y2="718.721" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 72" filter="url(#filter3_f_179_69)">
                        <path d="M542.876 221.605L542.057 219.469C405.415 249.94 308.03 287.103 244.83 340.216C181.529 393.415 152.803 462.372 152.803 555.868L155.559 555.943L158.314 556.018C158.314 463.312 186.759 395.537 248.874 343.336C311.089 291.049 407.363 254.144 543.696 223.742L542.876 221.605Z" fill="#22301E"/>
                    </g>
                    <g id="Line 80" filter="url(#filter4_f_179_69)">
                        <path d="M559.606 221.519L560.425 219.383C697.067 249.855 794.452 287.017 857.652 340.131C920.953 393.329 949.679 462.286 949.679 555.782L946.923 555.857L944.168 555.932C944.168 463.226 915.722 395.451 853.608 343.25C791.393 290.963 695.119 254.058 558.786 223.656L559.606 221.519Z" fill="#22301E"/>
                    </g>
                    <g id="Line 78" filter="url(#filter5_f_179_69)">
                        <path d="M543.608 222.77L542.713 220.651C334.705 272.413 240.191 415.495 255.317 557.227L258.062 557.112L260.808 556.997C245.884 417.163 339.039 276.017 544.504 224.888L543.608 222.77Z" fill="#22301E"/>
                    </g>
                    <g id="Line 81" filter="url(#filter6_f_179_69)">
                        <path d="M539.95 219.846L538.363 217.992C352.855 317.968 352.073 466.351 351.221 554.678L353.976 554.77L356.731 554.863C357.583 466.536 358.493 320.347 541.537 221.699L539.95 219.846Z" fill="#22301E"/>
                    </g>
                    <g id="Line 83" filter="url(#filter7_f_179_69)">
                        <path d="M542.489 219.877L540.123 218.678C417.415 380.658 446.214 518.149 439.113 554.352L441.835 554.769L444.557 555.186C451.96 517.445 422.864 382.11 544.856 221.075L542.489 219.877Z" fill="#22301E"/>
                    </g>
                    <g id="Line 85" filter="url(#filter8_f_179_69)">
                        <path d="M539.94 219.837L537.246 219.299C518.33 289.556 516.437 377.02 520.201 445.374C522.083 479.568 525.384 509.036 528.698 529.248C530.353 539.338 532.021 547.186 533.535 552.176C534.273 554.606 535.039 556.588 535.869 557.805C536.088 558.126 536.37 558.481 536.732 558.799C537.073 559.098 537.681 559.536 538.579 559.719C539.618 559.929 540.565 559.704 541.245 559.305C541.832 558.96 542.185 558.514 542.394 558.192L539.944 557.112L537.494 556.033C537.465 556.077 537.569 555.889 537.897 555.696C538.317 555.449 538.995 555.27 539.755 555.424C540.373 555.55 540.693 555.828 540.736 555.866C540.801 555.923 540.775 555.916 540.68 555.776C540.251 555.148 539.627 553.702 538.887 551.264C537.446 546.517 535.809 538.862 534.162 528.816C530.872 508.757 527.583 479.42 525.706 445.329C521.95 377.114 523.864 290.091 542.634 220.376L539.94 219.837Z" fill="#22301E"/>
                    </g>
                    <g id="Line 86" filter="url(#filter9_f_179_69)">
                        <path d="M540.368 222.183L542.993 221.438C571.415 292.131 584.785 378.347 589.901 445.305C592.46 478.796 592.957 507.522 592.231 527.14C591.868 536.931 591.198 544.526 590.307 549.328C589.877 551.645 589.35 553.598 588.614 554.809C588.417 555.133 588.138 555.519 587.737 555.866C587.335 556.213 586.642 556.661 585.646 556.777C584.602 556.899 583.76 556.596 583.217 556.268C582.71 555.961 582.363 555.58 582.129 555.274L584.49 554.068L586.851 552.863C586.907 552.936 586.847 552.829 586.624 552.694C586.365 552.538 585.803 552.303 585.035 552.393C584.316 552.477 583.895 552.792 583.763 552.907C583.63 553.021 583.615 553.077 583.678 552.973C583.982 552.474 584.421 551.171 584.857 548.821C585.698 544.288 586.361 536.906 586.722 527.158C587.443 507.701 586.951 479.113 584.401 445.726C579.297 378.926 565.966 293.125 537.743 222.929L540.368 222.183Z" fill="#22301E"/>
                    </g>
                    <g id="Line 84" filter="url(#filter10_f_179_69)">
                        <path d="M549.071 223.355L551.438 222.156C674.145 384.137 645.347 521.627 652.448 557.83L649.725 558.248L647.003 558.665C639.601 520.924 668.696 385.589 546.705 224.554L549.071 223.355Z" fill="#22301E"/>
                    </g>
                    <g id="Line 82" filter="url(#filter11_f_179_69)">
                        <path d="M546.723 219.381L548.306 217.526C736.222 318.404 735.529 469.88 735.513 560.035L732.758 560.11L730.002 560.185C730.019 470.008 730.551 320.77 545.139 221.236L546.723 219.381Z" fill="#22301E"/>
                    </g>
                    <g id="Line 79" filter="url(#filter12_f_179_69)">
                        <path d="M545.426 220.777L546.322 218.659C754.33 270.421 848.844 413.503 833.717 555.235L830.972 555.12L828.227 555.005C843.151 415.171 749.995 274.025 544.531 222.896L545.426 220.777Z" fill="#22301E"/>
                    </g>
                    <g id="Line 61" filter="url(#filter13_f_179_69)">
                        <line x1="201.256" y1="557.112" x2="201.256" y2="718.721" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 62" filter="url(#filter14_f_179_69)">
                        <line x1="303.76" y1="557.112" x2="303.76" y2="718.721" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 63" filter="url(#filter15_f_179_69)">
                        <line x1="407.727" y1="555.941" x2="407.727" y2="717.55" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 64" filter="url(#filter16_f_179_69)">
                        <line x1="513.159" y1="554.77" x2="513.159" y2="716.378" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 65" filter="url(#filter17_f_179_69)">
                        <line x1="614.198" y1="557.112" x2="614.198" y2="718.721" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 66" filter="url(#filter18_f_179_69)">
                        <line x1="715.237" y1="557.112" x2="715.237" y2="718.721" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 67" filter="url(#filter19_f_179_69)">
                        <line x1="825.062" y1="557.112" x2="825.062" y2="718.721" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 68" filter="url(#filter20_f_179_69)">
                        <line x1="931.959" y1="554.77" x2="931.959" y2="716.378" stroke="#22301E" strokeWidth="5"/>
                    </g>
                    <g id="Line 69" filter="url(#filter21_f_179_69)">
                        <line x1="1024.21" y1="557.112" x2="1024.21" y2="718.721" stroke="#22301E" strokeWidth="5"/>
                    </g>
                </g>
                <g id="Ellipse 92" filter="url(#filter22_f_179_69)">
                    <ellipse cx="547.5" cy="134.5" rx="144.5" ry="130.5" fill={pompomColor}/>
                    <path d="M547.5 6.5C626.17 6.5 689.5 64.0411 689.5 134.5C689.5 204.959 626.17 262.5 547.5 262.5C468.83 262.5 405.5 204.959 405.5 134.5C405.5 64.0411 468.83 6.5 547.5 6.5Z" stroke="#22301E" strokeWidth="5"/>
                </g>
            </g>
            <defs>
                <filter id="filter0_f_179_69" x="0" y="550.77" width="1096" height="171.951" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter1_f_179_69" x="32.2148" y="213.501" width="1033.03" height="347.613" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter2_f_179_69" x="96.646" y="553.112" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter3_f_179_69" x="148.803" y="215.469" width="398.892" height="344.55" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter4_f_179_69" x="554.786" y="215.383" width="398.893" height="344.55" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter5_f_179_69" x="249.753" y="216.651" width="298.75" height="344.575" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter6_f_179_69" x="347.221" y="213.992" width="198.316" height="344.87" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter7_f_179_69" x="435.113" y="214.678" width="113.743" height="344.509" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter8_f_179_69" x="514.611" y="215.299" width="32.0234" height="348.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter9_f_179_69" x="533.743" y="217.438" width="62.792" height="343.367" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter10_f_179_69" x="542.705" y="218.156" width="113.742" height="344.509" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter11_f_179_69" x="541.14" y="213.525" width="198.374" height="350.659" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter12_f_179_69" x="540.53" y="214.659" width="298.751" height="344.575" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter13_f_179_69" x="194.756" y="553.112" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter14_f_179_69" x="297.26" y="553.112" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter15_f_179_69" x="401.227" y="551.941" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter16_f_179_69" x="506.659" y="550.77" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter17_f_179_69" x="607.698" y="553.112" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter18_f_179_69" x="708.737" y="553.112" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter19_f_179_69" x="818.562" y="553.112" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter20_f_179_69" x="925.459" y="550.77" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter21_f_179_69" x="1017.71" y="553.112" width="13" height="169.609" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
                <filter id="filter22_f_179_69" x="399" y="0" width="297" height="269" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_179_69"/>
                </filter>
            </defs>
        </svg>
    );
}

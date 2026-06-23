export function HatLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Hat width="1430" height="574" {...props} />
        </g>
    );
}

export default function Hat({ className, color = '#4C4C4C', ...props }) {
    return (
        <svg className={className} width="1430" height="574" viewBox="0 0 1430 574" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 124">
                <g id="Ellipse 90" filter="url(#filter0_f_178_537)">
                    <ellipse cx="715" cy="443.901" rx="711" ry="126.099" fill={color}/>
                    <path d="M715 320.303C911.237 320.303 1088.83 334.41 1217.32 357.197C1281.58 368.594 1333.43 382.142 1369.16 397.124C1387.03 404.619 1400.73 412.415 1409.92 420.377C1419.12 428.353 1423.5 436.223 1423.5 443.901C1423.5 451.58 1419.12 459.45 1409.92 467.426C1400.73 475.388 1387.03 483.184 1369.16 490.679C1333.43 505.66 1281.58 519.207 1217.32 530.604C1088.83 553.391 911.237 567.5 715 567.5C518.763 567.5 341.166 553.391 212.684 530.604C148.422 519.207 96.5697 505.66 60.8408 490.679C42.9659 483.184 29.269 475.388 20.082 467.426C10.8798 459.45 6.50004 451.58 6.5 443.901C6.5 436.223 10.8798 428.353 20.082 420.377C29.269 412.415 42.9659 404.619 60.8408 397.124C96.5697 382.142 148.422 368.594 212.684 357.197C341.166 334.41 518.763 320.303 715 320.303Z" stroke="black" strokeWidth="5"/>
                </g>
                <g id="Rectangle 60" filter="url(#filter1_f_178_537)">
                    <path d="M198.766 76.5549C198.766 73.9367 201.305 72.0415 203.839 72.6978C606.607 176.995 830.765 174.71 1219.87 72.7162C1222.41 72.0511 1224.95 73.9477 1224.95 76.5708V435.054C1224.95 437.016 1223.49 438.695 1221.55 439.008C826.362 502.875 601.914 503.697 202.168 439.009C200.232 438.696 198.766 437.016 198.766 435.054V76.5549Z" fill={color}/>
                    <path d="M201.266 76.5547C201.266 75.6347 202.2 74.8558 203.213 75.1182C404.707 127.295 561.666 152.85 716.982 152.566C872.3 152.283 1025.84 126.16 1220.5 75.1348C1221.51 74.8697 1222.45 75.646 1222.45 76.5703V435.054C1222.45 435.757 1221.91 436.418 1221.15 436.54C829.311 499.866 605.56 501.169 211.898 438.044L202.567 436.541C201.809 436.418 201.266 435.757 201.266 435.055V76.5547Z" stroke="black" strokeWidth="5"/>
                </g>
                <g id="Ellipse 91" filter="url(#filter2_f_178_537)">
                    <ellipse cx="711.858" cy="88.7074" rx="513.093" ry="84.7074" fill={color}/>
                    <path d="M711.858 6C853.471 6 981.629 15.4769 1074.34 30.7832C1120.72 38.439 1158.13 47.5388 1183.9 57.5986C1196.8 62.6325 1206.67 67.8626 1213.27 73.1924C1219.9 78.5438 1222.95 83.741 1222.95 88.707C1222.95 93.6733 1219.9 98.871 1213.27 104.223C1206.67 109.552 1196.8 114.782 1183.9 119.816C1158.13 129.876 1120.72 138.975 1074.34 146.631C981.629 161.937 853.471 171.415 711.858 171.415C570.246 171.415 442.087 161.937 349.373 146.631C303 138.975 265.588 129.876 239.814 119.816C226.918 114.782 217.051 109.552 210.445 104.223C203.812 98.871 200.766 93.6733 200.766 88.707C200.766 83.741 203.812 78.5438 210.445 73.1924C217.051 67.8626 226.918 62.6325 239.814 57.5986C265.588 47.5388 303 38.439 349.373 30.7832C442.087 15.4769 570.246 6 711.858 6Z" stroke="black" strokeWidth="4"/>
                </g>
            </g>
            <defs>
                <filter id="filter0_f_178_537" x="0" y="313.803" width="1430" height="260.197" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_178_537"/>
                </filter>
                <filter id="filter1_f_178_537" x="194.766" y="68.5674" width="1034.19" height="422.649" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_178_537"/>
                </filter>
                <filter id="filter2_f_178_537" x="194.766" y="0" width="1034.19" height="177.415" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_178_537"/>
                </filter>
            </defs>
        </svg>
    );
}

export default function DrinkTogo({ className, color = '#F6F3EB', ...props }) {
    return (
        <svg className={className} width="329" height="426" viewBox="0 0 329 426" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 146">
                <g id="Group 145" filter="url(#filter0_f_181_150)">
                    <path id="Rectangle 65" d="M100.09 34.6508C183.899 79.0003 231.874 93.6494 315.886 99.6434L186.301 395.273L43.1886 352.228L100.09 34.6508Z" fill={color} stroke="#BDB5A7" strokeWidth="4"/>
                    <path id="Rectangle 66" d="M186.901 401.161C156.687 400.264 133.489 397.445 111.169 390.78C88.8347 384.11 67.279 373.558 40.3875 357.085L44.0433 344.93C70.2619 360.286 91.6905 370.485 114.202 377.251C136.714 384.017 160.219 387.324 190.56 388.997L186.901 401.161Z" fill={color} stroke="#BDB5A7" strokeWidth="4"/>
                    <path id="Ellipse 99" d="M217.66 35.0389C247.944 44.1477 274.229 55.8973 292.241 67.4835C301.259 73.2842 308.103 78.9806 312.351 84.2062C316.65 89.4956 317.963 93.8776 316.942 97.2727C315.921 100.668 312.408 103.599 305.904 105.639C299.479 107.654 290.628 108.629 279.906 108.493C258.491 108.22 230.086 103.52 199.802 94.4114C169.518 85.3026 143.232 73.553 125.221 61.9668C116.203 56.1661 109.358 50.4697 105.111 45.2441C100.811 39.9546 99.4984 35.5727 100.52 32.1776C101.541 28.7824 105.053 25.8518 111.557 23.8117C117.983 21.7964 126.834 20.821 137.555 20.9574C158.97 21.2299 187.376 25.9301 217.66 35.0389Z" fill={color} stroke="#BDB5A7" strokeWidth="4"/>
                    <path id="Ellipse 100" d="M238.23 67.3321C243.324 68.8645 247.581 71.1059 250.352 73.4114C251.74 74.5668 252.678 75.6745 253.194 76.6392C253.704 77.5937 253.736 78.2708 253.595 78.7412C253.453 79.2117 253.053 79.7586 252.101 80.2733C251.139 80.7936 249.745 81.2 247.95 81.3978C244.367 81.7923 239.58 81.3136 234.485 79.7812C229.391 78.2488 225.134 76.0075 222.363 73.7019C220.975 72.5465 220.037 71.4388 219.521 70.4741C219.011 69.5196 218.979 68.8425 219.12 68.3721C219.262 67.9017 219.662 67.3547 220.614 66.84C221.576 66.3198 222.97 65.9133 224.765 65.7155C228.348 65.321 233.135 65.7998 238.23 67.3321Z" fill={color} stroke="#BDB5A7" strokeWidth="4"/>
                </g>
                <path id="Rectangle 74" d="M81.0117 121.337L284.027 182.4L224.45 317.985L54.9506 267.004L81.0117 121.337Z" fill="#DDCEAF"/>
            </g>
            <defs>
                <filter id="filter0_f_181_150" x="34.0283" y="14.9443" width="289.245" height="392.262" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_181_150"/>
                </filter>
            </defs>
        </svg>
    );
}

export function DrinkTogoLayer({ transform = 'translate(1300 750)', ...props }) {
    return (
        <g transform={transform}>
            <DrinkTogo width="320" height="414" {...props} />
        </g>
    );
}

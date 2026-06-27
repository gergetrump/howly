export default function Diamond({ className, color = '#90D5FF', strokeColor = '#57B9FF', ...props }) {
    return (
        <svg
            className={className}
            width="143"
            height="129"
            viewBox="0 0 143 129"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g id="Group 153">
                <rect id="Rectangle 75" x="0.5" y="27.5" width="141" height="30" fill={color} stroke={strokeColor} />
                <path id="Polygon 21" d="M140.854 58.5H1.29395L71.0742 127.299L140.854 58.5Z" fill={color} stroke={strokeColor} />
                <path id="Polygon 22" d="M122.674 1L141.167 26.5H0.980469L19.4746 1H122.674Z" fill={color} stroke={strokeColor} />
                <line id="Line 113" x1="43.2336" y1="0.667409" x2="30.6674" y2="26.7664" stroke={strokeColor} strokeLinecap="round" />
                <line id="Line 119" x1="113.176" y1="57.6849" x2="71.6849" y2="127.824" stroke={strokeColor} strokeLinecap="round" />
                <line id="Line 116" x1="30.4836" y1="27.5159" x2="29.5159" y2="57.5164" stroke={strokeColor} strokeLinecap="round" />
                <line id="Line 117" x1="114.484" y1="27.5159" x2="113.516" y2="57.5164" stroke={strokeColor} strokeLinecap="round" />
                <line id="Line 114" x1="0.5" y1="-0.5" x2="29.4666" y2="-0.5" transform="matrix(0.433816 0.901002 0.901002 -0.433816 102 0)" stroke={strokeColor} strokeLinecap="round" />
                <line id="Line 118" x1="29.6841" y1="58.1787" x2="70.1787" y2="127.316" stroke={strokeColor} strokeLinecap="round" />
                <line id="Line 115" x1="71.496" y1="1.50395" x2="70.496" y2="127.504" stroke={strokeColor} strokeLinecap="round" />
            </g>
        </svg>
    );
}

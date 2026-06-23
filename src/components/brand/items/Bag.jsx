export default function Bag({ className,
                                color = '#F4EFE5',
                                strapColor = '#DDCEAF',
                                lockColor = '#CEB88B',
                                flapClosureColor = '#D7C6A2',...props }) {
    return (
        <svg className={className} width="1064" height="458" viewBox="0 0 1064 458" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 119">
                <g id="Group 117">
                    <rect id="Rectangle 58" x="641.5" y="244.5" width="348" height="212" rx="38.5" fill={color} stroke="#CEB88B" strokeWidth="3"/>
                    <path id="Line 97" d="M640.288 313.5C750.324 385.806 900.585 377.801 991.288 315.5" stroke="#CEB88B" strokeWidth="8" strokeLinecap="round"/>
                    <rect id="Rectangle 59" x="777.285" y="230" width="77" height="158" rx="38.5" fill={flapClosureColor}/>
                    <ellipse id="Ellipse 88" cx="815.785" cy="361.5" rx="24.5" ry="21.5" fill={lockColor}/>
                    <line id="Line 98" x1="802.285" y1="363.5" x2="830.285" y2="363.5" stroke="#AC9E81" strokeWidth="5"/>
                </g>
                <path id="Line 99" d="M16.1157 5C171.325 130.725 309.525 187.311 640.061 265.147" stroke={strapColor} strokeWidth="10" strokeLinecap="round"/>
                <line id="Line 100" x1="984.69" y1="262.968" x2="1057.97" y2="245.31" stroke={strapColor} strokeWidth="10" strokeLinecap="round"/>
            </g>
        </svg>
    );
}

export function BagLayer({ transform = 'translate(325 690)', ...props }) {
    return (
        <g transform={transform}>
            <Bag width="620" height="267" {...props} />
        </g>
    );
}

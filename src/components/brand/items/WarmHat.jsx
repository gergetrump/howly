const DEFAULT_WARM_HAT_COLOR = '#4A6741';

function darkenColor(hexColor, amount = 0.45) {
    const cleanHex = hexColor.replace('#', '');
    const red = parseInt(cleanHex.slice(0, 2), 16);
    const green = parseInt(cleanHex.slice(2, 4), 16);
    const blue = parseInt(cleanHex.slice(4, 6), 16);
    const darken = (channel) => Math.max(0, Math.round(channel * (1 - amount)));

    return `#${[darken(red), darken(green), darken(blue)]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')}`;
}

export function WarmHatLayer({ transform, color, ...props }) {
    return (
        <g transform={transform} {...props}>
            <WarmHat width="1100" height="600" color={color} />
        </g>
    );
}

export default function WarmHat({
    className,
    width = 1096,
    height = 550,
    color = DEFAULT_WARM_HAT_COLOR,
    ...props
}) {
    const seamColor = darkenColor(color, 0.45);

    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 1096 550"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <rect x="4" y="381.771" width="1088" height="163.951" rx="20" fill={color} />
            <rect x="6.5" y="384.271" width="1083" height="158.951" rx="17.5" stroke={seamColor} strokeWidth="5" />
            <path d="M1061.25 384.114H36.2148C36.2148 196.551 265.676 44.501 548.732 44.501C831.787 44.501 1061.25 196.551 1061.25 384.114Z" fill={color} />
            <path d="M548.731 47.001C689.837 47.001 817.471 84.9051 909.755 146.056C1001.23 206.668 1057.72 289.922 1058.73 381.614H38.7305C39.7398 289.922 96.2364 206.668 187.708 146.056C279.991 84.9052 407.626 47.001 548.731 47.001Z" stroke={seamColor} strokeWidth="5" />
            <line x1="103.146" y1="384.113" x2="103.146" y2="545.722" stroke={seamColor} strokeWidth="5" />
            <path d="M542.876 48.6062C269.901 109.48 155.558 196.742 155.558 382.944" stroke={seamColor} strokeWidth="5" />
            <path d="M559.606 48.5203C832.58 109.394 946.923 196.656 946.923 382.858" stroke={seamColor} strokeWidth="5" />
            <path d="M543.608 49.7715C336.872 101.217 243.037 243.331 258.062 384.114" stroke={seamColor} strokeWidth="5" />
            <path d="M539.95 46.8477C355.674 146.16 354.828 293.445 353.976 381.772" stroke={seamColor} strokeWidth="5" />
            <path d="M542.49 46.8785C420.14 208.386 449.087 344.799 441.836 381.771" stroke={seamColor} strokeWidth="5" />
            <path d="M539.94 46.8391C502.254 186.812 532.326 395.813 539.944 384.114" stroke={seamColor} strokeWidth="5" />
            <path d="M540.368 49.1853C597.013 190.075 593.769 393.219 584.49 381.07" stroke={seamColor} strokeWidth="5" />
            <path d="M549.071 50.357C671.421 211.865 642.474 348.277 649.725 385.249" stroke={seamColor} strokeWidth="5" />
            <path d="M546.723 46.3819C733.386 146.588 732.774 296.945 732.758 387.111" stroke={seamColor} strokeWidth="5" />
            <path d="M545.426 47.7793C752.163 99.2248 845.997 241.339 830.972 382.122" stroke={seamColor} strokeWidth="5" />
            <line x1="201.256" y1="384.113" x2="201.256" y2="545.722" stroke={seamColor} strokeWidth="5" />
            <line x1="303.76" y1="384.113" x2="303.76" y2="545.722" stroke={seamColor} strokeWidth="5" />
            <line x1="407.727" y1="382.943" x2="407.727" y2="544.552" stroke={seamColor} strokeWidth="5" />
            <line x1="513.159" y1="381.771" x2="513.159" y2="543.38" stroke={seamColor} strokeWidth="5" />
            <line x1="614.198" y1="384.113" x2="614.198" y2="545.722" stroke={seamColor} strokeWidth="5" />
            <line x1="715.237" y1="384.113" x2="715.237" y2="545.722" stroke={seamColor} strokeWidth="5" />
            <line x1="825.062" y1="384.113" x2="825.062" y2="545.722" stroke={seamColor} strokeWidth="5" />
            <line x1="931.959" y1="381.771" x2="931.959" y2="543.38" stroke={seamColor} strokeWidth="5" />
            <line x1="1024.21" y1="384.113" x2="1024.21" y2="545.722" stroke={seamColor} strokeWidth="5" />
        </svg>
    );
}

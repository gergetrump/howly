export default function Scar({ className, color = '#555353', ...props }) {
    return (
        <svg className={className} width="99" height="218" viewBox="0 0 99 218" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 93">
                <path id="Union" d="M62.2109 46.8027L73.7314 76.9775L98.5 135.48L56.4668 118.703L44.9355 115.621L52.418 218L36.8652 171.197L25.3447 141.022L0.943359 83.3867L0 82.5195L0.636719 82.6641L0.576172 82.5195L1.33594 82.8223L53.5762 94.6846L46.6582 0L62.2109 46.8027Z" fill={color}/>
            </g>
        </svg>
    );
}

export function ScarLayer({ transform = 'translate(700 380) rotate(12)', ...props }) {
    return (
        <g transform={transform}>
            <Scar width="82" height="181" {...props} />
        </g>
    );
}

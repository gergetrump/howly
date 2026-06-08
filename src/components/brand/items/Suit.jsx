const WOLF_BODY_WIDTH = 1050;
const SUIT_WIDTH = 700;
const SUIT_HEIGHT = 541;
const SUIT_HEIGHT_AT_WOLF_WIDTH = (WOLF_BODY_WIDTH / SUIT_WIDTH) * SUIT_HEIGHT;

export function SuitLayer({ transform, ...props }) {
    return (
        <g transform={transform} {...props}>
            <Suit width={WOLF_BODY_WIDTH} height={SUIT_HEIGHT_AT_WOLF_WIDTH} />
        </g>
    );
}

export default function Suit({ className, ...props }) {
    return (
        <svg
            className={className}
            width="1036"
            height="389"
            viewBox="0 0 1036 389"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <g>
                <g>
                    <path d="M68.5 13.25H999.5V330.25H68.5V13.25Z" fill="#EEEEEE" />
                    <path d="M361.816 14.75H507.439L394.693 88.0371L361.816 14.75Z" fill="#E6E6E6" stroke="#D7D7D7" strokeWidth="3" />
                    <path d="M670.759 14.5H525.07L637.868 88.7734L670.759 14.5Z" fill="#E6E6E6" stroke="#D7D7D7" strokeWidth="3" />
                </g>
                <g>
                    <g>
                        <path d="M571.509 107.5H452.489L511.939 26.8418L571.509 107.5Z" fill="#670000" stroke="#670000" />
                        <path d="M571.543 13.5H452.456L511.938 99.124L571.543 13.5Z" fill="#670000" stroke="#670000" />
                        <path d="M494.5 72.4999L532 14.5" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <path d="M494.5 72.4999L532 14.5" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <path d="M484.5 60.5L510.036 13.4814" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <line x1="473.934" y1="40.9554" x2="489.455" y2="13.5655" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <path d="M463 29.5L472 13.5" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <line x1="506.953" y1="87.9505" x2="549.996" y2="13.5472" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <path d="M452.5 108H572.886V368.945H452.5V108Z" fill="#670000" />
                        <path d="M455.5 182L566.181 100" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <line x1="452.797" y1="155.9" x2="550.115" y2="82.7029" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <line x1="1.5" y1="-1.5" x2="66.5606" y2="-1.5" transform="matrix(0.814847 -0.579677 0.56187 0.827226 452.5 129.453)" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <line x1="1.5" y1="-1.5" x2="142.143" y2="-1.5" transform="matrix(0.819264 -0.573417 0.55562 0.831437 455.5 205.367)" stroke="#FFC000" strokeWidth="3" strokeLinecap="round" />
                        <line y1="-1.5" x2="143.643" y2="-1.5" transform="matrix(0.819264 -0.573417 0.55562 0.831437 455.5 258.367)" stroke="#FFC000" strokeWidth="3" />
                        <line y1="-1.5" x2="143.643" y2="-1.5" transform="matrix(0.819264 -0.573417 0.55562 0.831437 455.5 232.367)" stroke="#FFC000" strokeWidth="3" />
                    </g>
                </g>
                <path d="M0 60C0 26.8629 26.8629 0 60 0H348C372.222 0 394.068 14.5643 403.385 36.9231L460.529 174.068C480.61 222.263 548.404 223.589 570.353 176.216L635.887 34.7759C645.712 13.5706 666.956 0 690.327 0H976C1009.14 0 1036 26.8629 1036 60V329C1036 362.137 1009.14 389 976 389H60C26.8629 389 0 362.137 0 329V60Z" fill="#392E18" />
                <path d="M730.5 169H915V197H730.5V169Z" fill="black" />
            </g>
        </svg>
    );
}

export default function SakuraNeckclace({ className, ...props }) {
    return (
        <svg className={className} width="325" height="166" viewBox="0 0 325 166" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Group 121">
                <path id="Line 103" d="M2.5 2.5C129.698 151.319 199.705 148.79 322.502 2.5" stroke="#CEB88B" strokeWidth="5" strokeLinecap="round"/>
                <g id="Group 118">
                    <ellipse id="Ellipse 40" cx="12.4357" cy="4.52758" rx="12.4357" ry="4.52758" transform="matrix(-0.614725 -0.773479 -0.827295 0.583848 164.978 123.66)" fill="#F6BBC7"/>
                    <ellipse id="Ellipse 41" cx="12.4679" cy="4.51512" rx="12.4679" ry="4.51512" transform="matrix(-1.00501 -0.103008 -0.0908639 0.984681 159.235 125.816)" fill="#F6BBC7"/>
                    <ellipse id="Ellipse 43" cx="12.4357" cy="4.52758" rx="12.4357" ry="4.52758" transform="matrix(1.01137 0.0310644 -0.012068 0.987197 166.836 123.468)" fill="#F6BBC7"/>
                    <ellipse id="Ellipse 44" cx="12.4679" cy="4.51512" rx="12.4679" ry="4.51512" transform="matrix(0.671823 0.726636 -0.779321 0.644054 168.355 129.217)" fill="#F6BBC7"/>
                    <ellipse id="Ellipse 42" cx="11.9612" cy="4.70393" rx="11.9612" ry="4.70393" transform="matrix(0.528436 -0.851353 0.866921 0.49474 159.278 125.786)" fill="#F6BBC7"/>
                    <ellipse id="Ellipse 45" cx="11.9612" cy="4.70393" rx="11.9612" ry="4.70393" transform="matrix(-0.412039 0.908943 0.922544 0.390631 157.117 129.833)" fill="#F6BBC7"/>
                </g>
            </g>
        </svg>
    );
}

export function SakuraNeckclaceLayer({ transform = 'translate(545 690)', ...props }) {
    return (
        <g transform={transform}>
            <SakuraNeckclace width="440" height="225" {...props} />
        </g>
    );
}

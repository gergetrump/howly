export function HogwartsGrounds({ className, style }) {
    return (
        <svg
            className={className}
            style={style}
            viewBox="0 0 1600 400"
            preserveAspectRatio="xMidYMax slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path d="M0 400 L0 260 Q180 190 400 230 Q560 258 700 250 L700 400 Z" fill="#131b2e" />
            <path d="M900 400 L900 250 Q1080 210 1280 235 Q1460 255 1600 225 L1600 400 Z" fill="#131b2e" />
            <path d="M0 400 L0 310 Q220 260 460 292 Q700 322 940 300 Q1200 278 1440 305 Q1540 316 1600 308 L1600 400 Z" fill="#182238" />

            <g fill="#e8b23e">
                <rect x="118" y="286" width="4" height="5" rx="1" opacity="0.75" />
                <rect x="146" y="292" width="4" height="5" rx="1" opacity="0.55" />
                <rect x="171" y="284" width="4" height="5" rx="1" opacity="0.8" />
                <rect x="199" y="293" width="4" height="5" rx="1" opacity="0.6" />
                <rect x="228" y="287" width="4" height="5" rx="1" opacity="0.7" />
                <rect x="256" y="295" width="4" height="5" rx="1" opacity="0.5" />
                <rect x="287" y="290" width="4" height="5" rx="1" opacity="0.75" />
            </g>

            <g>
                <path d="M1280 352 Q1280 300 1340 300 Q1400 300 1400 352 Z" fill="#1a2438" />
                <rect x="1268" y="348" width="144" height="14" rx="4" fill="#1a2438" />
                <rect x="1372" y="292" width="14" height="34" rx="3" fill="#1a2438" />
                <rect x="1330" y="330" width="11" height="16" rx="2" fill="#e8b23e" opacity="0.9" />
                <path d="M1379 286 Q1370 274 1381 264 Q1390 256 1383 244" stroke="#c3cddd" strokeWidth="5" strokeLinecap="round" opacity="0.28" fill="none" />
            </g>

            <path d="M0 342 Q260 330 520 340 Q820 352 1120 340 Q1380 330 1600 342 L1600 362 Q1380 350 1120 360 Q820 372 520 360 Q260 350 0 362 Z" fill="#c3cddd" opacity="0.07" />
            <path d="M0 372 Q300 362 600 371 Q940 381 1240 371 Q1440 365 1600 373 L1600 390 Q1440 382 1240 388 Q940 398 600 388 Q300 379 0 390 Z" fill="#c3cddd" opacity="0.05" />
        </svg>
    );
}

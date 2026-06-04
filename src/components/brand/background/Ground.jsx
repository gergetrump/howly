export function Ground() {
    return (
        <svg
            className="absolute bottom-0 left-0 right-0 z-[15] w-full"
            style={{ height: '120px' }}
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Main hill curve */}
            <path
                d="M0 80 Q200 30 400 55 Q600 80 800 45 Q1000 10 1200 50 Q1350 70 1440 60 L1440 120 L0 120 Z"
                fill="var(--color-howly-ground)"
            />
            {/* Subtle lighter ridge on top of the hill */}
            <path
                d="M0 85 Q200 38 400 60 Q600 82 800 50 Q1000 18 1200 55 Q1350 72 1440 65"
                stroke="var(--color-howly-ground-ridge)"
                strokeWidth="2"
                fill="none"
            />
        </svg>
    );
}

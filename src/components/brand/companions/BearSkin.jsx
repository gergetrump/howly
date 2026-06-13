// Brown bear companion skin, drawn on the shared companion skeleton (viewBox 0 0 1522 1564).
// The body rect, the eye anchors (387,680)/(1005,680) and the leg positions match
// WolfSkin so equipped items line up across companion types.
// `part="front"` = the nose, drawn on top of the equipped-item layer.
export function BearSkin({ part = 'back' }) {
    if (part === 'front') {
        // Nose (front layer, sits above equipped items).
        return <ellipse cx="696" cy="772" rx="58" ry="44" fill="#341F13" />;
    }

    return (
        <>
            {/* Ears (behind the body) */}
            <circle cx="360" cy="185" r="120" fill="#341F13" />
            <circle cx="1032" cy="185" r="120" fill="#341F13" />

            {/* Paws (behind the body) — same anchors as the wolf so shoes line up */}
            <g>
                {/* Front left leg */}
                <circle cx="486.999" cy="1228" r="100" transform="rotate(-90 486.999 1228)" fill="#341F13" />
                <circle cx="486.999" cy="1428" r="100" transform="rotate(-90 486.999 1428)" fill="#341F13" />
                <rect x="386.999" y="1428" width="200" height="200" transform="rotate(-90 386.999 1428)" fill="#341F13" />

                {/* Front right leg */}
                <circle cx="904.997" cy="1229" r="100" transform="rotate(-90 904.997 1229)" fill="#341F13" />
                <circle cx="904.997" cy="1429" r="100" transform="rotate(-90 904.997 1429)" fill="#341F13" />
                <rect x="804.997" y="1429" width="200" height="200" transform="rotate(-90 804.997 1429)" fill="#341F13" />

                {/* Back right leg */}
                <ellipse cx="1165.45" cy="969.455" rx="75" ry="75" transform="rotate(-145 1165.45 969.455)" fill="#341F13" />
                <ellipse cx="1288.33" cy="1055.49" rx="75" ry="75" transform="rotate(-145 1288.33 1055.49)" fill="#341F13" />
                <rect x="1245.31" y="1116.93" width="150" height="150" transform="rotate(-145 1245.31 1116.93)" fill="#341F13" />

                {/* Back left leg */}
                <ellipse cx="75" cy="75" rx="75" ry="75" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 208.909 1073.91)" fill="#341F13" />
                <ellipse cx="75" cy="75" rx="75" ry="75" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 86.0364 1159.95)" fill="#341F13" />
                <rect width="150" height="150" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 147.473 1116.93)" fill="#341F13" />
            </g>

            {/* Body */}
            <rect x="195.998" y="178" width="1000" height="1150" rx="100" fill="#75503C" />

            {/* Eyes (subtle dark-brown sockets + dark pupils) */}
            {/* Left */}
            <ellipse cx="387" cy="688" rx="82" ry="100" transform="rotate(-18 387 688)" fill="#341F13" />
            <ellipse cx="387" cy="688" rx="46" ry="60" transform="rotate(-18 387 688)" fill="#F4EFE5" />
            <circle cx="387" cy="682" r="33" fill="#161514" />
            <circle cx="375" cy="670" r="10" fill="#5F5D5A" />
            {/* Right */}
            <ellipse cx="1005" cy="688" rx="82" ry="100" transform="rotate(18 1005 688)" fill="#341F13" />
            <ellipse cx="1005" cy="688" rx="46" ry="60" transform="rotate(18 1005 688)" fill="#F4EFE5" />
            <circle cx="1005" cy="682" r="33" fill="#161514" />
            <circle cx="993" cy="670" r="10" fill="#5F5D5A" />

            {/* Muzzle (prominent cream snout) */}
            <rect x="556" y="726" width="280" height="186" rx="92" fill="#F4EFE5" />

            {/* Mouth (on the muzzle) */}
            <path d="M696 812V856" stroke="#341F13" strokeWidth="10" strokeLinecap="round" />
            <path d="M634 850Q696 900 758 850" stroke="#341F13" strokeWidth="10" fill="none" strokeLinecap="round" />
        </>
    );
}

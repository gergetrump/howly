// Panda companion skin, drawn on the shared companion skeleton (viewBox 0 0 1522 1564).
// The body rect, the eye anchors (387,680)/(1005,680) and the leg positions match
// WolfSkin so equipped items (hats, glasses, shoes, clothing) line up across types.
// `part="front"` = the nose, drawn on top of the equipped-item layer.
export function PandaSkin({ part = 'back' }) {
    if (part === 'front') {
        // Nose (front layer, sits above equipped items).
        return <ellipse cx="696" cy="778" rx="52" ry="40" fill="#2C2A27" />;
    }

    return (
        <>
            {/* Ears (behind the body) */}
            <circle cx="360" cy="175" r="128" fill="#2C2A27" />
            <circle cx="1032" cy="175" r="128" fill="#2C2A27" />

            {/* Paws (behind the body) — same anchors as the wolf so shoes line up */}
            <g>
                {/* Front left leg */}
                <circle cx="486.999" cy="1228" r="100" transform="rotate(-90 486.999 1228)" fill="#2C2A27" />
                <circle cx="486.999" cy="1428" r="100" transform="rotate(-90 486.999 1428)" fill="#2C2A27" />
                <rect x="386.999" y="1428" width="200" height="200" transform="rotate(-90 386.999 1428)" fill="#2C2A27" />

                {/* Front right leg */}
                <circle cx="904.997" cy="1229" r="100" transform="rotate(-90 904.997 1229)" fill="#2C2A27" />
                <circle cx="904.997" cy="1429" r="100" transform="rotate(-90 904.997 1429)" fill="#2C2A27" />
                <rect x="804.997" y="1429" width="200" height="200" transform="rotate(-90 804.997 1429)" fill="#2C2A27" />

                {/* Back right leg */}
                <ellipse cx="1165.45" cy="969.455" rx="75" ry="75" transform="rotate(-145 1165.45 969.455)" fill="#2C2A27" />
                <ellipse cx="1288.33" cy="1055.49" rx="75" ry="75" transform="rotate(-145 1288.33 1055.49)" fill="#2C2A27" />
                <rect x="1245.31" y="1116.93" width="150" height="150" transform="rotate(-145 1245.31 1116.93)" fill="#2C2A27" />

                {/* Back left leg */}
                <ellipse cx="75" cy="75" rx="75" ry="75" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 208.909 1073.91)" fill="#2C2A27" />
                <ellipse cx="75" cy="75" rx="75" ry="75" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 86.0364 1159.95)" fill="#2C2A27" />
                <rect width="150" height="150" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 147.473 1116.93)" fill="#2C2A27" />
            </g>

            {/* Body */}
            <rect x="195.998" y="178" width="1000" height="1150" rx="100" fill="#F7F3EB" />

            {/* Eye patches + eyes (centered on the shared eye anchors) */}
            {/* Left */}
            <ellipse cx="387" cy="692" rx="116" ry="146" transform="rotate(-25 387 692)" fill="#2C2A27" />
            <ellipse cx="387" cy="692" rx="56" ry="74" transform="rotate(-25 387 692)" fill="#F4EFE5" />
            <circle cx="387" cy="680" r="40" fill="#161514" />
            <circle cx="372" cy="666" r="12" fill="#5F5D5A" />
            {/* Right */}
            <ellipse cx="1005" cy="692" rx="116" ry="146" transform="rotate(25 1005 692)" fill="#2C2A27" />
            <ellipse cx="1005" cy="692" rx="56" ry="74" transform="rotate(25 1005 692)" fill="#F4EFE5" />
            <circle cx="1005" cy="680" r="40" fill="#161514" />
            <circle cx="990" cy="666" r="12" fill="#5F5D5A" />

            {/* Muzzle (subtle white patch on the cream body) */}
            <g>
                <circle cx="780" cy="808" r="90" fill="#FFFFFF" />
                <circle cx="612" cy="808" r="90" fill="#FFFFFF" />
                <rect x="612" y="725" width="168" height="166" fill="#FFFFFF" />
            </g>

            {/* Mouth (on the muzzle) */}
            <path d="M696 800V842" stroke="#2C2A27" strokeWidth="9" strokeLinecap="round" />
            <path d="M646 846Q696 888 746 846" stroke="#2C2A27" strokeWidth="9" fill="none" strokeLinecap="round" />
        </>
    );
}

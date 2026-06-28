// Streak Freeze icon — a frosty blue flame ("frozen streak"). Used everywhere the
// streak-freeze feature appears (header badge, shop item, …) so the iconography
// stays consistent. Decorative by default; size it via className — the flame is
// taller than wide, so size by height, e.g. className="h-4 w-auto".
export function StreakFreezeIcon({ className }) {
    return (
        <svg
            viewBox="74 42 102 155"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <path
                d="M120 52 C 149 88 166 117 156 150 C 148 175 133 187 120 187 C 107 187 92 175 84 150 C 76 125 91 114 102 125 C 98 98 104 74 120 52 Z"
                fill="#38bdf8"
            />
            <path
                d="M120 94 C 137 117 147 135 141 154 C 136 171 127 179 120 179 C 113 179 104 171 99 154 C 94 137 104 133 111 143 C 109 123 113 108 120 94 Z"
                fill="#bae6fd"
            />
            <path
                d="M120 134 C 129 147 132 158 128 167 C 125 174 122 176 120 176 C 118 176 115 174 112 167 C 108 158 111 150 120 134 Z"
                fill="#e0f2fe"
            />
        </svg>
    );
}

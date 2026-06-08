import { HoodieLayer } from '@/components/brand/items/Hoodie';
import { cn } from '@/lib/utils';

const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64',
    '2xl': 'w-80 h-80',
};

const itemLayerKeys = {
    hoodie: 'hoodie',
    cozyHoodie: 'hoodie',
    'cozy-hoodie': 'hoodie',
    hoodieNew: 'hoodie',
    'hoodie-new': 'hoodie',
    pullover_01: 'hoodie',
    pullover_02: 'hoodie',
};

function normalizeItemKey(itemKey) {
    return itemLayerKeys[itemKey?.trim()] ?? null;
}

function CompanionItemLayer({ itemKey }) {
    const normalizedItemKey = normalizeItemKey(itemKey);

    if (normalizedItemKey === 'hoodie') {
        return <HoodieLayer transform="translate(100 770)" />;
    }

    return null;
}

export function CompanionAvatar({
                                    name = 'Howly',
                                    size = 'lg',
                                    showName = false,
                                    previewItemKey,
                                    equippedItemKeys = [],
                                    className,
                                }) {
    const itemKeys = [...equippedItemKeys, previewItemKey].filter(Boolean);

    return (
        <figure className={cn('flex flex-col items-center gap-2', className)}>
            <svg
                viewBox="0 0 1522 1564"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn(sizeClasses[size], 'drop-shadow-2xl')}
            >
                {/* Tail */}
                <g>
                    <path
                        d="M1183.63 1129.8C1137.75 1114.13 1050.26 1135.57 918.874 1112.91C1022.06 1283.15 1124 1402.5 1171.5 1429C1219 1455.5 1271 1461 1317 1461C1329.2 1451.16 1348.25 1435.82 1348.25 1435.82L1293.75 1423.39L1342.26 1387.5L1281 1348.18L1344 1332.63L1293.75 1281.47L1348.5 1289.71L1324.65 1239.1C1269.43 1157.52 1229.52 1145.47 1183.63 1129.8Z"
                        fill="var(--color-wolf-body-dark)"
                    />
                    <path
                        d="M1508.5 1342.28C1438.9 1325.74 1385.28 1326.66 1324.65 1239.1L1348.5 1289.71L1293.75 1281.47L1344 1332.63L1281 1348.18L1342.26 1387.5L1293.75 1423.39L1348.25 1435.82C1348.25 1435.82 1329.2 1451.16 1317 1461C1389.5 1459.97 1459.26 1406.78 1508.5 1342.28Z"
                        fill="var(--color-wolf-body-light)"
                    />
                </g>

                {/* Legs */}
                <g>
                    {/* Front left leg */}
                    <circle cx="486.999" cy="1228" r="100" transform="rotate(-90 486.999 1228)" fill="var(--color-wolf-dark)" />
                    <circle cx="486.999" cy="1428" r="100" transform="rotate(-90 486.999 1428)" fill="var(--color-wolf-dark)" />
                    <rect x="386.999" y="1428" width="200" height="200" transform="rotate(-90 386.999 1428)" fill="var(--color-wolf-dark)" />

                    {/* Front right leg */}
                    <circle cx="904.997" cy="1229" r="100" transform="rotate(-90 904.997 1229)" fill="var(--color-wolf-dark)" />
                    <circle cx="904.997" cy="1429" r="100" transform="rotate(-90 904.997 1429)" fill="var(--color-wolf-dark)" />
                    <rect x="804.997" y="1429" width="200" height="200" transform="rotate(-90 804.997 1429)" fill="var(--color-wolf-dark)" />

                    {/* Back right leg */}
                    <ellipse cx="1165.45" cy="969.455" rx="75" ry="75" transform="rotate(-145 1165.45 969.455)" fill="var(--color-wolf-dark)" />
                    <ellipse cx="1288.33" cy="1055.49" rx="75" ry="75" transform="rotate(-145 1288.33 1055.49)" fill="var(--color-wolf-dark)" />
                    <rect x="1245.31" y="1116.93" width="150" height="150" transform="rotate(-145 1245.31 1116.93)" fill="var(--color-wolf-dark)" />

                    {/* Back left leg */}
                    <ellipse cx="75" cy="75" rx="75" ry="75" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 208.909 1073.91)" fill="var(--color-wolf-dark)" />
                    <ellipse cx="75" cy="75" rx="75" ry="75" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 86.0364 1159.95)" fill="var(--color-wolf-dark)" />
                    <rect width="150" height="150" transform="matrix(0.819152 -0.573576 -0.573576 -0.819152 147.473 1116.93)" fill="var(--color-wolf-dark)" />
                </g>

                {/* Body */}
                <rect x="195.998" y="178" width="1000" height="1150" rx="100" fill="var(--color-wolf-body)" />



                {/* Ears */}
                <g>
                    {/* Left ear */}
                    <path d="M381.018 45C392.565 25 421.433 25 432.98 45L484.941 135C496.488 155 482.054 180 458.96 180H355.037C331.943 180 317.509 155 329.056 135L381.018 45Z" fill="var(--color-wolf-body-dark)" />
                    <path d="M354.999 90L406.96 180H303.037L354.999 90Z" fill="var(--color-wolf-body-dark)" />
                    <path d="M458.599 90L510.56 180H406.637L458.599 90Z" fill="var(--color-wolf-body-dark)" />

                    {/* Left ear inner */}
                    <path d="M381.518 119C393.065 99 421.933 99 433.48 119L442.573 134.75C454.12 154.75 439.686 179.75 416.592 179.75H398.406C375.311 179.75 360.878 154.75 372.425 134.75L381.518 119Z" fill="var(--color-wolf-ear-inner)" />
                    <path d="M377.184 126.875L407.711 179.75H346.656L377.184 126.875Z" fill="var(--color-wolf-ear-inner)" />
                    <path d="M437.814 126.875L468.341 179.75H407.286L437.814 126.875Z" fill="var(--color-wolf-ear-inner)" />

                    {/* Right ear */}
                    <path d="M959.017 45C970.564 25 999.431 25 1010.98 45L1062.94 135C1074.49 155 1060.05 180 1036.96 180H933.036C909.942 180 895.508 155 907.055 135L959.017 45Z" fill="var(--color-wolf-body-dark)" />
                    <path d="M932.997 90L984.959 180H881.036L932.997 90Z" fill="var(--color-wolf-body-dark)" />
                    <path d="M1036.6 90L1088.56 180H984.636L1036.6 90Z" fill="var(--color-wolf-body-dark)" />

                    {/* Right ear inner */}
                    <path d="M959.517 119C971.064 99 999.931 99 1011.48 119L1020.57 134.75C1032.12 154.75 1017.68 179.75 994.591 179.75H976.404C953.31 179.75 938.876 154.75 950.423 134.75L959.517 119Z" fill="var(--color-wolf-ear-inner)" />
                    <path d="M955.182 126.875L985.71 179.75H924.655L955.182 126.875Z" fill="var(--color-wolf-ear-inner)" />
                    <path d="M1015.81 126.875L1046.34 179.75H985.285L1015.81 126.875Z" fill="var(--color-wolf-ear-inner)" />
                </g>

                {/* Eyebrows */}
                <g>
                    <circle cx="1033.25" cy="516.75" r="27.75" fill="var(--color-wolf-dark)" />
                    <circle cx="977.747" cy="516.75" r="27.75" fill="var(--color-wolf-dark)" />
                    <rect x="977.747" y="489" width="55.5" height="55.5" fill="var(--color-wolf-dark)" />
                </g>
                <g>
                    <circle cx="415.249" cy="516.75" r="27.75" fill="var(--color-wolf-dark)" />
                    <circle cx="359.749" cy="516.75" r="27.75" fill="var(--color-wolf-dark)" />
                    <rect x="359.749" y="489" width="55.5" height="55.5" fill="var(--color-wolf-dark)" />
                </g>

                {/* Eyes */}
                <circle cx="386.999" cy="680" r="100" fill="white" />
                <circle cx="1005" cy="680" r="100" fill="white" />
                <circle cx="386.999" cy="680" r="80" fill="black" />
                <circle cx="1005" cy="680" r="80" fill="black" />

                {/* Tongue (drawn BEFORE the beige snout so it sits behind it) */}
                <path
                    d="M695.997 820C729.134 820 755.997 846.863 755.997 880C755.997 913.137 729.134 940 695.997 940C662.86 940 635.997 913.137 635.997 880C635.997 846.863 662.86 820 695.997 820Z"
                    fill="var(--color-wolf-tongue)"
                />
                <g>
                    <mask id="wolf-tongue-mask" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="635" y="820" width="121" height="120">
                        <path d="M695.997 820C729.134 820 755.997 846.863 755.997 880C755.997 913.137 729.134 940 695.997 940C662.86 940 635.997 913.137 635.997 880C635.997 846.863 662.86 820 695.997 820Z" fill="var(--color-wolf-tongue)" />
                    </mask>
                    <g mask="url(#wolf-tongue-mask)">
                        <path d="M695.997 903C729.134 903 755.997 929.863 755.997 963C755.997 996.137 729.134 1023 695.997 1023C662.86 1023 635.997 996.137 635.997 963C635.997 929.863 662.86 903 695.997 903Z" fill="var(--color-wolf-tongue-light)" />
                    </g>
                </g>

                {/* Mouth area (Beige Snout - drawn AFTER tongue so it overlaps it) */}
                <g>
                    <circle cx="795.999" cy="780" r="100" fill="var(--color-wolf-belly)" />
                    <circle cx="595.999" cy="780" r="100" fill="var(--color-wolf-belly)" />
                    <rect x="595.999" y="680" width="200" height="200" fill="var(--color-wolf-belly)" />
                </g>

                {/* Whiskers right */}
                <g>
                    <ellipse cx="1196.38" cy="760.06" rx="72.2706" ry="39.8228" transform="rotate(13 1196.38 760.06)" fill="var(--color-wolf-body)" />
                    <ellipse cx="1196.38" cy="820.06" rx="72.2706" ry="39.8228" transform="rotate(13 1196.38 820.06)" fill="var(--color-wolf-body)" />
                    <ellipse cx="1196.38" cy="880.06" rx="72.2706" ry="39.8228" transform="rotate(13 1196.38 880.06)" fill="var(--color-wolf-body)" />
                </g>

                {/* Whiskers left */}
                <g>
                    <ellipse cx="72.2706" cy="39.8228" rx="72.2706" ry="39.8228" transform="matrix(0.97437 -0.224951 -0.224951 -0.97437 134.917 935.119)" fill="var(--color-wolf-body)" />
                    <ellipse cx="72.2706" cy="39.8228" rx="72.2706" ry="39.8228" transform="matrix(0.97437 -0.224951 -0.224951 -0.97437 134.917 875.119)" fill="var(--color-wolf-body)" />
                    <ellipse cx="72.2706" cy="39.8228" rx="72.2706" ry="39.8228" transform="matrix(0.97437 -0.224951 -0.224951 -0.97437 134.917 815.119)" fill="var(--color-wolf-body)" />
                </g>

                {/* Belly */}
                <g>
                    <rect x="531" y="1168" width="320" height="160" fill="var(--color-wolf-belly)" />
                    <circle cx="691" cy="1168" r="160" fill="var(--color-wolf-belly)" />
                </g>

                {/* Equipped items */}
                {itemKeys.map((itemKey) => (
                    <CompanionItemLayer key={itemKey} itemKey={itemKey} />
                ))}

                {/* Nose (Moved to the absolute front layer) */}
                <circle cx="696" cy="780" r="45" fill="var(--color-wolf-dark)" />
            </svg>

            {showName ? (
                <figcaption className="text-sm font-semibold text-pink-100">{name}</figcaption>
            ) : null}
        </figure>
    );
}

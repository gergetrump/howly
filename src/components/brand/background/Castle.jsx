const SILHOUETTE = '#1a2438';
const DETAIL = '#121a2c';
const WINDOW = '#e8b23e';

function Window({ x, y, dim = false }) {
    return <rect x={x} y={y} width={dim ? 4 : 5.5} height={dim ? 6.5 : 9} rx="1.2" fill={WINDOW} opacity={dim ? 0.7 : 0.95} />;
}

function Pinnacle({ x, y, h = 22, w = 8 }) {
    return <path d={`M${x - w / 2} ${y} L${x} ${y - h} L${x + w / 2} ${y} Z`} fill={SILHOUETTE} />;
}

export function Castle({ className, style }) {
    return (
        <svg
            className={className}
            style={style}
            viewBox="30 8 660 452"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path d="M70 460 Q78 400 110 385 Q150 372 200 366 Q280 356 360 358 Q450 356 520 362 Q590 366 630 382 Q662 396 668 460 Z" fill={DETAIL} />

            <g fill={SILHOUETTE}>
                <path d="M120 375 L120 290 L135 258 L150 290 L150 375 Z" />
                <path d="M150 375 L150 302 L200 264 L252 302 L252 375 Z" />
                <path d="M252 375 L252 232 L288 232 L288 375 Z" />
                <path d="M246 236 L270 158 L294 236 Z" />
                <path d="M328 375 L328 150 L372 150 L372 375 Z" />
                <path d="M320 154 L350 28 L380 154 Z" />
                <path d="M372 375 L372 212 L392 212 L392 375 Z" />
                <path d="M368 214 L382 158 L396 214 Z" />
                <path d="M408 375 L408 185 L444 185 L444 375 Z" />
                <path d="M402 190 L426 70 L450 190 Z" />
                <path d="M444 375 L444 246 L472 246 L472 375 Z" />
                <path d="M440 248 L458 184 L476 248 Z" />
                <path d="M472 375 L472 282 L502 258 L502 375 Z" />
                <path d="M502 375 L502 172 L562 172 L562 375 Z" />
                <path d="M494 176 L532 78 L570 176 Z" />
                <path d="M562 375 L562 232 L584 232 L584 375 Z" />
                <path d="M558 234 L573 176 L588 234 Z" />
                <path d="M584 375 L584 312 L622 278 L660 312 L660 375 Z" />
                <rect x="100" y="356" width="560" height="34" />
            </g>

            <Pinnacle x={150} y={302} h={26} />
            <Pinnacle x={252} y={232} h={24} />
            <Pinnacle x={288} y={232} h={24} />
            <Pinnacle x={200} y={264} h={20} w={7} />
            <Pinnacle x={328} y={150} h={26} w={7} />
            <Pinnacle x={372} y={150} h={26} w={7} />

            <g>
                <path d="M532 80 L532 26" stroke={SILHOUETTE} strokeWidth="4" strokeLinecap="round" />
                <path d="M534 26 Q560 17 586 28 L586 56 Q560 45 534 54 Z" fill="#a83232" />
                <path d="M534 26 Q560 17 586 28 L586 56 Q560 45 534 54 Z" stroke={DETAIL} strokeWidth="1.5" fill="none" />
                <text x="559" y="47" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="21" fill="#e8b23e">H</text>
            </g>
            <Pinnacle x={444} y={185} h={22} w={7} />
            <Pinnacle x={502} y={258} h={20} w={7} />
            <Pinnacle x={562} y={172} h={24} w={7} />
            <Pinnacle x={622} y={278} h={20} w={7} />

            <g fill={SILHOUETTE}>
                <path d="M40 452 L40 408 L150 386 L150 452 Z" />
            </g>
            <path d="M55 452 a10 13 0 0 1 20 0 Z M93 452 a10 13 0 0 1 20 0 Z M131 450 a10 13 0 0 1 20 0 Z" fill={DETAIL} />

            <Window x={344} y={175} /><Window x={356} y={175} />
            <Window x={344} y={210} /><Window x={356} y={210} />
            <Window x={344} y={248} /><Window x={356} y={248} />
            <Window x={344} y={285} /><Window x={356} y={285} />
            <Window x={420} y={210} /><Window x={432} y={210} />
            <Window x={420} y={248} /><Window x={432} y={248} />
            <Window x={523} y={195} /><Window x={539} y={195} />
            <Window x={523} y={232} /><Window x={539} y={232} />
            <Window x={523} y={270} /><Window x={539} y={270} />
            <Window x={266} y={255} /><Window x={266} y={292} />
            <Window x={378} y={240} dim /><Window x={455} y={270} dim />
            <Window x={484} y={295} dim /><Window x={570} y={255} dim />
            <Window x={132} y={310} dim /><Window x={175} y={320} dim /><Window x={200} y={300} dim /><Window x={228} y={320} dim />
            <Window x={608} y={318} dim /><Window x={636} y={330} dim />
            <Window x={186} y={345} dim /><Window x={300} y={340} dim /><Window x={412} y={345} dim /><Window x={608} y={345} dim />
            <Window x={64} y={425} dim /><Window x={102} y={423} dim />
        </svg>
    );
}

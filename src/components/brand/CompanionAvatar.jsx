import { orderCompanionItemKeys, renderCompanionItemLayer } from '@/components/brand/items/itemRegistry';
import { WolfSkin } from '@/components/brand/companions/WolfSkin';
import { PandaSkin } from '@/components/brand/companions/PandaSkin';
import { BearSkin } from '@/components/brand/companions/BearSkin';
import { cn } from '@/lib/utils';

const sizeClasses = {
    sm: 'w-24 h-24',
    feed: 'w-40 h-40',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64',
    '2xl': 'w-80 h-80',
};

// Maps a companion type to its skin component. Unknown types fall back to wolf,
// so existing callers that don't pass a type keep rendering Howly.
const SKINS = {
    wolf: WolfSkin,
    panda: PandaSkin,
    bear: BearSkin,
};

function CompanionItemLayer({ itemKey }) {
    return renderCompanionItemLayer(itemKey);
}

export function CompanionAvatar({
                                    type = 'wolf',
                                    name = 'Howly',
                                    size = 'lg',
                                    showName = false,
                                    previewItemKey,
                                    previewItemKeys = [],
                                    equippedItemKeys = [],
                                    className,
                                }) {
    const itemKeys = orderCompanionItemKeys([...equippedItemKeys, ...previewItemKeys, previewItemKey].filter(Boolean));
    const Skin = SKINS[type] ?? WolfSkin;

    return (
        <figure className={cn('flex flex-col items-center gap-2 overflow-visible', className)}>
            <svg
                viewBox="0 0 1522 1564"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn(sizeClasses[size], 'overflow-visible drop-shadow-2xl')}
            >
                {/* Animal body + face, behind the equipped items */}
                <Skin part="back" />

                {/* Equipped items (shared across all companion types) */}
                {itemKeys.map((itemKey) => (
                    <CompanionItemLayer key={itemKey} itemKey={itemKey} />
                ))}

                {/* Nose, drawn on top of the items */}
                <Skin part="front" />
            </svg>

            {showName ? (
                <figcaption className="text-sm font-semibold text-pink-100">{name}</figcaption>
            ) : null}
        </figure>
    );
}

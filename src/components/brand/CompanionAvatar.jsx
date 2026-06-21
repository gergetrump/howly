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

// Panda/bear bodies sit left-of-center in the shared viewBox (the wolf balances
// the right side with its tail). Nudge the tail-less companions right so they
// center in their frame. The item layer shifts with the skin (both live inside
// the same <g> below), so item alignment is preserved.
const X_OFFSET = {
    wolf: 0,
    panda: 48,
    bear: 48,
};

function CompanionItemLayer({ item }) {
    return renderCompanionItemLayer(item.assetKey, item.customization);
}

function toCompanionItem(item) {
    if (!item) {
        return null;
    }

    if (typeof item === 'string') {
        return { assetKey: item, customization: {} };
    }

    return {
        assetKey: item.assetKey,
        customization: item.customization ?? {},
    };
}

export function CompanionAvatar({
                                    type = 'wolf',
                                    name = 'Howly',
                                    size = 'lg',
                                    showName = false,
                                    previewItemKey,
                                    previewItemKeys = [],
                                    previewItemConfigs = [],
                                    equippedItemKeys = [],
                                    equippedItemConfigs = [],
                                    className,
                                }) {
    const companionItems = [...equippedItemKeys, ...equippedItemConfigs, ...previewItemKeys, previewItemKey, ...previewItemConfigs]
        .map(toCompanionItem)
        .filter((item) => item?.assetKey);
    const companionItemsByKey = new Map(companionItems.map((item) => [item.assetKey, item]));
    const itemKeys = orderCompanionItemKeys([...companionItemsByKey.keys()]);
    const orderedItems = itemKeys.map((itemKey) => companionItemsByKey.get(itemKey));
    const Skin = SKINS[type] ?? WolfSkin;
    const offsetX = X_OFFSET[type] ?? 0;

    return (
        <figure className={cn('flex flex-col items-center gap-2 overflow-visible', className)}>
            <svg
                viewBox="0 0 1522 1564"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn(sizeClasses[size], 'overflow-visible drop-shadow-2xl')}
            >
                <g transform={`translate(${offsetX} 0)`}>
                    {/* Animal body + face, behind the equipped items */}
                    <Skin part="back" />

                    {/* Equipped items (shared across all companion types) */}
                    {orderedItems.map((item) => (
                        <CompanionItemLayer key={item.assetKey} item={item} />
                    ))}

                    {/* Nose, drawn on top of the items */}
                    <Skin part="front" />
                </g>
            </svg>

            {showName ? (
                <figcaption className="text-sm font-semibold text-pink-100">{name}</figcaption>
            ) : null}
        </figure>
    );
}

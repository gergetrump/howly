import CozyJacket, { CozyJacketLayer } from './CozyJacket';
import Cup, { CupLayer } from './Cup';
import CupBrown, { CupBrownLayer } from './CupBrown';
import Hoodie, { HoodieLayer } from './Hoodie';
import Suit, { SuitLayer } from './Suit';
import Top, { TopLayer } from './Top';
import TopWarm, { TopWarmLayer } from './TopWarm';

const itemRegistry = {
    'cozy-jacket': {
        visual: CozyJacket,
        layer: CozyJacketLayer,
        transform: 'translate(55 845)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'cup': {
        visual: Cup,
        layer: CupLayer,
        transform: 'translate(1300 750)',
        previewClassName: 'max-h-[85%] max-w-[50%]',
    },
    'brown-cup': {
        visual: CupBrown,
        layer: CupBrownLayer,
        transform: 'translate(1300 750)',
        previewClassName: 'max-h-[85%] max-w-[50%]',
    },
    'hoodie': {
        visual: Hoodie,
        layer: HoodieLayer,
        transform: 'translate(100 770)',
    },
    'cream-top': {
        visual: Top,
        layer: TopLayer,
        transform: 'translate(196 760)',
    },
    'warm-top': {
        visual: TopWarm,
        layer: TopWarmLayer,
        transform: 'translate(70 850)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'suit': {
        visual: Suit,
        layer: SuitLayer,
        transform: 'translate(175 730)',
        previewClassName: 'max-h-[78%] max-w-[60%]',
    },
};

export function getItemRegistryEntry(assetKey) {
    return itemRegistry[assetKey?.trim()] ?? null;
}

export function renderShopItemVisual(item, className = 'max-h-full max-w-full') {
    const itemEntry = getItemRegistryEntry(item.assetKey);
    const Visual = itemEntry?.visual;

    return Visual ? <Visual className={itemEntry.previewClassName ?? className} aria-hidden="true" /> : null;
}

export function renderCompanionItemLayer(assetKey) {
    const itemEntry = getItemRegistryEntry(assetKey);

    if (!itemEntry?.layer) {
        return null;
    }

    const Layer = itemEntry.layer;

    return <Layer transform={itemEntry.transform} />;
}

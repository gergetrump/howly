import CozyJacket, { CozyJacketLayer } from './CozyJacket';
import Cup, { CupLayer } from './Cup';
import { GlassesLayer, GlassesPreview } from './Glasses';
import Hoodie, { HoodieLayer } from './Hoodie';
import Phone, { PhoneLayer } from './Phone';
import { SneakerLayer, SneakerPair } from './Sneaker';
import Suit, { SuitLayer } from './Suit';
import Top, { TopLayer } from './Top';
import TopWarm, { TopWarmLayer } from './TopWarm';
import WarmHat, { WarmHatLayer } from './WarmHat';

const itemRegistry = {
    'cozy-jacket': {
        type: 'clothing',
        visual: CozyJacket,
        layer: CozyJacketLayer,
        transform: 'translate(55 845)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'cup': {
        type: 'accessory',
        displayName: 'Warm Cup',
        visual: Cup,
        layer: CupLayer,
        transform: 'translate(1300 750)',
        sideTransforms: {
            right: 'translate(1300 750)',
            left: 'translate(90 750) scale(-1 1)',
        },
        previewClassName: 'max-h-[85%] max-w-[50%]',
    },
    'glasses': {
        type: 'accessory',
        visual: GlassesPreview,
        layer: GlassesLayer,
        transform: 'translate(480 550)',
        previewClassName: 'max-h-[64%] max-w-[80%]',
    },
    'hoodie': {
        type: 'clothing',
        visual: Hoodie,
        layer: HoodieLayer,
        transform: 'translate(100 770)',
    },
    'phone': {
        type: 'accessory',
        visual: Phone,
        layer: PhoneLayer,
        transform: 'translate(1300 835) rotate(18)',
        sideTransforms: {
            right: 'translate(1300 835) rotate(18)',
            left: 'translate(90 835) rotate(-18) scale(-1 1)',
        },
        previewClassName: 'max-h-[78%] max-w-[55%]',
    },
    'sneaker': {
        type: 'shoes',
        visual: SneakerPair,
        layer: SneakerLayer,
        transform: 'translate(0 0)',
        layerProps: {
            leftShoeTransform: 'translate(370 1370)',
            rightShoeTransform: 'translate(795 1370)',
        },
        previewClassName: 'max-h-[70%] max-w-[70%]',
    },
    'cream-top': {
        type: 'clothing',
        visual: Top,
        layer: TopLayer,
        transform: 'translate(196 760)',
    },
    'warm-top': {
        type: 'clothing',
        visual: TopWarm,
        layer: TopWarmLayer,
        transform: 'translate(70 850)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'suit': {
        type: 'clothing',
        visual: Suit,
        layer: SuitLayer,
        transform: 'translate(175 730)',
        previewClassName: 'max-h-[78%] max-w-[60%]',
    },
    'warm-hat': {
        type: 'accessory',
        visual: WarmHat,
        layer: WarmHatLayer,
        transform: 'translate(145 -110)',
        previewClassName: 'max-h-[65%] max-w-[85%]',
    },
};

export function getItemRegistryEntry(assetKey) {
    return itemRegistry[assetKey?.trim()] ?? null;
}

export function getItemDisplayName(item) {
    const itemEntry = getItemRegistryEntry(item?.assetKey);

    return itemEntry?.displayName ?? item?.name ?? '';
}

export function renderShopItemVisual(item, className = 'max-h-full max-w-full', customization = {}) {
    const itemEntry = getItemRegistryEntry(item.assetKey);
    const Visual = itemEntry?.visual;

    return Visual ? <Visual className={itemEntry.previewClassName ?? className} aria-hidden="true" {...customization} /> : null;
}

export function getItemLayerType(assetKey) {
    return getItemRegistryEntry(assetKey)?.type ?? 'accessory';
}

export function hasItemSideOptions(assetKey) {
    return Boolean(getItemRegistryEntry(assetKey)?.sideTransforms);
}

export function orderCompanionItemKeys(itemKeys = []) {
    const layerOrder = {
        shoes: 0,
        clothing: 1,
        accessory: 2,
        powerUp: 3,
    };

    return [...itemKeys].sort((firstKey, secondKey) => {
        const firstType = getItemLayerType(firstKey);
        const secondType = getItemLayerType(secondKey);

        return (layerOrder[firstType] ?? 99) - (layerOrder[secondType] ?? 99);
    });
}

export function renderCompanionItemLayer(assetKey, customization = {}) {
    const itemEntry = getItemRegistryEntry(assetKey);

    if (!itemEntry?.layer) {
        return null;
    }

    const Layer = itemEntry.layer;
    const { side, ...layerCustomization } = customization;
    const transform = itemEntry.sideTransforms?.[side] ?? itemEntry.transform;

    return <Layer transform={transform} {...itemEntry.layerProps} {...layerCustomization} />;
}

import Bag from './Bag';
import Ballerina from './Ballerina';
import BambusFlute from './BambusFlute';
import BambusShoes from './BambusShoes';
import BubbleTea from './BubbleTea';
import CozyJacket, { CozyJacketLayer } from './CozyJacket';
import Cup, { CupLayer } from './Cup';
import CuteBallerinas from './CuteBallerinas';
import CuteHat from './CuteHat';
import Dress from './Dress';
import DrinkTogo from './DrinkTogo';
import { GlassesLayer, GlassesPreview } from './Glasses';
import Hairpin from './Hairpin';
import Hat from './Hat';
import HatWithPompom from './HatWithPompom';
import HogwartsCape from './HogwartsCape';
import Hoodie, { HoodieLayer } from './Hoodie';
import Jersie from './Jersie';
import MagicWand from './MagicWand';
import Necklace from './Necklace';
import Nerdglasses from './Nerdglasses';
import Phone, { PhoneLayer } from './Phone';
import SakuraNeckclace from './SakuraNeckclace';
import SakuraOutfit from './SakuraOutfit';
import SakuraPouch from './SakuraPouch';
import Scar from './Scar';
import { SneakerLayer, SneakerPair } from './Sneaker';
import Suit, { SuitLayer } from './Suit';
import Summertop from './Summertop';
import Top, { TopLayer } from './Top';
import TopWarm, { TopWarmLayer } from './TopWarm';
import WarmBoots from './WarmBoots';
import WarmHat, { WarmHatLayer } from './WarmHat';
import WarmHat2Pompom from './WarmHat2Pompom';
import WinterJacket from './WinterJacket';

const itemRegistry = {
    bag: {
        type: 'accessory',
        visual: Bag,
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    ballerina: {
        type: 'shoes',
        visual: Ballerina,
        previewClassName: 'max-h-[68%] max-w-[76%]',
    },
    'bambus-flute': {
        type: 'accessory',
        visual: BambusFlute,
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
    'bambus-shoes': {
        type: 'shoes',
        visual: BambusShoes,
        previewClassName: 'max-h-[68%] max-w-[76%]',
    },
    'bubble-tea': {
        type: 'accessory',
        visual: BubbleTea,
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
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
    'cute-ballerinas': {
        type: 'shoes',
        visual: CuteBallerinas,
        previewClassName: 'max-h-[68%] max-w-[76%]',
    },
    'cute-hat': {
        type: 'accessory',
        visual: CuteHat,
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    dress: {
        type: 'clothing',
        visual: Dress,
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'drink-togo': {
        type: 'accessory',
        visual: DrinkTogo,
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
    'glasses': {
        type: 'accessory',
        visual: GlassesPreview,
        layer: GlassesLayer,
        transform: 'translate(485 550)',
        previewClassName: 'max-h-[64%] max-w-[80%]',
    },
    hairpin: {
        type: 'accessory',
        visual: Hairpin,
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    hat: {
        type: 'accessory',
        visual: Hat,
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    'hat-with-pompom': {
        type: 'accessory',
        visual: HatWithPompom,
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    'hogwarts-cape': {
        type: 'clothing',
        visual: HogwartsCape,
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'hoodie': {
        type: 'clothing',
        visual: Hoodie,
        layer: HoodieLayer,
        transform: 'translate(100 770)',
    },
    jersie: {
        type: 'clothing',
        visual: Jersie,
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'magic-wand': {
        type: 'accessory',
        visual: MagicWand,
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
    necklace: {
        type: 'accessory',
        visual: Necklace,
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    nerdglasses: {
        type: 'accessory',
        visual: Nerdglasses,
        previewClassName: 'max-h-[64%] max-w-[80%]',
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
    'sakura-neckclace': {
        type: 'accessory',
        visual: SakuraNeckclace,
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    'sakura-outfit': {
        type: 'clothing',
        visual: SakuraOutfit,
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'sakura-pouch': {
        type: 'accessory',
        visual: SakuraPouch,
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
    scar: {
        type: 'accessory',
        visual: Scar,
        previewClassName: 'max-h-[82%] max-w-[56%]',
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
    summertop: {
        type: 'clothing',
        visual: Summertop,
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'warm-boots': {
        type: 'shoes',
        visual: WarmBoots,
        previewClassName: 'max-h-[68%] max-w-[76%]',
    },
    'warm-hat': {
        type: 'accessory',
        visual: WarmHat,
        layer: WarmHatLayer,
        transform: 'translate(145 -110)',
        previewClassName: 'max-h-[65%] max-w-[85%]',
    },
    'warm-hat-2-pompom': {
        type: 'accessory',
        visual: WarmHat2Pompom,
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    'winter-jacket': {
        type: 'clothing',
        visual: WinterJacket,
        previewClassName: 'max-h-[78%] max-w-[78%]',
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

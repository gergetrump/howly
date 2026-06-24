import Bag, { BagLayer } from './Bag';
import { BallerinaLayer, BallerinaPair } from './Ballerina';
import BambusFlute, { BambusFluteLayer } from './BambusFlute';
import { BambusShoesLayer, BambusShoesPair } from './BambusShoes';
import BubbleTea, { BubbleTeaLayer } from './BubbleTea';
import CozyJacket, { CozyJacketLayer } from './CozyJacket';
import Cup, { CupLayer } from './Cup';
import { CuteBallerinasLayer, CuteBallerinasPair } from './CuteBallerinas';
import CuteHat, { CuteHatLayer } from './CuteHat';
import Dress, { DressLayer } from './Dress';
import DrinkTogo, { DrinkTogoLayer } from './DrinkTogo';
import { GlassesLayer, GlassesPreview } from './Glasses';
import Hairpin, { HairpinLayer } from './Hairpin';
import Hat, { HatLayer } from './Hat';
import HatWithPompom, { HatWithPompomLayer } from './HatWithPompom';
import HogwartsCape, { HogwartsCapeLayer } from './HogwartsCape';
import HogwartsScarf, { HogwartsScarfLayer } from './HogwartsScarf';
import Hoodie, { HoodieLayer } from './Hoodie';
import Jersie, { JersieLayer } from './Jersie';
import MagicWand, { MagicWandLayer } from './MagicWand';
import Necklace, { NecklaceLayer } from './Necklace';
import Nerdglasses, { NerdglassesLayer } from './Nerdglasses';
import Phone, { PhoneLayer } from './Phone';
import SakuraNeckclace, { SakuraNeckclaceLayer } from './SakuraNeckclace';
import SakuraOutfit, { SakuraOutfitLayer } from './SakuraOutfit';
import SakuraPouch, { SakuraPouchLayer } from './SakuraPouch';
import Scar, { ScarLayer } from './Scar';
import { SneakerLayer, SneakerPair } from './Sneaker';
import Suit, { SuitLayer } from './Suit';
import Summertop, { SummertopLayer } from './Summertop';
import Top, { TopLayer } from './Top';
import TopWarm, { TopWarmLayer } from './TopWarm';
import { WarmBootsLayer, WarmBootsPair } from './WarmBoots';
import WarmHat, { WarmHatLayer } from './WarmHat';
import WarmHat2Pompom, { WarmHat2PompomLayer } from './WarmHat2Pompom';
import WinterJacket, { WinterJacketLayer } from './WinterJacket';

const itemRegistry = {
    bag: {
        type: 'accessory',
        equipSlot: 'body',
        visual: Bag,
        layer: BagLayer,
        transform: 'translate(120 850) scale(1.8 1.8) ',
        sideTransforms: {
            right: 'translate(120 850) scale(1.8 1.8)',
            left: 'translate(1280 850) scale(-1.8 1.8)',
        },
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    ballerina: {
        type: 'shoes',
        visual: BallerinaPair,
        layer: BallerinaLayer,
        transform: 'translate(0 0)',
        previewClassName: 'max-h-[68%] max-w-[76%]',
    },
    'bambus-flute': {
        type: 'accessory',
        equipSlot: 'hand',
        visual: BambusFlute,
        layer: BambusFluteLayer,
        transform: 'translate(1480 700) scale(-1 1)',
        sideTransforms: {
            right: 'translate(1480 700) scale(-1 1)',
            left: 'translate(-80 700)',
        },
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
    'bambus-shoes': {
        type: 'shoes',
        visual: BambusShoesPair,
        layer: BambusShoesLayer,
        transform: 'translate(0 0)',
        previewClassName: 'max-h-[68%] max-w-[76%]',
    },
    'bubble-tea': {
        type: 'accessory',
        equipSlot: 'hand',
        visual: BubbleTea,
        layer: BubbleTeaLayer,
        transform: 'translate(1250 800)',
        sideTransforms: {
            right: 'translate(1250 800)',
            left: 'translate(150 800) scale(-1 1)',
        },
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
        equipSlot: 'hand',
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
        visual: CuteBallerinasPair,
        layer: CuteBallerinasLayer,
        transform: 'translate(0 0)',
        previewClassName: 'max-h-[68%] max-w-[76%]',
    },
    'cute-hat': {
        type: 'accessory',
        equipSlot: 'head',
        visual: CuteHat,
        layer: CuteHatLayer,
        transform: 'translate(600 -100) ',
        sideTransforms: {
            right: 'translate(600 -100) ',
            left: 'translate(800 -100) scale(-1 1)',
        },
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    dress: {
        type: 'clothing',
        visual: Dress,
        layer: DressLayer,
        transform: 'translate(26 860) scale(1.05 1)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'drink-togo': {
        type: 'accessory',
        equipSlot: 'hand',
        visual: DrinkTogo,
        layer: DrinkTogoLayer,
        transform: 'translate(1250 850)',
        sideTransforms: {
            right: 'translate(1250 850)',
            left: 'translate(150 850) scale(-1 1)',
        },
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
    'glasses': {
        type: 'accessory',
        equipSlot: 'face',
        visual: GlassesPreview,
        layer: GlassesLayer,
        transform: 'translate(485 550)',
        previewClassName: 'max-h-[64%] max-w-[80%]',
    },
    hairpin: {
        type: 'accessory',
        equipSlot: 'head',
        visual: Hairpin,
        layer: HairpinLayer,
        transform: 'translate(190 95)',
        sideTransforms: {
            right: 'translate(1200 95) scale(-1 1)',
            left: 'translate(190 95)',
        },
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    hat: {
        type: 'accessory',
        equipSlot: 'head',
        visual: Hat,
        layer: HatLayer,
        transform: 'translate(20 -115) scale(0.95 0.95)',
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    'hat-with-pompom': {
        type: 'accessory',
        equipSlot: 'head',
        visual: HatWithPompom,
        layer: HatWithPompomLayer,
        transform: 'translate(145 -260)',
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    'hogwarts-cape': {
        type: 'clothing',
        visual: HogwartsCape,
        layer: HogwartsCapeLayer,
        transform: 'translate(10 805) scale(1.08 1)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'hogwarts-scarf': {
        type: 'accessory',
        equipSlot: 'neck',
        visual: HogwartsScarf,
        layer: HogwartsScarfLayer,
        transform: 'translate(70 790) scale(0.98 0.98)',
        sideTransforms: {
            right: 'translate(70 790)  scale(0.98 0.98)',
            left: 'translate(1340 790) scale(-0.98 0.98)',
        },
        previewClassName: 'max-h-[72%] max-w-[82%]',
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
        layer: JersieLayer,
        transform: 'translate(45 835)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'magic-wand': {
        type: 'accessory',
        equipSlot: 'hand',
        visual: MagicWand,
        layer: MagicWandLayer,
        transform: 'translate(1250 780) ',
        sideTransforms: {
            right: 'translate(1250 780)',
            left: 'translate(150 780) scale(-1 1)',
        },
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
    necklace: {
        type: 'accessory',
        equipSlot: 'neck',
        visual: Necklace,
        layer: NecklaceLayer,
        transform: 'translate(480 920)',
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    nerdglasses: {
        type: 'accessory',
        equipSlot: 'face',
        visual: Nerdglasses,
        layer: NerdglassesLayer,
        transform: 'translate(190 540) scale(2.4 2.4)',
        previewClassName: 'max-h-[64%] max-w-[80%]',
    },
    'phone': {
        type: 'accessory',
        equipSlot: 'hand',
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
        equipSlot: 'neck',
        visual: SakuraNeckclace,
        layer: SakuraNeckclaceLayer,
        transform: 'translate(480 920)',
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    'sakura-outfit': {
        type: 'clothing',
        visual: SakuraOutfit,
        layer: SakuraOutfitLayer,
        transform: 'translate(26 845) scale(1.05 1)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'sakura-pouch': {
        type: 'accessory',
        equipSlot: 'hand',
        visual: SakuraPouch,
        layer: SakuraPouchLayer,
        transform: 'translate(1200 1000)',
        sideTransforms: {
            right: 'translate(1200 1000)',
            left: 'translate(180 1000) scale(-1 1)',
        },
        previewClassName: 'max-h-[82%] max-w-[56%]',
    },
    scar: {
        type: 'accessory',
        layerPriority: -10,
        visual: Scar,
        layer: ScarLayer,
        transform: 'translate(290 280)',
        sideTransforms: {
            right: 'translate(1090 280) scale(-1 1)',
            left: 'translate(290 280)',
        },
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
        layer: SummertopLayer,
        transform: 'translate(37 820)',
        previewClassName: 'max-h-[78%] max-w-[78%]',
    },
    'warm-boots': {
        type: 'shoes',
        visual: WarmBootsPair,
        layer: WarmBootsLayer,
        transform: 'translate(0 0)',
        layerProps: {
            leftShoeTransform: 'translate(372 1370) scale(1.1 1)',
            rightShoeTransform: 'translate(792 1370) scale(1.1 1)',
        },
        previewClassName: 'max-h-[68%] max-w-[76%]',
    },
    'warm-hat': {
        type: 'accessory',
        equipSlot: 'head',
        visual: WarmHat,
        layer: WarmHatLayer,
        transform: 'translate(145 -110)',
        previewClassName: 'max-h-[65%] max-w-[85%]',
    },
    'warm-hat-2-pompom': {
        type: 'accessory',
        equipSlot: 'head',
        visual: WarmHat2Pompom,
        layer: WarmHat2PompomLayer,
        transform: 'translate(145 -260)',
        previewClassName: 'max-h-[72%] max-w-[82%]',
    },
    'winter-jacket': {
        type: 'clothing',
        visual: WinterJacket,
        layer: WinterJacketLayer,
        transform: 'translate(26 805) scale(1.05 1)',
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

export function getItemEquipSlot(assetKey) {
    return getItemRegistryEntry(assetKey)?.equipSlot ?? null;
}

export function getItemLayerPriority(assetKey) {
    const itemEntry = getItemRegistryEntry(assetKey);
    const layerOrder = {
        shoes: 0,
        clothing: 100,
        accessory: 200,
        powerUp: 300,
    };
    const slotPriority = itemEntry?.equipSlot === 'head' ? 10 : 0;

    return (layerOrder[itemEntry?.type] ?? 990) + (itemEntry?.layerPriority ?? slotPriority);
}

export function hasItemSideOptions(assetKey) {
    return Boolean(getItemRegistryEntry(assetKey)?.sideTransforms);
}

export function orderCompanionItemKeys(itemKeys = []) {
    return [...itemKeys].sort((firstKey, secondKey) => {
        return getItemLayerPriority(firstKey) - getItemLayerPriority(secondKey);
    });
}

export function renderCompanionItemLayer(assetKey, customization = {}) {
    const itemEntry = getItemRegistryEntry(assetKey);

    if (!itemEntry?.layer) {
        return null;
    }

    const Layer = itemEntry.layer;
    const { side, ...layerCustomization } = customization;
    const resolvedSide = side ?? (itemEntry.sideTransforms ? 'right' : undefined);
    const transform = itemEntry.sideTransforms?.[resolvedSide] ?? itemEntry.transform;

    return <Layer transform={transform} {...itemEntry.layerProps} {...layerCustomization} />;
}

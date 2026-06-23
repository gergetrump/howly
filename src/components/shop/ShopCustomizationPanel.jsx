import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Palette } from 'lucide-react';
import { ActionButton } from '@/components/common';
import Eclipse from '@/components/brand/items/Eclipse';
import Flower from '@/components/brand/items/Flower';
import Heart from '@/components/brand/items/Heart';
import { getItemDisplayName } from '@/components/brand/items/itemRegistry';
import {
    MAX_CUSTOM_TEXT_LENGTH,
    normalizeHexInput,
} from '@/components/shop/shopCustomization';

const PALETTE_COLORS = [
    '#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#334155', '#111827', '#020617',
    '#FDE2E4', '#FBCFE8', '#F9A8D4', '#FB7185', '#F43F5E', '#E11D48', '#BE123C', '#881337', '#F5D0FE', '#D8B4FE',
    '#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5', '#4338CA', '#312E81', '#BAE6FD', '#7DD3FC',
    '#A7F3D0', '#5EEAD4', '#2DD4BF', '#14B8A6', '#0F766E', '#164E63', '#CCFBF1', '#DCFCE7', '#86EFAC', '#22C55E',
    '#BBF7D0', '#16A34A', '#166534', '#ECFCCB', '#D9F99D', '#BEF264', '#A3E635', '#84CC16', '#65A30D', '#3F6212',
    '#FEF3C7', '#FDE68A', '#FCD34D', '#FACC15', '#EAB308', '#CA8A04', '#A16207', '#FDE68A', '#FBBF24', '#F59E0B',
    '#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#EA580C', '#C2410C', '#7C2D12', '#FCA5A5', '#EF4444', '#B91C1C',
    '#DD9CC0', '#C084FC', '#1E293B', '#4A6741',
];

const SYMBOL_VISUALS = {
    eclipse: Eclipse,
    heart: Heart,
    flower: Flower,
};

const SYMBOL_PREVIEW_CLASSES = {
    eclipse: 'h-full max-h-10 max-w-12 overflow-visible',
    heart: 'h-full max-h-10 max-w-12 overflow-visible',
    flower: 'h-5 max-h-8 max-w-10 overflow-visible',
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function componentToHex(value) {
    return value.toString(16).padStart(2, '0').toUpperCase();
}

function hslToHex(hue, saturation, lightness) {
    const normalizedSaturation = saturation / 100;
    const normalizedLightness = lightness / 100;
    const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
    const huePrime = hue / 60;
    const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
    const match = normalizedLightness - chroma / 2;
    let red = 0;
    let green = 0;
    let blue = 0;

    if (huePrime >= 0 && huePrime < 1) {
        red = chroma;
        green = x;
    } else if (huePrime < 2) {
        red = x;
        green = chroma;
    } else if (huePrime < 3) {
        green = chroma;
        blue = x;
    } else if (huePrime < 4) {
        green = x;
        blue = chroma;
    } else if (huePrime < 5) {
        red = x;
        blue = chroma;
    } else {
        red = chroma;
        blue = x;
    }

    return `#${componentToHex(Math.round((red + match) * 255))}${componentToHex(Math.round((green + match) * 255))}${componentToHex(Math.round((blue + match) * 255))}`;
}

function hexToHsl(hexColor) {
    const normalizedColor = normalizeHexInput(hexColor) ?? '#FFFFFF';
    const red = parseInt(normalizedColor.slice(1, 3), 16) / 255;
    const green = parseInt(normalizedColor.slice(3, 5), 16) / 255;
    const blue = parseInt(normalizedColor.slice(5, 7), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;
    const delta = max - min;

    if (delta === 0) {
        return { hue: 0, saturation: 0, lightness: Math.round(lightness * 100) };
    }

    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    let hue;

    if (max === red) {
        hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
        hue = 60 * ((blue - red) / delta + 2);
    } else {
        hue = 60 * ((red - green) / delta + 4);
    }

    return {
        hue: Math.round(hue < 0 ? hue + 360 : hue),
        saturation: Math.round(saturation * 100),
        lightness: Math.round(lightness * 100),
    };
}

export function ShopCustomizationPanel({
    item,
    customizationConfig,
    customization,
    activeSlot,
    onActiveSlotChange,
    onColorChange,
    onTextChange,
    onSymbolChange,
    onSideChange,
    onAddToCart,
    addToCartLabel,
    isAddToCartDisabled,
    canChangeSide = false,
}) {
    const [colorMode, setColorMode] = useState('palette');
    const selectedColor = customization?.[activeSlot] ?? '#FFFFFF';
    const selectedHsl = useMemo(() => hexToHsl(selectedColor), [selectedColor]);

    if (!item || !customizationConfig) {
        return (
            <aside className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300 shadow-xl shadow-slate-950/20 lg:sticky lg:top-24">
                <h2 className="text-lg font-semibold text-white">Customize</h2>
                <p className="mt-2 text-sm">Select an item to customize!</p>
            </aside>
        );
    }

    const textConfig = customizationConfig.text;
    const symbolConfig = customizationConfig.symbol;
    const selectedSide = customization.side === 'left' ? 'left' : 'right';
    const markerDistance = selectedHsl.saturation * 0.48;
    const markerAngle = (selectedHsl.hue - 90) * (Math.PI / 180);
    const markerX = 50 + Math.cos(markerAngle) * markerDistance;
    const markerY = 50 + Math.sin(markerAngle) * markerDistance;

    function handleHexInputChange(event) {
        const normalizedColor = normalizeHexInput(event.target.value);

        if (normalizedColor) {
            onColorChange(activeSlot, normalizedColor);
        }
    }

    function handleTextChange(event) {
        const nextText = event.target.value
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .slice(0, MAX_CUSTOM_TEXT_LENGTH)
            .toUpperCase();

        onTextChange(textConfig.key, nextText);
    }

    function handleColorWheelPick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = event.clientX - centerX;
        const deltaY = event.clientY - centerY;
        const radius = rect.width / 2;
        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        const hue = Math.round((Math.atan2(deltaY, deltaX) * 180) / Math.PI + 90 + 360) % 360;
        const saturation = Math.round(clamp(distance / radius, 0, 1) * 100);

        onColorChange(activeSlot, hslToHex(hue, saturation, selectedHsl.lightness));
    }

    function handleLightnessChange(event) {
        onColorChange(
            activeSlot,
            hslToHex(selectedHsl.hue, selectedHsl.saturation, Number(event.target.value)),
        );
    }

    return (
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-xl shadow-slate-950/20 lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold">Customize</h2>
                    <p className="truncate text-sm text-slate-300">{getItemDisplayName(item)}</p>
                </div>
                <Palette className="mt-1 h-5 w-5 shrink-0 text-violet-200" aria-hidden="true" />
            </div>

            <div className="mt-4 grid min-w-0 gap-4">
                <div className="min-w-0">
                    <div className="grid min-w-0 grid-cols-2 gap-1 rounded-xl bg-white/8 p-1">
                        {customizationConfig.colorSlots.map((slot) => (
                            <button
                                key={slot.key}
                                type="button"
                                className={`min-w-0 truncate rounded-lg px-2 py-1.5 text-xs font-semibold transition ${activeSlot === slot.key ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
                                aria-pressed={activeSlot === slot.key}
                                onClick={() => onActiveSlotChange(slot.key)}
                            >
                                {slot.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-w-0 rounded-2xl bg-sky-900/35 p-3 ring-1 ring-white/10">
                    <div className="mb-3 flex min-w-0 items-center gap-3">
                        <span
                            className="h-10 w-14 shrink-0 rounded-xl border border-white/15 sm:w-16"
                            style={{ backgroundColor: selectedColor }}
                            aria-hidden="true"
                        />
                        <input
                            key={selectedColor}
                            defaultValue={selectedColor.toUpperCase().replace('#', '')}
                            className="min-w-0 flex-1 border-b-2 border-white/70 bg-transparent text-base font-bold uppercase tracking-wide text-white outline-none"
                            aria-label={`${getItemDisplayName(item)} color hex code`}
                            onChange={handleHexInputChange}
                        />
                        <button
                            type="button"
                            className="flex h-10 w-12 shrink-0 items-center justify-center gap-0.5 rounded-md border-2 border-white/70 bg-white/10 transition hover:bg-white/20"
                            aria-label={colorMode === 'palette' ? 'Show color wheel' : 'Show color palette'}
                            onClick={() => setColorMode((currentMode) => (currentMode === 'palette' ? 'wheel' : 'palette'))}
                        >
                            {colorMode === 'palette' ? (
                                <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
                                    {['#EF4444', '#FACC15', '#22C55E', '#3B82F6'].map((color) => (
                                        <span
                                            key={color}
                                            className="h-2.5 w-2.5 rounded-sm"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </span>
                            ) : (
                                <span
                                    className="h-5 w-5 rounded-full border border-white/60"
                                    style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
                                    aria-hidden="true"
                                />
                            )}
                            <ChevronDown className="h-4 w-4 text-white" aria-hidden="true" />
                        </button>
                    </div>

                    {colorMode === 'palette' ? (
                        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(1.6rem,1fr))] gap-1.5">
                            {PALETTE_COLORS.map((color, index) => (
                                <button
                                    key={`${color}-${index}`}
                                    type="button"
                                    className={`aspect-square rounded-[0.2rem] border transition hover:scale-110 ${selectedColor.toUpperCase() === color ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.35)]' : 'border-white/15'}`}
                                    style={{ backgroundColor: color }}
                                    aria-label={`Use color ${color}`}
                                    onClick={() => onColorChange(activeSlot, color)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-w-0 flex-wrap items-center justify-center gap-4 py-2">
                            <button
                                type="button"
                                className="relative h-36 w-36 shrink-0 rounded-full border-4 border-white/80 shadow-inner sm:h-44 sm:w-44"
                                style={{
                                    background: 'radial-gradient(circle, white 0%, transparent 62%), conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                                }}
                                aria-label={`Choose ${getItemDisplayName(item)} color from wheel`}
                                onClick={handleColorWheelPick}
                            >
                                <span
                                    className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-700 bg-white/30 shadow"
                                    style={{ left: `${markerX}%`, top: `${markerY}%` }}
                                    aria-hidden="true"
                                />
                            </button>
                            <input
                                type="range"
                                min="8"
                                max="92"
                                value={selectedHsl.lightness}
                                className="h-36 w-6 cursor-pointer accent-white [writing-mode:vertical-lr] sm:h-44"
                                style={{ direction: 'rtl' }}
                                aria-label={`Adjust ${getItemDisplayName(item)} brightness`}
                                onChange={handleLightnessChange}
                            />
                        </div>
                    )}
                </div>

                {textConfig ? (
                    <label className="grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
                        {textConfig.label}
                        <input
                            value={customization[textConfig.key] ?? ''}
                            className="min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white outline-none focus:border-violet-200"
                            maxLength={MAX_CUSTOM_TEXT_LENGTH}
                            placeholder={textConfig.placeholder}
                            onChange={handleTextChange}
                        />
                    </label>
                ) : null}

                {symbolConfig ? (
                    <div className="grid min-w-0 gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{symbolConfig.label}</p>
                        <div className="grid min-w-0 grid-cols-3 gap-2 rounded-xl bg-white/8 p-2">
                            {symbolConfig.options.map((symbolOption) => {
                                const SymbolVisual = SYMBOL_VISUALS[symbolOption.value];
                                const isSelected = customization[symbolConfig.key] === symbolOption.value;

                                return (
                                    <button
                                        key={symbolOption.value}
                                        type="button"
                                        className={`grid min-w-0 gap-1 rounded-xl border px-2 py-2 text-center text-xs font-semibold transition ${isSelected ? 'border-violet-200 bg-violet-400/35 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                                        aria-pressed={isSelected}
                                        onClick={() => onSymbolChange(symbolConfig.key, symbolOption.value)}
                                    >
                                        <span className="flex h-10 min-w-0 items-center justify-center overflow-visible">
                                            {SymbolVisual ? (
                                                <SymbolVisual className={SYMBOL_PREVIEW_CLASSES[symbolOption.value]} aria-hidden="true" />
                                            ) : null}
                                        </span>
                                        <span className="truncate">{symbolOption.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                {canChangeSide ? (
                    <div className="grid min-w-0 gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Side</p>
                        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-white/8 p-2">
                            <button
                                type="button"
                                className={`grid h-10 w-12 shrink-0 place-items-center rounded-lg border transition sm:w-14 ${selectedSide === 'left' ? 'border-violet-200 bg-violet-400/35 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                                aria-label={`Move ${getItemDisplayName(item)} to the left side`}
                                aria-pressed={selectedSide === 'left'}
                                onClick={() => onSideChange('left')}
                            >
                                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <span className="min-w-0 truncate text-sm font-semibold capitalize text-slate-200">{selectedSide}</span>
                            <button
                                type="button"
                                className={`grid h-10 w-12 shrink-0 place-items-center rounded-lg border transition sm:w-14 ${selectedSide === 'right' ? 'border-violet-200 bg-violet-400/35 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
                                aria-label={`Move ${getItemDisplayName(item)} to the right side`}
                                aria-pressed={selectedSide === 'right'}
                                onClick={() => onSideChange('right')}
                            >
                                <ArrowRight className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                ) : null}

                <ActionButton
                    type="button"
                    fullWidth
                    className="h-10 bg-violet-500 text-white hover:bg-violet-400 disabled:bg-white/10 disabled:text-slate-400"
                    disabled={isAddToCartDisabled}
                    onClick={onAddToCart}
                >
                    {addToCartLabel}
                </ActionButton>
            </div>
        </aside>
    );
}

import { THEMES } from '@/context/themeContext';

// Renders a mini theme preview swatch for shop/inventory theme items
// (theme items have no companion visual).
export function ThemeItemVisual({ item }) {
    const themeId = item.assetKey?.replace(/^theme-/, '');
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return null;

    const { preview, emoji } = theme;

    return (
        <div className="flex h-full w-full items-center justify-center">
            <div
                className="relative h-[74%] w-[86%] overflow-hidden rounded-xl border border-black/10 shadow-inner"
                style={{ backgroundColor: preview.bg }}
            >
                <div className="absolute left-2 top-2 h-1/3 w-3/5 rounded-md" style={{ backgroundColor: preview.card }} />
                <div className="absolute bottom-2 left-2 h-2 w-2/5 rounded-full" style={{ backgroundColor: preview.accent }} />
                <div className="absolute bottom-2 left-[48%] size-2 rounded-full" style={{ backgroundColor: preview.extra }} />
                <span className="absolute right-1.5 top-1.5 text-base leading-none">{emoji}</span>
            </div>
        </div>
    );
}

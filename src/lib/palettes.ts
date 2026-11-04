export type PaletteId = 'violet' | 'teal' | 'rose' | 'amber' | 'emerald' | 'ocean';

export const ACCENT_PALETTES: { id: PaletteId; label: string; swatch: string }[] = [
  { id: 'violet', label: 'Violet', swatch: 'hsl(258 84% 60%)' },
  { id: 'teal', label: 'Teal', swatch: 'hsl(187 92% 32%)' },
  { id: 'rose', label: 'Rose', swatch: 'hsl(337 82% 55%)' },
  { id: 'amber', label: 'Amber', swatch: 'hsl(33 90% 42%)' },
  { id: 'emerald', label: 'Emerald', swatch: 'hsl(152 62% 32%)' },
  { id: 'ocean', label: 'Ocean', swatch: 'hsl(214 90% 48%)' },
];

export type WallpaperId = 'none' | 'dots' | 'grid' | 'gradient' | 'waves' | 'bloom';

export const WALLPAPERS: { id: WallpaperId; label: string; className: string }[] = [
  { id: 'none', label: 'Без обоев', className: 'wallpaper-none' },
  { id: 'dots', label: 'Точки', className: 'wallpaper-dots' },
  { id: 'grid', label: 'Сетка', className: 'wallpaper-grid' },
  { id: 'gradient', label: 'Градиент', className: 'wallpaper-gradient' },
  { id: 'waves', label: 'Волны', className: 'wallpaper-waves' },
  { id: 'bloom', label: 'Свечение', className: 'wallpaper-bloom' },
];

export type NameColorId =
  | 'default'
  | 'violet'
  | 'teal'
  | 'rose'
  | 'amber'
  | 'emerald'
  | 'ocean'
  | 'graphite';

export const NAME_COLORS: { id: NameColorId; label: string; swatch: string }[] = [
  { id: 'default', label: 'Как в теме', swatch: 'hsl(var(--chat-name, var(--primary)))' },
  { id: 'violet', label: 'Violet', swatch: 'hsl(258 84% 60%)' },
  { id: 'teal', label: 'Teal', swatch: 'hsl(187 92% 34%)' },
  { id: 'rose', label: 'Rose', swatch: 'hsl(337 82% 57%)' },
  { id: 'amber', label: 'Amber', swatch: 'hsl(33 90% 44%)' },
  { id: 'emerald', label: 'Emerald', swatch: 'hsl(152 62% 34%)' },
  { id: 'ocean', label: 'Ocean', swatch: 'hsl(214 90% 50%)' },
  { id: 'graphite', label: 'Graphite', swatch: 'hsl(260 8% 45%)' },
];

export interface ChatAppearance {
  palette: PaletteId;
  wallpaper: WallpaperId;
  nameColor: NameColorId;
}

export const DEFAULT_CHAT_APPEARANCE: ChatAppearance = {
  palette: 'violet',
  wallpaper: 'none',
  nameColor: 'default',
};

export const PALETTE_STORAGE_KEY = 'slink:palette';

/** Применяет глобальную палитру к документу (CSS-переменные в globals.css). */
export function applyGlobalPalette(palette: PaletteId) {
  if (typeof document === 'undefined') return;

  if (palette === 'violet') {
    document.documentElement.removeAttribute('data-palette');
  } else {
    document.documentElement.dataset.palette = palette;
  }

  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  } catch {
    // приватный режим — не критично
  }
}

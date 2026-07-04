// The palette registry. Adding a theme = one entry here plus one [data-theme]
// block in globals.css. Nothing else needs to change; every token cascades from
// the CSS. `system` follows the OS between Berry (light) and Berry Dusk (dark).

export type ThemeId =
  | 'system'
  | 'light'
  | 'dark'
  | 'rose-quartz'
  | 'lavender'
  | 'sage'
  | 'plum-night';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  mode: 'system' | 'light' | 'dark';
  // Swatch colours for the picker chip: [background, accent].
  swatch: [string, string];
}

export const THEMES: ThemeMeta[] = [
  { id: 'system', name: 'System', mode: 'system', swatch: ['#faf9f6', '#8e3b5c'] },
  { id: 'light', name: 'Berry', mode: 'light', swatch: ['#faf9f6', '#8e3b5c'] },
  { id: 'rose-quartz', name: 'Rose Quartz', mode: 'light', swatch: ['#fff6f7', '#c0506f'] },
  { id: 'lavender', name: 'Lavender', mode: 'light', swatch: ['#faf8ff', '#6f5cc4'] },
  { id: 'sage', name: 'Sage', mode: 'light', swatch: ['#f6f8ee', '#5e7a35'] },
  { id: 'dark', name: 'Berry Dusk', mode: 'dark', swatch: ['#1a1a18', '#e0789c'] },
  { id: 'plum-night', name: 'Plum Night', mode: 'dark', swatch: ['#1b1826', '#b79ce8'] },
];

export const THEME_IDS = THEMES.map((t) => t.id);

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_IDS as string[]).includes(v);
}

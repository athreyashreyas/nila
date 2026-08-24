import { describe, expect, it } from 'vitest';
import { THEMES, THEME_IDS, isThemeId } from './themes';

describe('the theme registry', () => {
  it('gives every theme an id, a name, a mode and two swatch colours', () => {
    for (const t of THEMES) {
      expect(t.id).toMatch(/^[a-z-]+$/); // matches a [data-theme] block in globals.css
      expect(t.name.length).toBeGreaterThan(0);
      expect(['system', 'light', 'dark']).toContain(t.mode);
      expect(t.swatch).toHaveLength(2);
      for (const hex of t.swatch) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('uses each id and each name once', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(new Set(THEMES.map((t) => t.name)).size).toBe(THEMES.length);
  });

  it('leads with System, which is the one that follows the OS', () => {
    expect(THEMES[0].id).toBe('system');
    expect(THEMES[0].mode).toBe('system');
  });

  it('has exactly one system entry; every other theme commits to a mode', () => {
    expect(THEMES.filter((t) => t.mode === 'system')).toHaveLength(1);
    expect(THEMES.some((t) => t.mode === 'light')).toBe(true);
    expect(THEMES.some((t) => t.mode === 'dark')).toBe(true);
  });

  it('gives System the same swatch as the light theme it falls back to', () => {
    const light = THEMES.find((t) => t.id === 'light')!;
    expect(THEMES[0].swatch).toEqual(light.swatch);
  });

  it('keeps light backgrounds light and dark ones dark', () => {
    // The swatch chip is the only preview of a theme, so a dark theme showing a
    // pale chip would be actively misleading.
    const brightness = (hex: string) => {
      const c = hex.replace('#', '');
      return [0, 2, 4].reduce((s, i) => s + parseInt(c.slice(i, i + 2), 16), 0) / 3;
    };
    for (const t of THEMES) {
      if (t.mode === 'light') expect(brightness(t.swatch[0])).toBeGreaterThan(200);
      if (t.mode === 'dark') expect(brightness(t.swatch[0])).toBeLessThan(80);
    }
  });

  it('gives every swatch an accent that stands off its own background', () => {
    const lum = (hex: string) => {
      const c = hex.replace('#', '');
      const ch = (i: number) => {
        const v = parseInt(c.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
    };
    for (const t of THEMES) {
      const [bg, accent] = [lum(t.swatch[0]), lum(t.swatch[1])].sort((a, b) => b - a);
      expect((bg + 0.05) / (accent + 0.05)).toBeGreaterThan(3);
    }
  });
});

describe('THEME_IDS and isThemeId', () => {
  it('lists exactly the ids in the registry, in order', () => {
    expect(THEME_IDS).toEqual(THEMES.map((t) => t.id));
  });

  it('accepts every id the registry offers', () => {
    for (const id of THEME_IDS) expect(isThemeId(id)).toBe(true);
  });

  it('rejects anything else, including the shapes localStorage hands back', () => {
    // The stored preference is read straight out of localStorage, so the guard
    // has to survive a value written by an older build or by nothing at all.
    for (const value of ['berry', '', 'System', null, undefined, 0, {}, ['light']]) {
      expect(isThemeId(value)).toBe(false);
    }
  });
});

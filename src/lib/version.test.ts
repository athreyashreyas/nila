import { describe, expect, it } from 'vitest';
import { APP_VERSION, CHANGELOG } from './version';
import { GUIDE, type GuideArtKind } from './guide';
import { isNewerVersion } from './whatsNew';

/**
 * The changelog and the guide are hand-maintained lists doing load-bearing
 * work: CHANGELOG[0] is the app version, What's new is gated on it, and both
 * lists name their illustrations by string. Every way these go wrong is silent
 * at runtime and shows up only in the What's-new pane.
 */

// Every kind GuideArt knows how to draw. The union is erased at runtime, so the
// catalogue is restated here and held against both lists.
const ART_KINDS = new Set<GuideArtKind>([
  'logo',
  'phase',
  'timeline',
  'period',
  'checkin',
  'calendar',
  'insights',
  'privacy',
  'sync',
  'themes',
  'reminders',
  'message',
]);

describe('APP_VERSION', () => {
  it('is the newest release, the single number there is to bump', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].version);
  });

  it('is a plain dotted version isNewerVersion can rank', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(isNewerVersion(APP_VERSION, null)).toBe(true);
    expect(isNewerVersion(APP_VERSION, APP_VERSION)).toBe(false);
  });
});

describe('CHANGELOG', () => {
  it('is ordered newest first', () => {
    // What's new reads entry zero and gates on it; an entry added at the bottom
    // would never reach anybody.
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(isNewerVersion(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBe(true);
    }
  });

  it('has its dates running newest first too', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date).toBe(true);
    }
  });

  it('lists each version once', () => {
    const versions = CHANGELOG.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('gives every entry a version, an ISO date, a title and a highlight', () => {
    for (const e of CHANGELOG) {
      expect(e.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(e.date))).toBe(false);
      expect(e.title.trim().length).toBeGreaterThan(0);
      expect(e.highlights.length).toBeGreaterThan(0);
      for (const h of e.highlights) expect(h.trim().length).toBeGreaterThan(0);
    }
  });

  it('only asks for illustrations GuideArt can actually draw', () => {
    for (const e of CHANGELOG) {
      if (e.art) expect(ART_KINDS.has(e.art)).toBe(true);
    }
  });

  it('gives any how-to steps real text rather than empty bullets', () => {
    for (const e of CHANGELOG) {
      for (const step of e.howTo ?? []) expect(step.trim().length).toBeGreaterThan(0);
    }
  });

  it('marks some releases major, since the pane tints and badges those', () => {
    expect(CHANGELOG.some((e) => e.major)).toBe(true);
    expect(CHANGELOG.some((e) => !e.major)).toBe(true);
  });

  it('keeps the em dash out, the way the rest of the copy does', () => {
    for (const e of CHANGELOG) {
      for (const line of [e.title, ...e.highlights, ...(e.howTo ?? [])]) {
        expect(line).not.toContain('—');
      }
    }
  });
});

describe('GUIDE', () => {
  it('gives every section an id, a title, a body and an illustration', () => {
    for (const s of GUIDE) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      for (const para of s.body) expect(para.trim().length).toBeGreaterThan(0);
      expect(ART_KINDS.has(s.art)).toBe(true);
    }
  });

  it('uses each section id once, since the guide navigates by it', () => {
    const ids = GUIDE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives any steps real text', () => {
    for (const s of GUIDE) {
      for (const step of s.steps ?? []) expect(step.trim().length).toBeGreaterThan(0);
    }
  });

  it('leaves no illustration unused, so the catalogue and the guide stay in step', () => {
    const used = new Set<GuideArtKind>();
    for (const s of GUIDE) used.add(s.art);
    for (const e of CHANGELOG) if (e.art) used.add(e.art);
    expect([...ART_KINDS].filter((k) => !used.has(k))).toEqual([]);
  });

  it('keeps the em dash out here too', () => {
    for (const s of GUIDE) {
      for (const line of [s.title, ...s.body, ...(s.steps ?? [])]) {
        expect(line).not.toContain('—');
      }
    }
  });
});

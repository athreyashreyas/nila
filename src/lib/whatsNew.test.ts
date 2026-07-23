import { describe, it, expect } from 'vitest';
import { isNewerVersion } from '@/lib/whatsNew';
import { CHANGELOG, APP_VERSION } from '@/lib/version';

describe('whatsNew/isNewerVersion', () => {
  it('treats a never-seen version as new', () => {
    expect(isNewerVersion('1.0.0', null)).toBe(true);
    expect(isNewerVersion('1.0.0', '')).toBe(true);
  });

  it('is strict: the same version is not new', () => {
    expect(isNewerVersion('2.3.0', '2.3.0')).toBe(false);
  });

  it('compares each part numerically, not as text', () => {
    expect(isNewerVersion('2.10.0', '2.9.0')).toBe(true);
    expect(isNewerVersion('2.9.0', '2.10.0')).toBe(false);
    expect(isNewerVersion('10.0.0', '9.9.9')).toBe(true);
  });

  it('compares major before minor before patch', () => {
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('2.3.1', '2.3.0')).toBe(true);
    expect(isNewerVersion('2.3.0', '2.3.1')).toBe(false);
  });

  it('treats missing parts as zero', () => {
    expect(isNewerVersion('2.1', '2.0.9')).toBe(true);
    expect(isNewerVersion('2', '2.0.0')).toBe(false);
  });
});

describe('changelog', () => {
  it('takes APP_VERSION from the newest entry', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].version);
  });

  it('is ordered newest first, with no duplicates', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(isNewerVersion(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBe(true);
    }
  });

  it('gives every release a title', () => {
    for (const entry of CHANGELOG) {
      expect(entry.title.length).toBeGreaterThan(0);
    }
  });
});

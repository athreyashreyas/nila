import { afterEach, describe, expect, it, vi } from 'vitest';
import { TOAST, pick, pickDaily } from './phrases';

const POOLS = Object.entries(TOAST) as [keyof typeof TOAST, readonly string[]][];

afterEach(() => vi.useRealTimers());

describe('pick', () => {
  it('always returns a member of the pool', () => {
    const pool = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 200; i++) expect(pool).toContain(pick(pool));
  });

  it('reaches every line eventually, so no phrase is unreachable', () => {
    // A `% length` that was off by one would quietly retire the last line.
    const pool = ['a', 'b', 'c', 'd'] as const;
    const seen = new Set(Array.from({ length: 400 }, () => pick(pool)));
    expect(seen.size).toBe(pool.length);
  });

  it('handles a pool of one without ever going out of bounds', () => {
    expect(pick(['only'])).toBe('only');
  });
});

describe('pickDaily', () => {
  it('always returns a member of the pool', () => {
    vi.useFakeTimers();
    const pool = ['a', 'b', 'c'] as const;
    for (let day = 0; day < 30; day++) {
      vi.setSystemTime(day * 86_400_000);
      expect(pool).toContain(pickDaily(pool));
    }
  });

  it('is stable within a day, which is the whole point of it', () => {
    vi.useFakeTimers();
    const pool = ['a', 'b', 'c', 'd', 'e'] as const;
    const base = 20_000 * 86_400_000;
    vi.setSystemTime(base);
    const chosen = pickDaily(pool);
    for (const hours of [1, 6, 12, 23]) {
      vi.setSystemTime(base + hours * 3_600_000);
      expect(pickDaily(pool)).toBe(chosen);
    }
  });

  it('advances one step a day, and cycles through the whole pool', () => {
    vi.useFakeTimers();
    const pool = ['a', 'b', 'c', 'd', 'e'] as const;
    const base = 20_000 * 86_400_000;
    const run: string[] = [];
    for (let day = 0; day < pool.length * 2; day++) {
      vi.setSystemTime(base + day * 86_400_000);
      run.push(pickDaily(pool));
    }
    expect(new Set(run).size).toBe(pool.length);
    // The second lap repeats the first exactly.
    expect(run.slice(pool.length)).toEqual(run.slice(0, pool.length));
  });

  it('never repeats on consecutive days', () => {
    vi.useFakeTimers();
    const pool = ['a', 'b', 'c', 'd'] as const;
    const base = 20_000 * 86_400_000;
    for (let day = 0; day < 12; day++) {
      vi.setSystemTime(base + day * 86_400_000);
      const today = pickDaily(pool);
      vi.setSystemTime(base + (day + 1) * 86_400_000);
      expect(pickDaily(pool)).not.toBe(today);
    }
  });
});

describe('the toast pools', () => {
  it('gives every toast more than one line, so nothing feels canned', () => {
    for (const [name, pool] of POOLS) {
      expect(pool.length, name).toBeGreaterThan(1);
    }
  });

  it('never repeats a line within a pool', () => {
    for (const [name, pool] of POOLS) {
      expect(new Set(pool).size, name).toBe(pool.length);
    }
  });

  it('writes every line as trimmed, non-empty copy', () => {
    for (const [name, pool] of POOLS) {
      for (const line of pool) {
        expect(line.trim(), name).toBe(line);
        expect(line.length, name).toBeGreaterThan(3);
      }
    }
  });

  it('keeps the em dash out, as the file says it must', () => {
    for (const [name, pool] of POOLS) {
      for (const line of pool) expect(line, name).not.toContain('—');
    }
  });

  it('marks a success with a tick and leaves the errors without one', () => {
    // The tick is what reads as "done"; putting one on a failure would be a
    // small lie at exactly the wrong moment.
    for (const line of TOAST.saveError) expect(line).not.toContain('✓');
    for (const line of TOAST.removeError) expect(line).not.toContain('✓');
    for (const line of TOAST.checkinSaved) expect(line).toContain('✓');
    for (const line of TOAST.entrySaved) expect(line).toContain('✓');
  });

  it('keeps the errors reassuring rather than alarming', () => {
    for (const line of [...TOAST.saveError, ...TOAST.removeError]) {
      expect(line).not.toMatch(/error|failed|invalid|fatal/i);
      expect(line).not.toContain('!');
    }
  });

  it('never shouts, in any pool', () => {
    for (const [name, pool] of POOLS) {
      for (const line of pool) expect(line, name).not.toContain('!');
    }
  });

  it('keeps each line short enough to sit in a toast', () => {
    for (const [name, pool] of POOLS) {
      for (const line of pool) expect(line.length, name).toBeLessThan(80);
    }
  });
});

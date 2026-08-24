import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatDisplayDate,
  formatMonthYear,
  fromISODate,
  getDaysInMonth,
  getFirstDayOfMonth,
  isSameDay,
  startOfDay,
  subDays,
  toISODate,
} from './dates';

/**
 * Every date in Nila is a calendar day, not an instant: a period starts on a
 * day, a log belongs to a day. The whole module works in local time for one
 * reason — toISOString() returns UTC, which names the previous day anywhere
 * ahead of Greenwich, and a check-in saved in the evening would land on
 * yesterday. These tests build dates locally and never through Date.parse of a
 * bare 'YYYY-MM-DD', which JS reads as UTC.
 */
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('toISODate', () => {
  it('writes the local calendar date, zero-padded', () => {
    expect(toISODate(local(2026, 3, 5))).toBe('2026-03-05');
    expect(toISODate(local(2026, 12, 25))).toBe('2026-12-25');
  });

  it('names the local day, not the UTC one', () => {
    // The bug the comment in the module is about: late evening is still today.
    expect(toISODate(local(2026, 3, 5, 23, 59))).toBe('2026-03-05');
    expect(toISODate(local(2026, 3, 5, 0, 1))).toBe('2026-03-05');
  });

  it('ignores the time of day entirely', () => {
    expect(toISODate(local(2026, 3, 5, 14, 30))).toBe(toISODate(local(2026, 3, 5)));
  });
});

describe('fromISODate', () => {
  it('parses to local midnight', () => {
    const d = fromISODate('2026-03-05');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips with toISODate in both directions', () => {
    for (const iso of ['2026-01-01', '2026-02-28', '2028-02-29', '2026-12-31']) {
      expect(toISODate(fromISODate(iso))).toBe(iso);
    }
    const d = local(2026, 7, 4);
    expect(fromISODate(toISODate(d)).getTime()).toBe(d.getTime());
  });

  it('handles a leap day', () => {
    expect(fromISODate('2028-02-29').getDate()).toBe(29);
  });
});

describe('addDays and subDays', () => {
  it('move by whole days', () => {
    expect(toISODate(addDays(local(2026, 3, 5), 3))).toBe('2026-03-08');
    expect(toISODate(subDays(local(2026, 3, 5), 3))).toBe('2026-03-02');
  });

  it('cross month and year boundaries', () => {
    expect(toISODate(addDays(local(2026, 1, 31), 1))).toBe('2026-02-01');
    expect(toISODate(addDays(local(2026, 12, 31), 1))).toBe('2027-01-01');
    expect(toISODate(subDays(local(2026, 1, 1), 1))).toBe('2025-12-31');
  });

  it('know February in a leap year', () => {
    expect(toISODate(addDays(local(2028, 2, 28), 1))).toBe('2028-02-29');
    expect(toISODate(addDays(local(2026, 2, 28), 1))).toBe('2026-03-01');
  });

  it('do not mutate the date they were given', () => {
    const original = local(2026, 3, 5);
    addDays(original, 10);
    subDays(original, 10);
    expect(toISODate(original)).toBe('2026-03-05');
  });

  it('are inverses of one another', () => {
    const start = local(2026, 3, 5);
    expect(toISODate(subDays(addDays(start, 28), 28))).toBe('2026-03-05');
  });

  it('take zero and negative counts', () => {
    expect(toISODate(addDays(local(2026, 3, 5), 0))).toBe('2026-03-05');
    expect(toISODate(addDays(local(2026, 3, 5), -1))).toBe('2026-03-04');
  });
});

describe('daysBetween', () => {
  it('counts forwards as positive and backwards as negative', () => {
    expect(daysBetween(local(2026, 3, 1), local(2026, 3, 29))).toBe(28);
    expect(daysBetween(local(2026, 3, 29), local(2026, 3, 1))).toBe(-28);
  });

  it('is zero for the same day', () => {
    expect(daysBetween(local(2026, 3, 5), local(2026, 3, 5))).toBe(0);
  });

  it('rounds, so an hour of drift never costs a whole day', () => {
    // A DST shift makes a "28 day" span 27 or 29 hours short of 28×24h. Cycle
    // lengths are counted with this, and flooring would lose a day twice a year.
    expect(daysBetween(local(2026, 3, 1, 0, 0), local(2026, 3, 29, 1, 0))).toBe(28);
    expect(daysBetween(local(2026, 3, 1, 0, 0), local(2026, 3, 28, 23, 0))).toBe(28);
  });

  it('agrees with addDays over a long span', () => {
    const start = local(2026, 1, 15);
    for (const n of [1, 30, 90, 365]) {
      expect(daysBetween(start, addDays(start, n))).toBe(n);
    }
  });
});

describe('startOfDay', () => {
  it('drops the time, keeping the calendar date', () => {
    const noon = local(2026, 3, 5, 12, 30);
    const start = startOfDay(noon);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(toISODate(start)).toBe('2026-03-05');
  });

  it('leaves an already-midnight date where it is', () => {
    const midnight = local(2026, 3, 5);
    expect(startOfDay(midnight).getTime()).toBe(midnight.getTime());
  });

  it('does not mutate its argument', () => {
    const noon = local(2026, 3, 5, 12, 30);
    startOfDay(noon);
    expect(noon.getHours()).toBe(12);
  });
});

describe('isSameDay', () => {
  it('is true across any two times on the same date', () => {
    expect(isSameDay(local(2026, 3, 5, 0, 1), local(2026, 3, 5, 23, 59))).toBe(true);
  });

  it('is false a minute either side of midnight', () => {
    expect(isSameDay(local(2026, 3, 5, 23, 59), local(2026, 3, 6, 0, 1))).toBe(false);
  });

  it('compares the whole date, not just the day number', () => {
    // The 5th of two different months, and of two different years.
    expect(isSameDay(local(2026, 3, 5), local(2026, 4, 5))).toBe(false);
    expect(isSameDay(local(2026, 3, 5), local(2027, 3, 5))).toBe(false);
  });
});

describe('the display formats', () => {
  it('write a full weekday, month and day', () => {
    expect(formatDisplayDate(local(2026, 3, 5))).toBe('Thursday, March 5');
  });

  it('write a month with its year, so two Marches never read alike', () => {
    expect(formatMonthYear(local(2026, 3, 5))).toBe('March 2026');
    expect(formatMonthYear(local(2027, 3, 5))).toBe('March 2027');
  });
});

describe('the calendar-grid helpers', () => {
  it('give each month its real length', () => {
    expect(getDaysInMonth(2026, 0)).toBe(31); // January
    expect(getDaysInMonth(2026, 3)).toBe(30); // April
    expect(getDaysInMonth(2026, 1)).toBe(28); // February, common year
    expect(getDaysInMonth(2028, 1)).toBe(29); // February, leap year
  });

  it('are right on a century that is not a leap year', () => {
    expect(getDaysInMonth(2100, 1)).toBe(28);
    expect(getDaysInMonth(2000, 1)).toBe(29);
  });

  it('give the lead offset as a day index, Sunday first', () => {
    // 1 March 2026 is a Sunday; 1 April 2026 is a Wednesday.
    expect(getFirstDayOfMonth(2026, 2)).toBe(0);
    expect(getFirstDayOfMonth(2026, 3)).toBe(3);
  });

  it('always return an offset a seven-column grid can use', () => {
    for (let month = 0; month < 12; month++) {
      const lead = getFirstDayOfMonth(2026, month);
      expect(lead).toBeGreaterThanOrEqual(0);
      expect(lead).toBeLessThanOrEqual(6);
      expect(getDaysInMonth(2026, month)).toBeGreaterThanOrEqual(28);
      expect(getDaysInMonth(2026, month)).toBeLessThanOrEqual(31);
    }
  });

  it('agree with the date they describe', () => {
    for (let month = 0; month < 12; month++) {
      expect(getFirstDayOfMonth(2026, month)).toBe(new Date(2026, month, 1).getDay());
      const last = new Date(2026, month, getDaysInMonth(2026, month));
      expect(last.getMonth()).toBe(month); // the length did not overflow
    }
  });
});

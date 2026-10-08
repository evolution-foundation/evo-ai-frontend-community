import { afterAll, describe, expect, it } from 'vitest';
import { toDateTimeLocalValue } from './dateTimeLocal';

const originalTZ = process.env.TZ;
process.env.TZ = 'America/Sao_Paulo';

afterAll(() => {
  process.env.TZ = originalTZ;
});

describe('toDateTimeLocalValue', () => {
  it('runs in a timezone other than UTC', () => {
    expect(new Date('2026-10-06T11:40:00.000Z').getTimezoneOffset()).toBe(180);
  });

  it('formats a UTC ISO string as the local wall-clock time', () => {
    expect(toDateTimeLocalValue('2026-10-06T11:40:00.000Z')).toBe('2026-10-06T08:40');
  });

  it('round-trips through new Date(value).toISOString() without shifting', () => {
    const iso = '2026-10-06T11:40:00.000Z';
    expect(new Date(toDateTimeLocalValue(iso)).toISOString()).toBe(iso);
  });

  it('formats a Date in local time', () => {
    expect(toDateTimeLocalValue(new Date(2026, 9, 6, 23, 5))).toBe('2026-10-06T23:05');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(toDateTimeLocalValue(undefined)).toBe('');
    expect(toDateTimeLocalValue(null)).toBe('');
    expect(toDateTimeLocalValue('')).toBe('');
    expect(toDateTimeLocalValue('not a date')).toBe('');
  });
});

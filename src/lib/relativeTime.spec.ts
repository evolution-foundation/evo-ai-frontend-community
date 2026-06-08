import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relativeTime';

const enOpts = { locale: 'en', justNowLabel: 'just now' };
const ptOpts = { locale: 'pt-BR', justNowLabel: 'agora mesmo' };

function diff(now: Date, seconds: number) {
  return new Date(now.getTime() - seconds * 1000);
}

describe('formatRelativeTime', () => {
  const now = new Date('2026-05-20T13:00:00Z');

  it('returns the just-now label when the delta is below the threshold (5s default)', () => {
    expect(formatRelativeTime(diff(now, 0), now, enOpts)).toBe('just now');
    expect(formatRelativeTime(diff(now, 3), now, enOpts)).toBe('just now');
    expect(formatRelativeTime(diff(now, 4), now, enOpts)).toBe('just now');
  });

  it('switches to seconds once the just-now threshold is crossed', () => {
    expect(formatRelativeTime(diff(now, 10), now, enOpts)).toBe('10 seconds ago');
    expect(formatRelativeTime(diff(now, 59), now, enOpts)).toBe('59 seconds ago');
  });

  it('switches to minutes between 1m and 59m', () => {
    expect(formatRelativeTime(diff(now, 60), now, enOpts)).toBe('1 minute ago');
    expect(formatRelativeTime(diff(now, 125), now, enOpts)).toBe('2 minutes ago');
    expect(formatRelativeTime(diff(now, 59 * 60), now, enOpts)).toBe('59 minutes ago');
  });

  it('keeps each minute label stable for the full minute (floor, not round)', () => {
    // 90s elapsed → 1m30s, NOT yet 2 minutes; label should stay "1 minute ago"
    // until the second minute completes. Without Math.floor this would
    // incorrectly skip to "2 minutes ago" at 1m30s.
    expect(formatRelativeTime(diff(now, 90), now, enOpts)).toBe('1 minute ago');
    expect(formatRelativeTime(diff(now, 119), now, enOpts)).toBe('1 minute ago');
    expect(formatRelativeTime(diff(now, 120), now, enOpts)).toBe('2 minutes ago');
  });

  it('switches to hours between 1h and 23h', () => {
    expect(formatRelativeTime(diff(now, 60 * 60), now, enOpts)).toBe('1 hour ago');
    expect(formatRelativeTime(diff(now, 3 * 60 * 60), now, enOpts)).toBe('3 hours ago');
  });

  it('keeps each hour label stable for the full hour (floor, not round)', () => {
    // 90 minutes elapsed → 1h30m; label should stay "1 hour ago" until 2h complete.
    expect(formatRelativeTime(diff(now, 90 * 60), now, enOpts)).toBe('1 hour ago');
    expect(formatRelativeTime(diff(now, 119 * 60), now, enOpts)).toBe('1 hour ago');
    expect(formatRelativeTime(diff(now, 120 * 60), now, enOpts)).toBe('2 hours ago');
  });

  it('switches to days for ≥24h and keeps each day stable for 24h', () => {
    expect(formatRelativeTime(diff(now, 24 * 60 * 60), now, enOpts)).toBe('yesterday');
    expect(formatRelativeTime(diff(now, 36 * 60 * 60), now, enOpts)).toBe('yesterday');
    expect(formatRelativeTime(diff(now, 3 * 24 * 60 * 60), now, enOpts)).toBe('3 days ago');
  });

  it('falls back to en when the locale string is malformed (does not throw)', () => {
    const date = diff(now, 10);
    expect(() =>
      formatRelativeTime(date, now, { locale: '!!!', justNowLabel: 'just now' }),
    ).not.toThrow();
    expect(
      formatRelativeTime(date, now, { locale: '!!!', justNowLabel: 'just now' }),
    ).toBe('10 seconds ago');
  });

  it('localises naturally to pt-BR via Intl.RelativeTimeFormat', () => {
    expect(formatRelativeTime(diff(now, 0), now, ptOpts)).toBe('agora mesmo');
    expect(formatRelativeTime(diff(now, 10), now, ptOpts)).toBe('há 10 segundos');
    expect(formatRelativeTime(diff(now, 125), now, ptOpts)).toBe('há 2 minutos');
    expect(formatRelativeTime(diff(now, 60 * 60), now, ptOpts)).toBe('há 1 hora');
  });

  it('clamps negative deltas (date in the future) to absolute value', () => {
    const future = new Date(now.getTime() + 10 * 1000);
    expect(formatRelativeTime(future, now, enOpts)).toBe('10 seconds ago');
  });

  it('honours a custom justNowThresholdSeconds', () => {
    expect(
      formatRelativeTime(diff(now, 8), now, { ...enOpts, justNowThresholdSeconds: 10 }),
    ).toBe('just now');
    expect(
      formatRelativeTime(diff(now, 10), now, { ...enOpts, justNowThresholdSeconds: 10 }),
    ).toBe('10 seconds ago');
  });
});

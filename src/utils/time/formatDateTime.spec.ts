import { describe, expect, it } from 'vitest';
import { formatDateTime } from './formatDateTime';

describe('formatDateTime', () => {
  const iso = new Date(2026, 0, 10, 14, 30).toISOString();

  it.each([
    ['pt-BR', '10/01/2026 14:30'],
    ['en', '01/10/2026 2:30 PM'],
    ['es', '10/01/2026 14:30'],
  ])('orders day and month by %s', (language, expected) => {
    expect(formatDateTime(iso, language)).toBe(expected);
  });

  it('reports an unparseable date instead of printing NaN', () => {
    expect(formatDateTime('not a date', 'pt-BR')).toBe('Invalid date');
  });
});

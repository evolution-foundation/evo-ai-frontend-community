import { describe, expect, it } from 'vitest';
import { formatCurrency } from './dashboardUtils';

const norm = (s: string) => s.replace(/[\u00A0\u202F]/g, ' ');

describe('formatCurrency', () => {
  it.each([
    ['pt-BR', 'R$ 12.345,50'],
    ['en', 'R$12,345.50'],
    ['es', '12.345,50 BRL'],
  ])('keeps the real and uses the %s separators', (language, expected) => {
    expect(norm(formatCurrency(12345.5, language))).toBe(expected);
  });
});

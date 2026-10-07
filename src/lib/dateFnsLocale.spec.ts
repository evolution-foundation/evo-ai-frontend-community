import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { enUS, es, fr, it as itLocale, pt, ptBR } from 'date-fns/locale';
import { getDateFnsLocale } from './dateFnsLocale';

describe('getDateFnsLocale', () => {
  it.each([
    ['pt-BR', ptBR],
    ['pt', pt],
    ['en', enUS],
    ['es', es],
    ['fr', fr],
    ['it', itLocale],
  ])('maps %s to its date-fns locale', (language, expected) => {
    expect(getDateFnsLocale(language)).toBe(expected);
  });

  it('falls back to en-US for an unknown language', () => {
    expect(getDateFnsLocale('xx')).toBe(enUS);
  });

  it('orders day and month by the language in the localized P and p patterns', () => {
    const date = new Date(2026, 0, 10, 14, 30);
    const fmt = (pattern: string, language: string) =>
      format(date, pattern, { locale: getDateFnsLocale(language) });

    expect(fmt('P p', 'pt-BR')).toBe(format(date, 'dd/MM/yyyy HH:mm'));
    expect(fmt('P', 'pt-BR')).toBe('10/01/2026');
    expect(fmt('P p', 'en')).toBe('01/10/2026 2:30 PM');
    expect(fmt('P p', 'es')).toBe('10/01/2026 14:30');
  });
});

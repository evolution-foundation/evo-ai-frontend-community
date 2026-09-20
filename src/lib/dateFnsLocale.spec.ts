import { describe, expect, it } from 'vitest';
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
});

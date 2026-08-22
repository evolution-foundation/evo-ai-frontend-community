import { describe, it, expect } from 'vitest';
import { emptyValueKeys, missingKeys } from './_lib/parity';
import en from './en/macros.json';
import ptBR from './pt-BR/macros.json';
import pt from './pt/macros.json';
import es from './es/macros.json';
import fr from './fr/macros.json';
// Renamed to avoid shadowing vitest's `it` block helper.
import itLocale from './it/macros.json';

/**
 * macros.json parity across the six shipped locales (CRM-162).
 *
 * i18n-parity.spec.ts globs en ↔ pt-BR only, so a key added to one locale and
 * forgotten in es/fr/it/pt reaches the user as the raw key on screen with CI
 * green. macros.json carries no drift, so the whole file is enforced instead
 * of a per-card key subset.
 *
 * Orphan keys (in every locale, absent from EN) are left alone: clearing them
 * means editing EN, which the catalog-wide spec also declines to do.
 */

const TRANSLATIONS: [string, Record<string, unknown>][] = [
  ['pt-BR', ptBR],
  ['pt', pt],
  ['es', es],
  ['fr', fr],
  ['it', itLocale],
];

describe('macros i18n parity (CRM-162)', () => {
  it.each(TRANSLATIONS)('%s contains every EN key', (_name, locale) => {
    expect(missingKeys(en, locale)).toEqual([]);
  });

  it.each([['en', en] as [string, Record<string, unknown>], ...TRANSLATIONS])(
    '%s has no empty string values',
    (_name, locale) => {
      expect(emptyValueKeys(locale)).toEqual([]);
    },
  );
});

import { describe, it, expect } from 'vitest';
import en from './en/journey.json';
import ptBR from './pt-BR/journey.json';
import pt from './pt/journey.json';
import es from './es/journey.json';
import fr from './fr/journey.json';
// Renamed to avoid shadowing vitest's `it` block helper.
import itLocale from './it/journey.json';

function flatten(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/**
 * Return the value at a dot-delimited path. Returns `undefined` if any
 * segment is missing.
 */
function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[seg];
  }, obj);
}

describe('journey i18n parity (EVO-1260)', () => {
  const enKeys = new Set(flatten(en));

  // PT-BR is the canonical localised pair with EN per the card scope
  // ("scope inside: PT-BR and EN are kept in lock-step"). Drift here is
  // a regression of the card and must fail the suite.
  it('pt-BR mirrors every EN key (strict, no missing, no extras)', () => {
    const ptBrKeys = new Set(flatten(ptBR));
    const missing = [...enKeys].filter((k) => !ptBrKeys.has(k));
    const extras = [...ptBrKeys].filter((k) => !enKeys.has(k));
    expect(missing).toEqual([]);
    expect(extras).toEqual([]);
  });

  // The other Romance locales (pt, es, fr, it) carry a pre-existing drift
  // from earlier features that is OUT OF SCOPE for EVO-1260. We assert
  // soft parity here: ANY KEY added or removed by EVO-1260 must show up
  // consistently across them. To do that, we test that the NEW keys
  // introduced by this card are present in all locales. Pre-existing
  // drift is documented in the card's follow-up note and not enforced.
  const evo1260Keys = [
    'panels.scheduledAction.placeholders.selectAction',
    'panels.scheduledAction.placeholders.selectChannel',
    'panels.scheduledAction.placeholders.loadingChannels',
    'panels.scheduledAction.placeholders.loadingJourneys',
    'panels.scheduledAction.messages.noChannelsConfiguredInline',
    'panels.scheduledAction.hints.characterCount',
    'panels.conditional.placeholders.selectVariable',
    'flowEditor.nodes.sendMessage.channelLabel',
  ];

  it.each([
    ['pt', pt],
    ['es', es],
    ['fr', fr],
    ['it', itLocale],
  ])('%s contains every EVO-1260 key', (_name, locale) => {
    const localeKeys = new Set(flatten(locale));
    const missing = evo1260Keys.filter((k) => !localeKeys.has(k));
    expect(missing).toEqual([]);
  });

  // Empty-string values would pass key-presence checks but fail the user
  // (an i18n call returns "" and the UI renders blank). Reject across the
  // set of keys EVO-1260 introduced, in every locale we ship.
  it.each([
    ['en', en],
    ['pt-BR', ptBR],
    ['pt', pt],
    ['es', es],
    ['fr', fr],
    ['it', itLocale],
  ])('%s has non-empty string values for every EVO-1260 key', (_name, locale) => {
    const empties = evo1260Keys.filter((k) => {
      const v = getAtPath(locale, k);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(empties).toEqual([]);
  });
});

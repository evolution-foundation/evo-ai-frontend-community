import { describe, it, expect } from 'vitest';
import { allowedFor } from './_lib/allowlist';
import {
  emptyValueKeys,
  findLeaks,
  missingKeys,
  flattenWithValues,
} from './_lib/parity';

/** Every English and Brazilian Portuguese catalog must have matching keys,
 * nonempty values, and matching interpolation variables. Source references
 * are validated separately by npm run i18n:audit. */

type LocaleModule = Record<string, unknown>;

const enModules = import.meta.glob<LocaleModule>('./en/*.json', {
  eager: true,
  import: 'default',
});
const ptModules = import.meta.glob<LocaleModule>('./pt-BR/*.json', {
  eager: true,
  import: 'default',
});

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

// journey.json has dedicated coverage in journey-parity.spec.ts (EVO-1260),
// which owns its own allowlist. Skip it here to keep a single source of truth.
const COVERED_ELSEWHERE = new Set(['journey.json']);

const enByFile = new Map<string, LocaleModule>();
for (const [path, mod] of Object.entries(enModules)) enByFile.set(basename(path), mod);

const ptByFile = new Map<string, LocaleModule>();
for (const [path, mod] of Object.entries(ptModules)) ptByFile.set(basename(path), mod);

const files = [...enByFile.keys()].filter((f) => !COVERED_ELSEWHERE.has(f)).sort();

describe('i18n catalog parity (EVO-1430)', () => {
  it('every EN locale file has a pt-BR counterpart', () => {
    const missingFiles = files.filter((f) => !ptByFile.has(f));
    expect(missingFiles).toEqual([]);
  });

  describe.each(files)('%s', (file) => {
    const en = enByFile.get(file) as LocaleModule;
    const pt = ptByFile.get(file) as LocaleModule;

    it('pt-BR contains every EN key', () => {
      expect(missingKeys(en, pt)).toEqual([]);
    });

    it('EN contains every pt-BR key', () => {
      expect(missingKeys(pt, en)).toEqual([]);
    });

    it('EN has no empty string values', () => {
      expect(emptyValueKeys(en)).toEqual([]);
    });

    it('preserves interpolation variables in both languages', () => {
      const variables = (value: string) => [...new Set([...value.matchAll(/{{\s*-?\s*([\w.]+)/g)].map(match => match[1]))].sort();
      const enValues = Object.entries(flattenWithValues(en));
      const ptValues = new Map(Object.entries(flattenWithValues(pt)));
      const mismatches = enValues.filter(([key, value]) => typeof value === 'string' && typeof ptValues.get(key) === 'string'
        && JSON.stringify(variables(value)) !== JSON.stringify(variables(ptValues.get(key) as string))).map(([key]) => key);
      expect(mismatches).toEqual([]);
    });

    it('pt-BR has no empty string values', () => {
      expect(emptyValueKeys(pt)).toEqual([]);
    });

    it('pt-BR has no English leakage (pt-BR !== EN outside allowlist)', () => {
      const leaks = findLeaks(en, pt, allowedFor(file));
      // Surface the offending keys in the failure message per AC.
      expect(leaks, `leaks in ${file}:\n${leaks.join('\n')}`).toEqual([]);
    });
  });
});

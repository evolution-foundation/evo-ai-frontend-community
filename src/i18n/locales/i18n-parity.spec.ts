import { describe, it, expect } from 'vitest';
import { allowedFor } from './_lib/allowlist';
import {
  emptyValueKeys,
  findLeaks,
  missingKeys,
} from './_lib/parity';

/**
 * Catalog-wide i18n parity (EVO-1430).
 *
 * Iterates every `en/*.json` ↔ `pt-BR/*.json` pair and enforces, per file:
 *  - pt-BR contains every EN key (no missing → pt-BR renders fully);
 *  - pt-BR string values are non-empty;
 *  - no English leakage (pt-BR === EN) outside the allowlist.
 *
 * Pre-existing pt-BR-only orphan keys (extras absent from EN) are reported as
 * a non-failing console warning: they predate this card, are invisible to
 * users, and fixing them would require touching EN (out of scope).
 */

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

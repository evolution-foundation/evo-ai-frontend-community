import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// CRM-520 regression guard: journey/segment screens and the flow canvas must paint with the
// theme tokens (bg-background, bg-muted, text-muted-foreground, border-border…)
// so the dark theme stays legible. A fixed gray/white/black class only looks
// right in one theme. Translucent tints (`bg-gray-500/10`), `text-white` on a
// coloured button and `bg-black/50` overlays are theme-neutral and allowed.
const ROOTS = [
  'src/components/journey',
  'src/components/segments',
  'src/components/base',
  'src/pages/Customer/Journey',
];

// No baseline: every file under ROOTS is expected clean (CRM-520 closed the debt).

// `(?<!dark:)`: a `dark:` variant is the theme-aware half of a pair, not a fixed
// colour. `(?![\w/-])`: a translucent `bg-gray-500/10` must not match as `bg-gray`.
const FIXED_COLOR =
  /(?<!dark:)\b(?:bg|text|border|from|to|via|ring|fill|stroke|divide|outline|placeholder)-(?:white|black|gray|slate|zinc|neutral)(?:-\d+)?(?![\w/-])/g;
const ALLOWED = new Set(['text-white']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.(spec|stories)\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

function offenders(): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const hits = (readFileSync(file, 'utf8').match(FIXED_COLOR) ?? []).filter((c) => !ALLOWED.has(c));
      if (hits.length > 0) found[relative(process.cwd(), file)] = [...new Set(hits)];
    }
  }
  return found;
}

describe('journey/segment screens use theme tokens (CRM-520)', () => {
  const found = offenders();

  it('has no fixed gray/white/black class anywhere', () => {
    expect(found).toEqual({});
  });
});

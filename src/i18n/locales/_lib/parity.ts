/**
 * Shared i18n parity helpers (EVO-1430).
 *
 * Extracted from the original journey-only spec (EVO-1260) so the same
 * anti-leakage machinery can run over every locale file in the catalog.
 */

/** Flatten a nested locale object into dot-delimited leaf keys. */
export function flatten(obj: unknown, prefix = ''): string[] {
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

/** Flatten into a `{ 'dot.path': value }` map preserving leaf values. */
export function flattenWithValues(obj: unknown, prefix = ''): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenWithValues(v, path));
    } else {
      out[path] = v;
    }
  }
  return out;
}

/** Read the value at a dot-delimited path, or `undefined` if absent. */
export function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[seg];
  }, obj);
}

/**
 * Pure-interpolation values whose only content is a placeholder followed by a
 * numeric/symbolic suffix (e.g. "{{count}}/1000", "{{progress}}%"). These have
 * no translatable language.
 */
export const PURE_INTERPOLATION_RE = /^\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}[^a-zA-Z]*$/;

/**
 * Structurally non-translatable values — identical in every locale by nature,
 * so they never count as leakage and don't need an explicit allowlist entry.
 * Covers: pure interpolation, bare numbers, hex colors, URLs, masked secrets,
 * and strings with no Latin letters at all (symbols, separators, units).
 */
export function isIgnorableValue(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (PURE_INTERPOLATION_RE.test(v)) return true;
  if (/^\d+$/.test(v)) return true; // pure number (ports, counts)
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true; // hex color
  if (/^https?:\/\//.test(v)) return true; // URL
  if (/^[{[]/.test(v)) return true; // JSON / array placeholder blob
  if (/^ex:\s/i.test(v)) return true; // "Ex: ..." form-field sample placeholder
  if (/^\S+\.\.\.$/.test(v)) return true; // single-token masked sample ("sk-...", "SK...")
  if (!/[a-zA-Z]/.test(v)) return true; // symbol/separator/mask only
  return false;
}

export interface FileLocalePair {
  file: string;
  en: Record<string, unknown>;
  pt: Record<string, unknown>;
}

/**
 * Find English-leakage entries: pt-BR values byte-identical to EN that are
 * neither structurally ignorable nor explicitly allowlisted. Returns a list
 * of `key = "value"` strings (the AC-mandated failure shape).
 */
export function findLeaks(
  en: Record<string, unknown>,
  pt: Record<string, unknown>,
  allowed: Set<string>,
): string[] {
  const enFlat = flattenWithValues(en);
  const ptFlat = flattenWithValues(pt);
  const leaks: string[] = [];
  for (const [key, enVal] of Object.entries(enFlat)) {
    const ptVal = ptFlat[key];
    if (typeof enVal !== 'string' || typeof ptVal !== 'string') continue;
    if (!enVal.trim()) continue;
    if (enVal !== ptVal) continue;
    if (isIgnorableValue(enVal)) continue;
    if (allowed.has(enVal)) continue;
    leaks.push(`${key} = ${JSON.stringify(enVal)}`);
  }
  return leaks;
}

/** Keys present in EN but missing in pt-BR (breaks AC: pt-BR must render fully). */
export function missingKeys(en: Record<string, unknown>, pt: Record<string, unknown>): string[] {
  const ptKeys = new Set(flatten(pt));
  return flatten(en).filter((k) => !ptKeys.has(k));
}

/** String leaf keys whose value is an empty/whitespace-only string. */
export function emptyValueKeys(obj: Record<string, unknown>): string[] {
  const flat = flattenWithValues(obj);
  const empties: string[] = [];
  for (const [k, v] of Object.entries(flat)) {
    if (typeof v !== 'string') continue;
    if (v.trim() === '') empties.push(k);
  }
  return empties;
}

import { SendWebhookNodeData, WebhookBodyField, WebhookBodyValueType } from '../SendWebhookNode';

/**
 * Pure helpers for the Send Webhook structured body builder (EVO-1742).
 *
 * The structured key/value rows (`bodyStructured`) are the editor model, but the
 * raw `body` string stays the wire source-of-truth the executor reads — so every
 * structured edit is serialized back into `body`. These functions own that
 * serialization, the raw→structured parse (with a nested-JSON guard so we never
 * lossily flatten), and field validation. No React here — fully unit-testable.
 */

/** Body types that support the structured key/value builder. */
export type StructuredBodyType = 'json' | 'form';

export function isStructuredBodyType(bodyType: string | undefined): bodyType is StructuredBodyType {
  return bodyType === 'json' || bodyType === 'form';
}

// Monotonic id generator. Date.now() alone collides when rows are added in the
// same tick, so we salt with a process-local counter (mirrors the intent of the
// response-mapping ids, which this builder's rows are modelled on).
let __fieldSeq = 0;
export function genFieldId(): string {
  __fieldSeq += 1;
  return `bf_${Date.now().toString(36)}_${__fieldSeq}`;
}

export function newBodyField(): WebhookBodyField {
  return { id: genFieldId(), key: '', value: '', type: 'string' };
}

const hasVariableToken = (value: string): boolean => value.includes('{{');

/**
 * Coerce a row value to the JS primitive its `type` declares, for JSON output.
 *
 * Single source of truth for the number/boolean/variable rules (decision #5):
 * a value carrying a `{{variable}}` token can never be a real JS number/boolean,
 * so it is preserved verbatim as a string (the executor substitutes it later).
 * A `number` row whose value is not a finite numeric literal also stays a string
 * rather than emitting `NaN`.
 */
export function coerceJsonValue(value: string, type: WebhookBodyValueType): string | number | boolean {
  if (hasVariableToken(value)) return value;
  if (type === 'number') {
    const trimmed = value.trim();
    if (trimmed !== '' && Number.isFinite(Number(trimmed))) return Number(trimmed);
    return value;
  }
  if (type === 'boolean') {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }
  return value;
}

const fieldsWithKey = (fields: WebhookBodyField[]): WebhookBodyField[] =>
  fields.filter(f => f.key.trim() !== '');

/**
 * Serialize structured fields into the raw `body` string the executor reads.
 * - json: a pretty-printed JSON object, values coerced by their declared type.
 * - form: `key=value&key=value` WITHOUT percent-encoding, so `{{variables}}`
 *   survive untouched (matches the pre-existing raw form-body behavior).
 */
export function serializeBody(fields: WebhookBodyField[], bodyType: StructuredBodyType): string {
  const kept = fieldsWithKey(fields);
  if (bodyType === 'form') {
    return kept.map(f => `${f.key}=${f.value}`).join('&');
  }
  const obj: Record<string, string | number | boolean> = {};
  for (const f of kept) {
    obj[f.key] = coerceJsonValue(f.value, f.type);
  }
  return JSON.stringify(obj, null, 2);
}

function inferType(value: unknown): WebhookBodyValueType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

/**
 * Parse a raw `body` string into flat structured fields, or return `null` when
 * it cannot be represented as flat key/value rows (so the caller keeps raw mode).
 *
 * The nested guard is the back-compat safety net (decision #8): any top-level
 * value that is an object or array means the body cannot round-trip flatly, so
 * we refuse rather than silently dropping the nested data.
 */
export function tryParseToFields(
  body: string,
  bodyType: StructuredBodyType,
): WebhookBodyField[] | null {
  const trimmed = (body ?? '').trim();
  if (trimmed === '') return [];

  if (bodyType === 'form') {
    return trimmed.split('&').reduce<WebhookBodyField[]>((acc, pair) => {
      if (pair === '') return acc;
      const eq = pair.indexOf('=');
      const key = eq >= 0 ? pair.slice(0, eq) : pair;
      const value = eq >= 0 ? pair.slice(eq + 1) : '';
      acc.push({ id: genFieldId(), key, value, type: 'string' });
      return acc;
    }, []);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const fields: WebhookBodyField[] = [];
  for (const [key, raw] of Object.entries(parsed as Record<string, unknown>)) {
    // Nested object/array at the top level → cannot flatten without loss.
    if (raw !== null && typeof raw === 'object') return null;
    const type = inferType(raw);
    const value = raw === null ? '' : String(raw);
    fields.push({ id: genFieldId(), key, value, type });
  }
  return fields;
}

export type BodyFieldsError = 'blankKey' | 'duplicateKey';

/**
 * Validate structured rows for save. A fully-empty row (no key, no value) is
 * ignored; a row with a value but no key is a blankKey error; repeated keys are
 * a duplicateKey error.
 */
export function validateFields(fields: WebhookBodyField[]): { ok: true } | { ok: false; error: BodyFieldsError } {
  const seen = new Set<string>();
  for (const f of fields) {
    const key = f.key.trim();
    if (key === '') {
      if (f.value.trim() !== '') return { ok: false, error: 'blankKey' };
      continue;
    }
    if (seen.has(key)) return { ok: false, error: 'duplicateKey' };
    seen.add(key);
  }
  return { ok: true };
}

/**
 * Variable-tolerant JSON validity check for raw-mode bodies. Bodies routinely
 * embed `{{variables}}` (the executor substitutes them before sending), so a
 * naive `JSON.parse` would false-positive on legitimate bodies. We replace
 * variable tokens with a string literal before parsing.
 */
export function isValidJsonBody(body: string): boolean {
  const trimmed = (body ?? '').trim();
  if (trimmed === '') return true;
  // Replace each {{variable}} with the literal `1`, which is valid JSON in both
  // string position ("...1...") and value position (: 1), so variable-laden but
  // otherwise well-formed bodies aren't false-flagged.
  const stubbed = trimmed.replace(/\{\{[^}]*\}\}/g, '1');
  try {
    JSON.parse(stubbed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Effective editor mode for a node, render-only — NEVER persisted on mount
 * (that would spuriously dirty the panel and rewrite untouched legacy bodies).
 * Precedence: an explicitly persisted `bodyMode` always wins; otherwise existing
 * structured rows → structured; a non-empty legacy raw body → raw; a brand-new
 * structured-capable node → structured; everything else → raw.
 */
export function getEffectiveBodyMode(
  data: Pick<SendWebhookNodeData, 'bodyType' | 'body' | 'bodyStructured' | 'bodyMode'>,
): 'structured' | 'raw' {
  if (!isStructuredBodyType(data.bodyType)) return 'raw';
  if (data.bodyMode) return data.bodyMode;
  if (data.bodyStructured && data.bodyStructured.length > 0) return 'structured';
  if (data.body && data.body.trim() !== '') return 'raw';
  return 'structured';
}

import { getEvent, isCustomEvent } from './index';
import type { FieldSpec } from './types';

/**
 * The persisted Event-Properties row. Mirrors the `evo-flow` `JourneyEventProperty`
 * shape (`src/modules/journeys/services/triggers/event.trigger.ts`) and the FE
 * `JourneyTriggerNodeData.eventProperties` item. The trigger backend matches each
 * `{path, operator}` against the incoming event payload and gates filtering on
 * `Array.isArray(eventProperties) && length > 0`.
 *
 * EVO-1275 (Option A "adapter"): the persisted shape STAYS this array; the
 * functions below convert it ⇄ the flat `Record<string, unknown>` that
 * `<EventPropertiesForm>` consumes, so the backend contract and existing
 * journeys are untouched. The structured form expresses only `Equals`; an
 * edited field collapses to `Equals` while untouched rows keep their operator.
 */
export interface EventProperty {
  path: string;
  operator: { type: string; value?: unknown };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => k in bObj && deepEqual(aObj[k], bObj[k]));
}

/**
 * Flatten the persisted filter-condition array into the flat Record the form
 * consumes. Surfaces `operator.value` regardless of operator type so legacy
 * non-`Equals` rows are still visible in the form. Last-write-wins on duplicate
 * paths; blank paths are skipped.
 */
export function propertiesToRecord(props: EventProperty[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const prop of props) {
    if (!prop?.path || !prop.path.trim()) continue;
    record[prop.path] = prop.operator?.value;
  }
  return record;
}

/**
 * Convert the form's flat Record back into the persisted array. For each entry:
 * if `prev` holds a row with the same `path` whose `operator.value` deep-equals
 * the value (i.e. the field was NOT edited), KEEP that original row so its
 * operator (e.g. `Contains`) survives; otherwise emit a fresh `Equals` row.
 * This preserves untouched legacy operators and only flattens edited fields.
 */
export function recordToProperties(
  record: Record<string, unknown>,
  prev: EventProperty[] = [],
): EventProperty[] {
  return Object.entries(record).map(([key, value]) => {
    const original = prev.find(
      (p) => p.path === key && deepEqual(p.operator?.value, value),
    );
    if (original) return original;
    return { path: key, operator: { type: 'Equals', value } };
  });
}

/**
 * Required-field validation for the structured form. Custom or unknown events
 * have no schema → always valid. For canonical events, every key in the
 * event's `schema.required` must be present with a non-empty value.
 */
export function validateEventProperties(
  eventName: string,
  record: Record<string, unknown>,
): { valid: boolean; missing: string[] } {
  const entry = getEvent(eventName);
  if (!entry || isCustomEvent(eventName)) return { valid: true, missing: [] };

  const missing = Object.keys(entry.schema.required).filter((key) => {
    const value = record[key];
    return value === undefined || value === null || value === '';
  });
  return { valid: missing.length === 0, missing };
}

function fieldType(eventName: string, key: string): FieldSpec['type'] | undefined {
  const entry = getEvent(eventName);
  if (!entry) return undefined;
  return (entry.schema.required[key] ?? entry.schema.optional[key])?.type;
}

/**
 * Decide which property values survive an event switch A→B. A value is kept
 * when its key exists in the target event's schema (required ∪ optional) AND
 * its `FieldSpec.type` matches the source field's type ("compatible" = same
 * name AND same type). Targeting `custom` keeps everything; a `custom`/unknown
 * source keeps keys present in the target schema without a type check.
 */
export function preserveCompatibleValues(
  record: Record<string, unknown>,
  fromEventName: string,
  toEventName: string,
): Record<string, unknown> {
  if (isCustomEvent(toEventName)) return { ...record };

  const target = getEvent(toEventName);
  if (!target) return {};

  const sourceIsSchemaless = isCustomEvent(fromEventName) || !getEvent(fromEventName);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const targetType = fieldType(toEventName, key);
    if (targetType === undefined) continue;
    if (sourceIsSchemaless) {
      result[key] = value;
      continue;
    }
    if (fieldType(fromEventName, key) === targetType) {
      result[key] = value;
    }
  }
  return result;
}

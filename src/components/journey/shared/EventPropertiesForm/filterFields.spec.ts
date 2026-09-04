import { describe, expect, it } from 'vitest';
import { getEvent } from '@/lib/events-manifest';
import { EVENT_NAMES } from '@/lib/events-manifest/event-names';
import en from '@/i18n/locales/en/events.json';
import ptBR from '@/i18n/locales/pt-BR/events.json';
import pt from '@/i18n/locales/pt/events.json';
import es from '@/i18n/locales/es/events.json';
import fr from '@/i18n/locales/fr/events.json';
import itLocale from '@/i18n/locales/it/events.json';
import { LOOKUP_FIELDS, filterableFields } from './filterFields';

// CRM-519 regression guard: every key the trigger form OFFERS as a filter must
// be usable by a person — a human label in every locale, a select when the
// value is a CRM id or a closed set, never a raw timestamp/object. A new
// catalog key that misses one of these fails here, not in the user's face.
const LOCALES: Record<string, Record<string, unknown>> = { en, 'pt-BR': ptBR, pt, es, fr, it: itLocale };

type FieldsBlock = Record<string, { label?: string; help?: string; options?: Record<string, string> }>;

function fieldsOf(locale: Record<string, unknown>): FieldsBlock {
  return (locale.fields ?? {}) as FieldsBlock;
}

const offered = EVENT_NAMES.map((name) => getEvent(name))
  .filter((entry): entry is NonNullable<typeof entry> => !!entry && entry.eventName !== 'custom')
  .flatMap((entry) => Object.entries(filterableFields(entry)).map(([key, spec]) => ({ key, spec, event: entry.eventName })));

const offeredKeys = [...new Set(offered.map((o) => o.key))].sort();

describe('trigger filter contract (CRM-519)', () => {
  it('offers at least one filter somewhere', () => {
    expect(offeredKeys.length).toBeGreaterThan(0);
  });

  it.each(Object.keys(LOCALES))('%s has a non-empty label for every offered key', (name) => {
    const fields = fieldsOf(LOCALES[name]);
    const missing = offeredKeys.filter((key) => !fields[key]?.label?.trim());
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(LOCALES))('%s has a help line for every offered key', (name) => {
    const fields = fieldsOf(LOCALES[name]);
    const missing = offeredKeys.filter((key) => !fields[key]?.help?.trim());
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(LOCALES))('%s describes every catalog event', (name) => {
    const events = (LOCALES[name].events ?? {}) as Record<string, { description?: string }>;
    const missing = EVENT_NAMES.filter((n) => !events[n.replace(/\./g, '_')]?.description?.trim());
    expect(missing).toEqual([]);
  });

  it('never offers a date or object key (equality on those never matches)', () => {
    const bad = offered.filter((o) => o.spec.type === 'date' || o.spec.type === 'object');
    expect(bad.map((o) => `${o.event}.${o.key}`)).toEqual([]);
  });

  it('renders every offered uuid as a select (LOOKUP_FIELDS)', () => {
    const bad = offered.filter((o) => o.spec.type === 'uuid' && !(o.key in LOOKUP_FIELDS));
    expect(bad.map((o) => `${o.event}.${o.key}`)).toEqual([]);
  });

  it('declares options for every key whose description spells a closed set', () => {
    const bad = offered.filter((o) => o.spec.description?.includes('|') && !o.spec.options?.length);
    expect(bad.map((o) => `${o.event}.${o.key}`)).toEqual([]);
  });

  it.each(Object.keys(LOCALES))('%s labels every declared option value', (name) => {
    const fields = fieldsOf(LOCALES[name]);
    const missing: string[] = [];
    for (const o of offered) {
      for (const value of o.spec.options ?? []) {
        const slug = value.replace(/[^A-Za-z0-9_]/g, '_');
        if (!fields[o.key]?.options?.[slug]?.trim()) missing.push(`${o.key}.${slug}`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});

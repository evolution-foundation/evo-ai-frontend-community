import { EVENT_NAMES, type EvoFlowEventName } from './event-names';
import { EVENT_CATALOG, EVENT_CATEGORIES } from './catalog';
import type { EventCatalogEntry, EventCategory, EventDtoType, Locale } from './types';

export type { EventCatalogEntry, EventCategory, EventDtoType, EventSchema, FieldSpec, FieldType, Locale } from './types';
export { EVENT_NAMES, EVENT_CATEGORIES };
export type { EvoFlowEventName };

export function getEventCatalog(): EventCatalogEntry[] {
  return EVENT_NAMES.map((name) => EVENT_CATALOG[name]);
}

export function getEvent(eventName: string): EventCatalogEntry | undefined {
  return EVENT_CATALOG[eventName];
}

export function isCanonicalEvent(eventName: string): eventName is EvoFlowEventName {
  return (EVENT_NAMES as readonly string[]).includes(eventName);
}

export function getEventsByCategory(category: EventCategory): EventCatalogEntry[] {
  return getEventCatalog().filter((entry) => entry.category === category);
}

export function getEventsByDtoType(dtoType: EventDtoType): EventCatalogEntry[] {
  return getEventCatalog().filter((entry) => entry.dtoType === dtoType);
}

// M3 fix: only pt-BR/pt receive Portuguese labels; everything else falls back
// to English. Without this, es/fr/it users see Portuguese labels in an
// otherwise fully-translated UI.
export function getEventLabel(eventName: string, locale: Locale | string): string {
  const entry = getEvent(eventName);
  if (!entry) return eventName;
  return locale.toString().toLowerCase().startsWith('pt') ? entry.labelPt : entry.labelEn;
}

export function isCustomEvent(eventName: string): boolean {
  return eventName === 'custom';
}

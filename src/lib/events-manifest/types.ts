export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'object';

export interface FieldSpec {
  type: FieldType;
  description?: string;
  // Closed set of values the producer emits (rendered as a select). Frontend
  // extension over the evo-flow mirror; absent means free text.
  options?: readonly string[];
}

export interface EventSchema {
  required: Record<string, FieldSpec>;
  optional: Record<string, FieldSpec>;
}

export type EventCategory = 'contact' | 'conversation' | 'message' | 'campaign' | 'purchase' | 'custom';

export type EventDtoType = 'track' | 'identify';

export type Locale = 'pt-BR' | 'en' | 'es' | 'fr' | 'it' | 'pt';

export interface EventCatalogEntry {
  eventName: string;
  category: EventCategory;
  // Which evo-flow DTO this event lands on. contact.* travel through
  // /events/identify (ContactEventsListener#IDENTIFY_PATH); every other
  // canonical event uses /events/track. Used by `<EventSelector>` to filter
  // by event surface ("only track events" vs "only identify events").
  dtoType: EventDtoType;
  labelPt: string;
  labelEn: string;
  description: string;
  schema: EventSchema;
}

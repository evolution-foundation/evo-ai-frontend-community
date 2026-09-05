import type { EventCatalogEntry, FieldSpec } from '@/lib/events-manifest';

// A catalog `required` key means "the producer always sends it", never "the
// user must fill it": every schema key is an optional equality FILTER on the
// trigger (evo-flow EventTrigger.matchesEventProperties). Identity keys are
// ids of the very record the event announces, unknowable before it happens,
// so they are not offered as filters. Persisted rows on those keys (legacy
// journeys) stay visible so they can be removed.
export const IDENTITY_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'contact_id',
  'conversation_id',
  'message_id',
  'purchase_id',
  'pipeline_item_id',
]);

// Keys that never make sense as an equality filter: producer bookkeeping
// (source), raw payload dumps, display names that duplicate an id with a
// select, and an id the CRM emits as a free string.
export const INTERNAL_FIELDS: ReadonlySet<string> = new Set([
  'source',
  'custom_fields',
  'changes',
  'inbox_name',
  'labelName',
  'pipeline_name',
  'pipeline_stage_name',
  'resolved_by_id',
]);

// Equality on a timestamp never matches and an object has no input.
export const UNFILTERABLE_TYPES: ReadonlySet<FieldSpec['type']> = new Set(['date', 'object']);

export type LookupKind =
  | 'pipeline'
  | 'pipeline_stage'
  | 'inbox'
  | 'label'
  | 'agent'
  | 'campaign'
  | 'template';

// Keys whose value is a CRM record id: rendered as a select fed by the CRM
// list, since nobody types a UUID. `product` stays free text on purpose — on
// purchase.approved it is the platform's product string, not a CRM product.
export const LOOKUP_FIELDS: Readonly<Record<string, LookupKind>> = {
  pipeline_id: 'pipeline',
  pipeline_stage_id: 'pipeline_stage',
  inbox_id: 'inbox',
  labelId: 'label',
  assigned_by_id: 'agent',
  campaign_id: 'campaign',
  template_id: 'template',
};

export function schemaFields(entry: EventCatalogEntry): Record<string, FieldSpec> {
  return { ...entry.schema.required, ...entry.schema.optional };
}

export function filterableFields(entry: EventCatalogEntry): Record<string, FieldSpec> {
  return Object.fromEntries(
    Object.entries(schemaFields(entry)).filter(
      ([key, spec]) =>
        !IDENTITY_FIELDS.has(key) && !INTERNAL_FIELDS.has(key) && !UNFILTERABLE_TYPES.has(spec.type),
    ),
  );
}

// i18n keys cannot carry ':' or '.', so an option value is slugged for lookup
// (Channel::Whatsapp -> Channel__Whatsapp) and falls back to the raw value.
export function optionLabelKey(field: string, value: string): string {
  return `fields.${field}.options.${value.replace(/[^A-Za-z0-9_]/g, '_')}`;
}

// An id and the type of the same object are one filter, not two: the inbox
// list is narrowed by the chosen channel type, and once an inbox is chosen the
// type is implied (dropped from the picker). A legacy pair that contradicts
// itself is flagged inline so it can be removed.
export const PAIRED_TYPE_FIELDS: Readonly<Record<string, string>> = {
  inbox_id: 'channel_type',
};

import type { AutomationFilterOperator, AutomationEventType } from '@/types/automation';
import { conditionTypeRegistry, type ConditionDataType } from './conditionTypeRegistry';

export type OptionLoaderKey =
  | 'pipelines'
  | 'pipeline_stages'
  | 'agents'
  | 'teams'
  | 'inboxes'
  | 'labels'
  | 'priorities'
  | 'statuses'
  | 'message_types';

export type EventContext = 'conversation' | 'contact' | 'pipeline' | 'message';

export interface ConditionAttributeDescriptor {
  attributeKey: string;
  dataType: ConditionDataType;
  operators: AutomationFilterOperator[];
  optionLoaderKey?: OptionLoaderKey;
  validFor: EventContext[];
  i18nKey: string;
}

const fromType = (
  dataType: ConditionDataType,
  override?: AutomationFilterOperator[],
): AutomationFilterOperator[] => override ?? conditionTypeRegistry[dataType].defaultOperators;

export const conditionAttributeRegistry: Record<string, ConditionAttributeDescriptor> = {
  status: {
    attributeKey: 'status',
    dataType: 'text',
    operators: fromType('text', ['equal_to', 'not_equal_to', 'attribute_changed']),
    optionLoaderKey: 'statuses',
    validFor: ['conversation', 'pipeline'],
    i18nKey: 'form.fields.attributes.status',
  },
  assignee_id: {
    attributeKey: 'assignee_id',
    dataType: 'text',
    operators: fromType('text', ['equal_to', 'not_equal_to', 'is_present', 'is_not_present', 'attribute_changed']),
    optionLoaderKey: 'agents',
    validFor: ['conversation', 'pipeline'],
    i18nKey: 'form.fields.attributes.assignee_id',
  },
  inbox_id: {
    attributeKey: 'inbox_id',
    dataType: 'text',
    operators: fromType('text', ['equal_to', 'not_equal_to', 'is_present', 'is_not_present']),
    optionLoaderKey: 'inboxes',
    validFor: ['conversation', 'pipeline', 'message'],
    i18nKey: 'form.fields.attributes.inbox_id',
  },
  team_id: {
    attributeKey: 'team_id',
    dataType: 'number',
    operators: fromType('number', ['equal_to', 'not_equal_to', 'is_present', 'is_not_present', 'attribute_changed']),
    optionLoaderKey: 'teams',
    validFor: ['conversation', 'pipeline'],
    i18nKey: 'form.fields.attributes.team_id',
  },
  priority: {
    attributeKey: 'priority',
    dataType: 'text',
    operators: fromType('text', ['equal_to', 'not_equal_to', 'attribute_changed']),
    optionLoaderKey: 'priorities',
    validFor: ['conversation', 'pipeline'],
    i18nKey: 'form.fields.attributes.priority',
  },
  labels: {
    attributeKey: 'labels',
    dataType: 'labels',
    operators: [...fromType('labels'), 'attribute_changed'],
    optionLoaderKey: 'labels',
    validFor: ['conversation', 'contact', 'pipeline'],
    i18nKey: 'form.fields.attributes.labels',
  },
  country_code: {
    attributeKey: 'country_code',
    dataType: 'text',
    operators: fromType('text', ['equal_to', 'not_equal_to']),
    validFor: ['conversation', 'contact', 'pipeline'],
    i18nKey: 'form.fields.attributes.country_code',
  },
  referer: {
    attributeKey: 'referer',
    dataType: 'link',
    operators: fromType('link'),
    validFor: ['conversation', 'pipeline'],
    i18nKey: 'form.fields.attributes.referer',
  },
  mail_subject: {
    attributeKey: 'mail_subject',
    dataType: 'text',
    operators: fromType('text'),
    validFor: ['conversation', 'pipeline'],
    i18nKey: 'form.fields.attributes.mail_subject',
  },
  content: {
    attributeKey: 'content',
    dataType: 'text',
    operators: fromType('text'),
    validFor: ['message'],
    i18nKey: 'form.fields.attributes.content',
  },
  message_type: {
    attributeKey: 'message_type',
    dataType: 'numeric',
    operators: fromType('numeric'),
    optionLoaderKey: 'message_types',
    validFor: ['message'],
    i18nKey: 'form.fields.attributes.message_type',
  },
  name: {
    attributeKey: 'name',
    dataType: 'text_case_insensitive',
    operators: fromType('text_case_insensitive'),
    validFor: ['contact'],
    i18nKey: 'form.fields.attributes.name',
  },
  email: {
    attributeKey: 'email',
    dataType: 'text_case_insensitive',
    operators: fromType('text_case_insensitive'),
    validFor: ['contact'],
    i18nKey: 'form.fields.attributes.email',
  },
  phone_number: {
    attributeKey: 'phone_number',
    dataType: 'text_case_insensitive',
    operators: [...fromType('text_case_insensitive'), 'starts_with'],
    validFor: ['contact'],
    i18nKey: 'form.fields.attributes.phone_number',
  },
  identifier: {
    attributeKey: 'identifier',
    dataType: 'text_case_insensitive',
    operators: fromType('text_case_insensitive', ['equal_to', 'not_equal_to']),
    validFor: ['contact'],
    i18nKey: 'form.fields.attributes.identifier',
  },
  city: {
    attributeKey: 'city',
    dataType: 'text_case_insensitive',
    operators: fromType('text_case_insensitive'),
    validFor: ['contact'],
    i18nKey: 'form.fields.attributes.city',
  },
  company: {
    attributeKey: 'company',
    dataType: 'text_case_insensitive',
    operators: fromType('text_case_insensitive'),
    validFor: ['contact'],
    i18nKey: 'form.fields.attributes.company',
  },
  blocked: {
    attributeKey: 'blocked',
    dataType: 'boolean',
    operators: [...fromType('boolean'), 'attribute_changed'],
    validFor: ['contact'],
    i18nKey: 'form.fields.attributes.blocked',
  },
  pipeline_id: {
    attributeKey: 'pipeline_id',
    dataType: 'pipeline',
    operators: fromType('pipeline'),
    optionLoaderKey: 'pipelines',
    validFor: ['conversation', 'pipeline'],
    i18nKey: 'form.fields.attributes.pipeline_id',
  },
  pipeline_stage_id: {
    attributeKey: 'pipeline_stage_id',
    dataType: 'pipeline',
    operators: [...fromType('pipeline'), 'attribute_changed'],
    optionLoaderKey: 'pipeline_stages',
    validFor: ['conversation', 'pipeline'],
    i18nKey: 'form.fields.attributes.pipeline_stage_id',
  },
};

// Events that represent a record being created or first-opened. The
// attribute_changed operator requires a previous value, so it is filtered
// out for these events at the UI layer.
const eventsWithoutPreviousValue: ReadonlySet<AutomationEventType> = new Set([
  'conversation_created',
  'conversation_opened',
  'message_created',
  'contact_created',
]);

const eventContextMap: Record<AutomationEventType, EventContext[]> = {
  conversation_created: ['conversation', 'message'],
  conversation_updated: ['conversation', 'message'],
  conversation_opened: ['conversation', 'message'],
  message_created: ['conversation', 'message'],
  pipeline_stage_updated: ['pipeline', 'conversation'],
  contact_created: ['contact'],
  contact_updated: ['contact'],
  conversation_resolved: ['conversation', 'message'],
  conversation_status_changed: ['conversation', 'message'],
};

export function getAttributesForEvent(eventName: AutomationEventType): ConditionAttributeDescriptor[] {
  const allowedContexts = eventContextMap[eventName] ?? [];
  return Object.values(conditionAttributeRegistry).filter((descriptor) =>
    descriptor.validFor.some((context) => allowedContexts.includes(context)),
  );
}

export function getAttributeDescriptor(attributeKey: string): ConditionAttributeDescriptor | undefined {
  return conditionAttributeRegistry[attributeKey];
}

export function getOperatorsForAttributeInEvent(
  attributeKey: string,
  eventName: AutomationEventType | undefined,
): AutomationFilterOperator[] {
  const descriptor = conditionAttributeRegistry[attributeKey];
  if (!descriptor) return [];
  if (eventName && eventsWithoutPreviousValue.has(eventName)) {
    return descriptor.operators.filter((op) => op !== 'attribute_changed');
  }
  return descriptor.operators;
}

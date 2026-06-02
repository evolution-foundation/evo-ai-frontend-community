import { EVENT_NAMES } from './event-names';
import type { EventCatalogEntry, EventCategory, FieldSpec } from './types';

const f = (type: FieldSpec['type'], description?: string): FieldSpec => ({ type, description });

const contactIdentityOptionalFields: Record<string, FieldSpec> = {
  name: f('string'),
  email: f('string'),
  phone_number: f('string'),
  identifier: f('string'),
  middle_name: f('string'),
  last_name: f('string'),
  location: f('string'),
  country_code: f('string'),
  contact_type: f('string'),
  blocked: f('boolean'),
  created_at: f('date'),
  updated_at: f('date'),
  customAttributes: f('object'),
  additionalAttributes: f('object'),
  created_via: f('string'),
};

const messageCommonRequired: Record<string, FieldSpec> = {
  message_id: f('uuid', 'Message UUID'),
  channel_type: f('string', 'Channel identifier (e.g., Channel::Whatsapp)'),
  conversation_id: f('uuid'),
  source: f('string'),
};

const messageCommonOptional: Record<string, FieldSpec> = {
  message_type: f('string', 'incoming | outgoing'),
  content_type: f('string'),
  content: f('string', 'Truncated to 2000 chars; absent when EVO_FLOW_MESSAGE_CONTENT_DISABLED=true'),
};

const ENTRIES: EventCatalogEntry[] = [
  {
    eventName: 'contact.created',
    category: 'contact',
    dtoType: 'identify',
    labelPt: 'Contato criado',
    labelEn: 'Contact created',
    description: 'A new contact was created in the CRM.',
    schema: { required: { id: f('uuid'), source: f('string') }, optional: contactIdentityOptionalFields },
  },
  {
    eventName: 'contact.updated',
    category: 'contact',
    dtoType: 'identify',
    labelPt: 'Contato atualizado',
    labelEn: 'Contact updated',
    description: 'An existing contact had one or more fields modified.',
    schema: {
      required: { id: f('uuid'), source: f('string') },
      optional: { ...contactIdentityOptionalFields, changes: f('object') },
    },
  },
  {
    eventName: 'contact.deleted',
    category: 'contact',
    dtoType: 'identify',
    labelPt: 'Contato deletado',
    labelEn: 'Contact deleted',
    description: 'A contact record was deleted.',
    schema: {
      required: { source: f('string'), deleted_at: f('date') },
      optional: { reason: f('string') },
    },
  },
  {
    eventName: 'contact.label.added',
    category: 'contact',
    dtoType: 'identify',
    labelPt: 'Etiqueta adicionada ao contato',
    labelEn: 'Label added to contact',
    description: 'A label was applied to a contact.',
    schema: {
      required: { labelName: f('string'), labelId: f('string'), source: f('string') },
      optional: {},
    },
  },
  {
    eventName: 'contact.label.removed',
    category: 'contact',
    dtoType: 'identify',
    labelPt: 'Etiqueta removida do contato',
    labelEn: 'Label removed from contact',
    description: 'A label was removed from a contact.',
    schema: {
      required: { labelName: f('string'), labelId: f('string'), source: f('string') },
      optional: {},
    },
  },
  {
    eventName: 'contact.custom_attribute.changed',
    category: 'contact',
    dtoType: 'identify',
    labelPt: 'Atributo customizado alterado',
    labelEn: 'Custom attribute changed',
    description: 'A custom attribute on a contact was set or changed.',
    schema: {
      required: { attributeName: f('string'), source: f('string') },
      optional: { attributeValue: f('string'), changeType: f('string'), oldValue: f('string') },
    },
  },
  {
    eventName: 'conversation.created',
    category: 'conversation',
    dtoType: 'track',
    labelPt: 'Conversa criada',
    labelEn: 'Conversation created',
    description: 'A new conversation was opened with a contact.',
    schema: {
      required: { conversation_id: f('uuid'), inbox_id: f('uuid'), source: f('string') },
      optional: { inbox_name: f('string'), channel_type: f('string') },
    },
  },
  {
    eventName: 'conversation.resolved',
    category: 'conversation',
    dtoType: 'track',
    labelPt: 'Conversa resolvida',
    labelEn: 'Conversation resolved',
    description: 'An open conversation was closed/resolved.',
    schema: {
      required: { conversation_id: f('uuid'), inbox_id: f('uuid'), source: f('string') },
      optional: {
        inbox_name: f('string'),
        channel_type: f('string'),
        resolved_by_id: f('string'),
        resolved_by_type: f('string'),
        resolution_time_seconds: f('number'),
      },
    },
  },
  {
    eventName: 'conversation.activity',
    category: 'conversation',
    dtoType: 'track',
    labelPt: 'Atividade na conversa',
    labelEn: 'Conversation activity',
    description: 'An activity (note, status change, etc.) occurred on a conversation.',
    schema: {
      required: { conversation_id: f('uuid'), source: f('string') },
      optional: { inbox_id: f('uuid'), content: f('string'), activity_type: f('string') },
    },
  },
  {
    eventName: 'conversation.first_reply',
    category: 'conversation',
    dtoType: 'track',
    labelPt: 'Primeira resposta da conversa',
    labelEn: 'Conversation first reply',
    description: 'The first agent reply was sent on a conversation.',
    schema: {
      required: { conversation_id: f('uuid'), source: f('string') },
      optional: { inbox_id: f('uuid'), replied_at: f('date'), response_time_seconds: f('number') },
    },
  },
  {
    eventName: 'conversation.reply_time',
    category: 'conversation',
    dtoType: 'track',
    labelPt: 'Tempo de resposta da conversa',
    labelEn: 'Conversation reply time',
    description: 'A reply-time measurement was recorded for a conversation.',
    schema: {
      required: { conversation_id: f('uuid'), source: f('string') },
      optional: { inbox_id: f('uuid'), reply_time_seconds: f('number'), measured_at: f('date') },
    },
  },
  {
    eventName: 'conversation.bot_handoff',
    category: 'conversation',
    dtoType: 'track',
    labelPt: 'Conversa transferida do bot',
    labelEn: 'Conversation bot handoff',
    description: 'A conversation was handed off from the bot to a human agent.',
    schema: {
      required: { conversation_id: f('uuid'), source: f('string') },
      optional: { inbox_id: f('uuid'), handoff_at: f('date'), reason: f('string') },
    },
  },
  {
    eventName: 'conversation.bot_resolved',
    category: 'conversation',
    dtoType: 'track',
    labelPt: 'Conversa resolvida pelo bot',
    labelEn: 'Conversation bot resolved',
    description: 'A conversation was resolved by the bot without human handoff.',
    schema: {
      required: { conversation_id: f('uuid'), source: f('string') },
      optional: { inbox_id: f('uuid'), resolved_at: f('date') },
    },
  },
  {
    eventName: 'message.created',
    category: 'message',
    dtoType: 'track',
    labelPt: 'Mensagem criada',
    labelEn: 'Message created',
    description: 'A new incoming or outgoing message was recorded.',
    schema: {
      required: { ...messageCommonRequired, message_type: f('string') },
      optional: { content_type: f('string'), content: f('string') },
    },
  },
  {
    eventName: 'message.delivered',
    category: 'message',
    dtoType: 'track',
    labelPt: 'Mensagem entregue',
    labelEn: 'Message delivered',
    description: 'A message reached the recipient device.',
    schema: {
      required: messageCommonRequired,
      optional: { ...messageCommonOptional, previous_status: f('string'), status: f('string'), external_error: f('string') },
    },
  },
  {
    eventName: 'message.read',
    category: 'message',
    dtoType: 'track',
    labelPt: 'Mensagem lida',
    labelEn: 'Message read',
    description: 'A message was read by the recipient.',
    schema: {
      required: messageCommonRequired,
      optional: { ...messageCommonOptional, previous_status: f('string'), status: f('string'), external_error: f('string') },
    },
  },
  {
    eventName: 'message.failed',
    category: 'message',
    dtoType: 'track',
    labelPt: 'Mensagem falhou',
    labelEn: 'Message failed',
    description: 'A message delivery attempt failed.',
    schema: {
      required: messageCommonRequired,
      optional: { ...messageCommonOptional, previous_status: f('string'), status: f('string'), external_error: f('string') },
    },
  },
  {
    eventName: 'campaign.triggered',
    category: 'campaign',
    dtoType: 'track',
    labelPt: 'Campanha disparada',
    labelEn: 'Campaign triggered',
    description: 'A pipeline-driven campaign entered execution for a contact.',
    schema: {
      required: { pipeline_item_id: f('uuid'), pipeline_id: f('uuid'), source: f('string') },
      optional: {
        conversation_id: f('uuid'),
        contact_id: f('uuid'),
        is_lead: f('boolean'),
        pipeline_name: f('string'),
        pipeline_stage_id: f('uuid'),
        pipeline_stage_name: f('string'),
        assigned_by_id: f('uuid'),
        custom_fields: f('object'),
      },
    },
  },
  {
    eventName: 'campaign.message.sent',
    category: 'campaign',
    dtoType: 'track',
    labelPt: 'Mensagem da campanha enviada',
    labelEn: 'Campaign message sent',
    description: 'A campaign sent a message to a contact.',
    schema: {
      required: { campaign_id: f('uuid'), message_id: f('uuid'), source: f('string') },
      optional: { contact_id: f('uuid'), channel_type: f('string'), template_id: f('uuid') },
    },
  },
  {
    eventName: 'campaign.message.opened',
    category: 'campaign',
    dtoType: 'track',
    labelPt: 'Mensagem da campanha aberta',
    labelEn: 'Campaign message opened',
    description: 'A contact opened a campaign message.',
    schema: {
      required: { campaign_id: f('uuid'), message_id: f('uuid'), source: f('string') },
      optional: { contact_id: f('uuid'), opened_at: f('date') },
    },
  },
  {
    eventName: 'campaign.message.clicked',
    category: 'campaign',
    dtoType: 'track',
    labelPt: 'Link da campanha clicado',
    labelEn: 'Campaign link clicked',
    description: 'A contact clicked a link in a campaign message.',
    schema: {
      required: { campaign_id: f('uuid'), message_id: f('uuid'), source: f('string') },
      optional: { contact_id: f('uuid'), url: f('string'), clicked_at: f('date') },
    },
  },
  {
    eventName: 'custom',
    category: 'custom',
    dtoType: 'track',
    labelPt: 'Evento personalizado',
    labelEn: 'Custom event',
    description: 'User-defined event with free-form key/value properties.',
    schema: { required: {}, optional: {} },
  },
];

export const EVENT_CATEGORIES: readonly EventCategory[] = [
  'contact',
  'conversation',
  'message',
  'campaign',
  'custom',
] as const;

export const EVENT_CATALOG: Record<string, EventCatalogEntry> = Object.freeze(
  ENTRIES.reduce<Record<string, EventCatalogEntry>>((acc, entry) => {
    acc[entry.eventName] = entry;
    return acc;
  }, {}),
);

const _missingNames = EVENT_NAMES.filter((n) => !EVENT_CATALOG[n]);
if (_missingNames.length > 0) {
  throw new Error(`Frontend event catalog missing entries: ${_missingNames.join(', ')}`);
}

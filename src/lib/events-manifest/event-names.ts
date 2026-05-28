export const EVENT_NAMES = [
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'contact.label.added',
  'contact.label.removed',
  'contact.custom_attribute.changed',
  'conversation.created',
  'conversation.resolved',
  'message.created',
  'message.delivered',
  'message.read',
  'message.failed',
  'campaign.triggered',
  'campaign.message.sent',
  'campaign.message.opened',
  'campaign.message.clicked',
  'custom',
] as const;

export type EvoFlowEventName = (typeof EVENT_NAMES)[number];

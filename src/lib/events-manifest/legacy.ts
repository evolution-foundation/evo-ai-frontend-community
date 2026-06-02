import { isCanonicalEvent } from './index';

/**
 * Maps legacy snake_case event names (used by older Journey/Campaign nodes
 * and the Automation Rules path) to the canonical dot.notation names from
 * the event manifest. Entries here are conservative — only names that have
 * an unambiguous canonical equivalent are mapped; everything else falls
 * through to the custom-event path so the user's original value is preserved.
 */
const SNAKE_CASE_TO_CANONICAL: Record<string, string> = {
  // contact.*
  contact_created: 'contact.created',
  contact_updated: 'contact.updated',
  contact_deleted: 'contact.deleted',
  contact_label_added: 'contact.label.added',
  contact_label_removed: 'contact.label.removed',
  contact_custom_attribute_changed: 'contact.custom_attribute.changed',
  // conversation.*
  conversation_created: 'conversation.created',
  conversation_resolved: 'conversation.resolved',
  conversation_activity: 'conversation.activity',
  conversation_first_reply: 'conversation.first_reply',
  conversation_reply_time: 'conversation.reply_time',
  conversation_bot_handoff: 'conversation.bot_handoff',
  conversation_bot_resolved: 'conversation.bot_resolved',
  // message.*
  message_created: 'message.created',
  message_delivered: 'message.delivered',
  message_read: 'message.read',
  message_failed: 'message.failed',
  // campaign.*
  campaign_triggered: 'campaign.triggered',
  campaign_message_sent: 'campaign.message.sent',
  campaign_message_opened: 'campaign.message.opened',
  campaign_message_clicked: 'campaign.message.clicked',
  // NOTE: Non-backend legacy names (conversation_updated, conversation_opened,
  // pipeline_*, segment_*, and behavioral events like button_clicked) are
  // intentionally NOT mapped. The manifest is a strict replica of the backend
  // SSOT (EvoFlow::EVENT_NAMES); unmapped names fall through to the custom path
  // so the user's original value is preserved rather than upgraded to a
  // canonical name that does not exist on the backend.
};

export interface ResolvedLegacyEventName {
  selectorValue: string;
  customName: string | null;
}

/**
 * Decides how a persisted `event_name` should be displayed in the EventSelector
 * + custom-input UI of the trigger config modal.
 *
 * - Canonical match → preselect that event, no custom input shown.
 * - Legacy snake_case with known canonical equivalent → preselect the
 *   canonical name (the user's value is upgraded on next Save).
 * - Anything else non-empty → mark as custom and surface the original value
 *   in the free-text input so the user can keep or edit it.
 * - Empty/undefined → unconfigured (empty selector, no custom input).
 */
export function resolveLegacyEventName(value: string | undefined | null): ResolvedLegacyEventName {
  if (!value) return { selectorValue: '', customName: null };
  if (value === 'custom') return { selectorValue: 'custom', customName: null };
  if (isCanonicalEvent(value)) return { selectorValue: value, customName: null };

  const mapped = SNAKE_CASE_TO_CANONICAL[value];
  if (mapped && isCanonicalEvent(mapped)) return { selectorValue: mapped, customName: null };

  return { selectorValue: 'custom', customName: value };
}

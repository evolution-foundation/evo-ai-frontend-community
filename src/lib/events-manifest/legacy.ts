import { isCanonicalEvent } from './index';

/**
 * Maps legacy snake_case event names (used by older Journey/Campaign nodes
 * and the Automation Rules path) to the canonical dot.notation names from
 * the event manifest. Entries here are conservative — only names that have
 * an unambiguous canonical equivalent are mapped; everything else falls
 * through to the custom-event path so the user's original value is preserved.
 */
const SNAKE_CASE_TO_CANONICAL: Record<string, string> = {
  contact_created: 'contact.created',
  contact_updated: 'contact.updated',
  conversation_created: 'conversation.created',
  message_created: 'message.created',
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

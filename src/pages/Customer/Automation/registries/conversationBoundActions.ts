import type { AutomationActionType, AutomationEventType } from '@/types/automation';

// Mirrors CONTACT_NATIVE_ACTIONS in the backend's
// AutomationRules::ContactActionService: the only actions that run when the rule
// fires with a contact and no conversation. Every other action is skipped there.
const CONTACT_NATIVE_ACTIONS: readonly AutomationActionType[] = [
  'send_webhook_event',
  'add_label',
  'remove_label',
  'update_custom_attribute',
];

// Events that can fire with or without a conversation: a pipeline card is created
// from a conversation (the common case) or straight from a contact.
const EVENTS_THAT_MAY_LACK_CONVERSATION: readonly AutomationEventType[] = ['pipeline_stage_updated'];

interface ActionLike {
  action_name?: string;
  action_params?: unknown;
}

// A model not chosen yet says nothing: the row is still being filled in.
function targetsConversationAttribute(params: unknown): boolean {
  const first = Array.isArray(params) ? params[0] : undefined;
  if (typeof first !== 'object' || first === null) return false;
  const model = (first as { custom_attribute_model?: unknown }).custom_attribute_model;
  return typeof model === 'string' && model !== '' && model !== 'contact_attribute';
}

function requiresConversation(action: ActionLike): boolean {
  const name = action.action_name as AutomationActionType | undefined;
  if (!name) return false;
  if (!CONTACT_NATIVE_ACTIONS.includes(name)) return true;
  return name === 'update_custom_attribute' && targetsConversationAttribute(action.action_params);
}

/** Action names of this rule that are skipped when the card has no conversation. */
export function actionsSkippedWithoutConversation(
  eventName: string | undefined,
  actions: readonly ActionLike[] | undefined,
): AutomationActionType[] {
  if (!eventName || !EVENTS_THAT_MAY_LACK_CONVERSATION.includes(eventName as AutomationEventType)) {
    return [];
  }
  const names = (actions ?? [])
    .filter(requiresConversation)
    .map((action) => action.action_name as AutomationActionType);
  return [...new Set(names)];
}

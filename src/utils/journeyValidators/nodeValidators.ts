// Per-node required-config validators (EVO-1744, decision D3).
//
// SCOPE (review finding F1): these are headless, data-only PRESENCE checks —
// they catch a node that was dragged in but never configured. They intentionally
// do NOT reproduce each panel's full `isValid` (e.g. balanced expressions,
// required template variables, fetched-option coherence) — that rich/async
// validation stays in the panels, which already gate their own modal save at
// edit time. The framework is a backstop for "never configured", runnable off
// persisted `flowData` in the journey list.

import type { ValidationIssue } from './types';

type NodeData = Record<string, unknown>;

const missing = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Emit a single requiredConfig error naming the missing field(s). */
function requiredConfig(fields: string[]): ValidationIssue[] {
  if (fields.length === 0) return [];
  return [
    {
      rule: 'requiredConfig',
      severity: 'error',
      messageKey: 'flowEditor.validation.requiredConfig',
      params: { fields: fields.join(', ') },
    },
  ];
}

/** Returns the subset of `fields` absent from `data`. */
function absent(data: NodeData, fields: string[]): string[] {
  return fields.filter((f) => missing(data[f]));
}

type Validator = (data: NodeData) => ValidationIssue[];

/**
 * Registry keyed by React Flow node `type`. A node type absent here has no
 * required config (e.g. terminal nodes, mute/resolve conversation) and is always
 * considered configured.
 */
export const nodeValidators: Record<string, Validator> = {
  'send-message-node': (d) => {
    // Either a template or a free-text/expression message. inboxId is required
    // UNLESS this is a conversation-scoped text send (useEventChannel:true),
    // where the inbox is inherited from the triggering conversation — mirroring
    // the panel's own gate (SendMessagePanel: text valid when
    // `useEventChannel || inboxId`). Template mode always needs an explicit
    // inbox (resolveTemplate reads it), so useEventChannel does not waive it.
    const isTemplate = d.messageMode === 'template';
    const conversationScoped = !isTemplate && !!d.useEventChannel;
    const fields = conversationScoped ? [] : absent(d, ['inboxId']);
    if (isTemplate ? missing(d.templateName) : missing(d.message)) {
      fields.push(isTemplate ? 'templateName' : 'message');
    }
    return requiredConfig(fields);
  },

  // The one node whose panel has no save gate today — the framework is its
  // PRIMARY required-config check (still data-only): at least one branch path.
  'conditional-node': (d) => {
    const paths = d.paths;
    if (!Array.isArray(paths) || paths.length === 0) {
      return requiredConfig(['paths']);
    }
    return [];
  },

  'send-webhook-node': (d) => requiredConfig(absent(d, ['webhookUrl'])),

  'scheduled-action-node': (d) =>
    requiredConfig(absent(d, ['actionType', 'delayDuration'])),

  'defer-conversation-node': (d) => {
    const fields = absent(d, ['snooze_type']);
    if (missing(d.snooze_duration) && missing(d.snooze_until)) {
      fields.push('snooze_until');
    }
    return requiredConfig(fields);
  },

  'add-label-node': (d) => requiredConfig(absent(d, ['labelId'])),
  'remove-label-node': (d) => requiredConfig(absent(d, ['labelId'])),

  'update-contact-node': (d) =>
    requiredConfig(absent(d, ['fieldToUpdate', 'newValue'])),

  // attributeName carries the attribute_key (slug) the executor actually reads
  // (evo-flow update-custom-attribute.node.ts) — validate it, not the UI-only
  // attributeId (EVO-1905).
  'update-custom-attribute-node': (d) =>
    requiredConfig(absent(d, ['attributeName', 'newValue'])),

  'set-variable-node': (d) =>
    requiredConfig(absent(d, ['variableName', 'operation'])),

  'assign-agent-node': (d) => requiredConfig(absent(d, ['agent_id'])),
  'assign-team-node': (d) => requiredConfig(absent(d, ['team_id'])),
  'assign-bot-node': (d) => requiredConfig(absent(d, ['bot_id', 'inbox_id'])),

  'assign-to-pipeline-node': (d) => requiredConfig(absent(d, ['pipeline_id'])),
  'move-to-pipeline-stage-node': (d) =>
    requiredConfig(absent(d, ['pipeline_id', 'stage_id'])),
  'create-pipeline-task-node': (d) => requiredConfig(absent(d, ['title'])),

  'send-canned-response-node': (d) =>
    requiredConfig(absent(d, ['canned_response_id'])),
  'send-email-team-node': (d) => {
    const fields = absent(d, ['message']);
    const teams = d.team_ids;
    if (!Array.isArray(teams) || teams.length === 0) fields.push('team_ids');
    return requiredConfig(fields);
  },
  'send-transcript-node': (d) => requiredConfig(absent(d, ['email'])),

  'change-priority-node': (d) => requiredConfig(absent(d, ['priority'])),

  'transfer-journey-node': (d) =>
    requiredConfig(absent(d, ['targetJourneyId'])),

  // No required config: 'mute-conversation-node', 'resolve-conversation-node',
  // 'wait-node', 'split-node', 'exit-journey-node', 'journey-trigger-node'
  // (the trigger has its own validity surface in JourneyTriggerPanel).
};

/** Run the registry validator for a node; nodes absent from the registry pass. */
export function validateNodeConfig(
  nodeType: string | undefined,
  data: NodeData | undefined,
): ValidationIssue[] {
  if (!nodeType) return [];
  const validator = nodeValidators[nodeType];
  if (!validator) return [];
  return validator(data ?? {});
}

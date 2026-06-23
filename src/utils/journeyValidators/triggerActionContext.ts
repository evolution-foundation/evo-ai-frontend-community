// Trigger↔action conversation-context coherence (EVO-1744, decision D2).
//
// Editor-side mirror of the runtime contract EVO-1741: an action whose runtime
// `requiredContext === 'conversation'` cannot run when the trigger provides no
// conversation (no conversationId → the node `contextSkip`s). We validate ONLY
// the conversation axis the runtime actually enforces; the `contact` axis is
// declared by the runtime but inert, so we don't validate it here.

import type { Node, Edge } from '@xyflow/react';
import { getEvent } from '@/lib/events-manifest';
import type { ValidationIssue } from './types';

const TRIGGER_NODE_TYPE = 'journey-trigger-node';

/**
 * FE node types whose runtime node declares `requiredContext: 'conversation'`
 * (evo-flow base.node.ts). FE type = runtime type + `-node`, EXCEPT runtime
 * `snooze-conversation` = FE `defer-conversation-node`. Excludes assign-bot
 * (no context) and send-webhook (no context).
 */
export const CONVERSATION_REQUIRING_NODES = new Set<string>([
  'send-message-node',
  'send-canned-response-node',
  'send-transcript-node',
  'send-email-team-node',
  'assign-agent-node',
  'assign-team-node',
  'assign-to-pipeline-node',
  'move-to-pipeline-stage-node',
  'create-pipeline-task-node',
  'mute-conversation-node',
  'change-priority-node',
  'resolve-conversation-node',
  'defer-conversation-node',
]);

function labelFor(node: Node): string {
  const data = (node.data ?? {}) as { label?: string; name?: string };
  return data.label || data.name || node.type || node.id;
}

/**
 * Does the trigger provide a conversation context? Reads `data.triggerType`
 * (the selector vocabulary — lowercase camelCase), NOT the PascalCase
 * `flowTriggers[].type`/`TriggerType` enum (review F8). For `event` triggers the
 * answer comes from the configured event's catalog category.
 */
export function triggerProvidesConversation(
  data: Record<string, unknown> | undefined,
): boolean {
  const triggerType = (data?.triggerType as string) ?? '';
  switch (triggerType) {
    case 'event': {
      const eventName = data?.eventName as string | undefined;
      const category = eventName ? getEvent(eventName)?.category : undefined;
      return category === 'conversation' || category === 'message';
    }
    case 'webhook':
      // Indeterminate: payload may carry conversation_id and the runtime
      // contextSkip is the real guard. Treat as provides=true to keep warnings
      // high-signal (documented design choice).
      return true;
    // manual, segment, contactCreated, contactUpdated, label, customAttribute,
    // pipelineStageChanged → contact/pipeline-level, no conversation.
    default:
      return false;
  }
}

/**
 * Warn for every conversation-requiring node reachable from a trigger that does
 * not provide conversation. Per-trigger semantics are intentional (review F4):
 * the runtime starts one session per trigger, so such a node WILL skip on the
 * non-providing trigger's runs even if another trigger also reaches it. Issues
 * are deduped per node.
 */
export function validateTriggerActionContext(
  nodes: Node[],
  edges: Edge[],
): ValidationIssue[] {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const triggers = nodes.filter((node) => node.type === TRIGGER_NODE_TYPE);
  const flagged = new Set<string>();
  const issues: ValidationIssue[] = [];

  for (const trigger of triggers) {
    if (triggerProvidesConversation(trigger.data as Record<string, unknown>)) {
      continue;
    }
    const visited = new Set<string>();
    const queue = [trigger.id];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = nodeById.get(id);
      if (
        node?.type &&
        CONVERSATION_REQUIRING_NODES.has(node.type) &&
        !flagged.has(node.id)
      ) {
        flagged.add(node.id);
        issues.push({
          nodeId: node.id,
          rule: 'triggerActionContext',
          severity: 'warning',
          messageKey: 'flowEditor.validation.triggerActionContext',
          params: { node: labelFor(node) },
        });
      }
      queue.push(...(outgoing.get(id) ?? []));
    }
  }

  return issues;
}

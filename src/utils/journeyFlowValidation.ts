import type { Node, Edge } from '@xyflow/react';
import type {
  JourneyValidationResult,
  ValidationIssue,
} from './journeyValidators/types';
import { validateNodeConfig } from './journeyValidators/nodeValidators';
import { validateTriggerActionContext } from './journeyValidators/triggerActionContext';

const TRIGGER_NODE_TYPE = 'journey-trigger-node';
const EXIT_NODE_TYPE = 'exit-journey-node';
const TRANSFER_NODE_TYPE = 'transfer-journey-node';

// Nodes that legitimately end a path: the runtime terminates the loop cleanly
// for both exit and transfer (transfer hands the contact to a target journey),
// so neither leaves the session dangling.
const TERMINAL_NODE_TYPES = new Set([EXIT_NODE_TYPE, TRANSFER_NODE_TYPE]);

export interface DanglingNode {
  id: string;
  label: string;
}

export interface JourneyTerminalValidation {
  isValid: boolean;
  danglingNodes: DanglingNode[];
}

function labelFor(node: Node): string {
  const data = (node.data ?? {}) as { label?: string; name?: string };
  return data.label || data.name || node.type || node.id;
}

/**
 * Walks the flow from each trigger node and reports terminal nodes (reachable,
 * with no outgoing edge) that are not a terminating node (`exit-journey-node`
 * or `transfer-journey-node`). Such nodes leave the journey "running" for up to
 * 30 days instead of completing (EVO-1691), so the editor warns about them on
 * save (EVO-1692). A lone trigger (no downstream) counts as dangling too.
 * Cyclic paths with no exit are not detected.
 */
export function validateJourneyTerminalPaths(
  nodes: Node[],
  edges: Edge[],
): JourneyTerminalValidation {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const danglingNodes: DanglingNode[] = [];
  const queue = nodes
    .filter((node) => node.type === TRIGGER_NODE_TYPE)
    .map((node) => node.id);

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = nodeById.get(id);
    if (!node) continue;

    const targets = outgoing.get(id) ?? [];
    if (targets.length === 0) {
      if (!node.type || !TERMINAL_NODE_TYPES.has(node.type)) {
        danglingNodes.push({ id: node.id, label: labelFor(node) });
      }
      continue;
    }
    queue.push(...targets);
  }

  return { isValid: danglingNodes.length === 0, danglingNodes };
}

/**
 * Terminal-path rule as `ValidationIssue[]` (EVO-1744, AC4: the EVO-1692 check
 * folded into the engine, not duplicated). Each dangling node → one warning.
 * NOTE: cyclic paths with no exit are still not detected (see EVO-1857).
 */
function terminalPathIssues(nodes: Node[], edges: Edge[]): ValidationIssue[] {
  return validateJourneyTerminalPaths(nodes, edges).danglingNodes.map(
    (dangling) => ({
      nodeId: dangling.id,
      rule: 'terminalPath',
      severity: 'warning',
      messageKey: 'flowEditor.validation.danglingExit',
      params: { node: dangling.label },
    }),
  );
}

/**
 * The pre-activation validation engine (EVO-1744). Pure: nodes/edges in → result
 * out, so it runs both inside the editor (live React Flow state) and from the
 * journey list/modal (persisted `flowData`). Runs every rule and aggregates.
 *
 * Hybrid enforcement (D1): required-config issues are `error` (block activation);
 * trigger↔action coherence and terminal-path are `warning` (allow, but surfaced).
 */
export function validateJourney(
  nodes: Node[],
  edges: Edge[],
): JourneyValidationResult {
  const issues: ValidationIssue[] = [];

  // (a) per-node required config — errors
  for (const node of nodes) {
    for (const issue of validateNodeConfig(
      node.type,
      node.data as Record<string, unknown> | undefined,
    )) {
      issues.push({
        ...issue,
        nodeId: issue.nodeId ?? node.id,
        params: { node: labelFor(node), ...issue.params },
      });
    }
  }

  // (b) trigger↔action conversation coherence — warnings
  issues.push(...validateTriggerActionContext(nodes, edges));

  // (c) terminal-path (EVO-1692, folded in) — warnings
  issues.push(...terminalPathIssues(nodes, edges));

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const byNodeId: Record<string, ValidationIssue[]> = {};
  for (const issue of issues) {
    if (!issue.nodeId) continue;
    (byNodeId[issue.nodeId] ??= []).push(issue);
  }

  return { errors, warnings, byNodeId, isActivatable: errors.length === 0 };
}

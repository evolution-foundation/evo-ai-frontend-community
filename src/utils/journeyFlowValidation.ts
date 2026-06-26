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
 * Cyclic paths with no exit are out of this check's reach (every cyclic node has
 * an outgoing edge) — they are caught separately by `unreachableExitIssues`
 * (EVO-1857).
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
 * Cyclic paths with no exit are handled by `unreachableExitIssues` (EVO-1857).
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
 * True when `start` lies on a cycle — i.e. it is reachable from itself by
 * following outgoing edges. Used to scope `unreachableExit` to genuine loops.
 */
function isOnCycle(start: string, outgoing: Map<string, string[]>): boolean {
  const stack = [...(outgoing.get(start) ?? [])];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (id === start) return true; // walked back to the origin → cycle
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of outgoing.get(id) ?? []) stack.push(next);
  }
  return false;
}

/**
 * Detects the blind spot `terminalPath` misses (EVO-1857, follow-up to EVO-1744
 * F5): nodes inside a **closed loop with no exit** (`trigger → A → B → A`).
 * `terminalPath` only flags nodes with *no outgoing edge*, so a node inside a
 * cycle (which always has one) escapes it, yet at runtime its session stays
 * "running" for ~30 days (EVO-1691).
 *
 * Algorithm: a reverse-reachability pass from the terminal nodes yields the set
 * that *can* reach a terminal; a forward pass from the triggers yields the set
 * that actually executes. A node warns only when it (1) executes, (2) cannot
 * reach a terminal, and (3) is genuinely on a cycle (`isOnCycle`).
 *
 * The cycle guard (EVO-1889) is what makes the "stuck in a loop" copy accurate:
 * a LINEAR dangling chain (`trigger → a → b`, `b` no exit) has its single root
 * cause — the dangling leaf `b` — already reported by `terminalPath`/`danglingExit`.
 * The intermediate `a` cannot reach a terminal either, but it is NOT in a loop,
 * so flagging it with the loop message mislabels the problem; the cycle guard
 * suppresses it. Two further exclusions avoid doubling up with `terminalPath`:
 * trigger nodes (the entry, not the offending step) and no-outgoing nodes
 * (already its `danglingExit` domain).
 */
function unreachableExitIssues(nodes: Node[], edges: Edge[]): ValidationIssue[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    const outs = outgoing.get(edge.source) ?? [];
    outs.push(edge.target);
    outgoing.set(edge.source, outs);
    const ins = incoming.get(edge.target) ?? [];
    ins.push(edge.source);
    incoming.set(edge.target, ins);
  }

  // Reverse-BFS from every terminal node → the set that can reach a terminal.
  const canReachTerminal = new Set<string>();
  const revQueue = nodes
    .filter((node) => node.type && TERMINAL_NODE_TYPES.has(node.type))
    .map((node) => node.id);
  while (revQueue.length > 0) {
    const id = revQueue.shift() as string;
    if (canReachTerminal.has(id)) continue;
    canReachTerminal.add(id);
    for (const src of incoming.get(id) ?? []) {
      if (!canReachTerminal.has(src)) revQueue.push(src);
    }
  }

  // Forward-BFS from every trigger → nodes that actually execute. Insertion order
  // is deterministic (BFS from triggers), so emitted warnings are stable.
  const reachable = new Set<string>();
  const fwdQueue = nodes
    .filter((node) => node.type === TRIGGER_NODE_TYPE)
    .map((node) => node.id);
  while (fwdQueue.length > 0) {
    const id = fwdQueue.shift() as string;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const tgt of outgoing.get(id) ?? []) {
      if (!reachable.has(tgt)) fwdQueue.push(tgt);
    }
  }

  const issues: ValidationIssue[] = [];
  for (const id of reachable) {
    if (canReachTerminal.has(id)) continue; // has a way out → fine
    const node = nodeById.get(id);
    if (!node) continue;
    if (node.type === TRIGGER_NODE_TYPE) continue; // entry, not the offending step
    if ((outgoing.get(id) ?? []).length === 0) continue; // danglingExit's domain
    if (!isOnCycle(id, outgoing)) continue; // linear dead-end → danglingExit covers it (EVO-1889)
    issues.push({
      nodeId: id,
      rule: 'unreachableExit',
      severity: 'warning',
      messageKey: 'flowEditor.validation.unreachableExit',
      params: { node: labelFor(node) },
    });
  }
  return issues;
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

  // (d) cycles with no reachable exit (EVO-1857, terminalPath's blind spot) — warnings
  issues.push(...unreachableExitIssues(nodes, edges));

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const byNodeId: Record<string, ValidationIssue[]> = {};
  for (const issue of issues) {
    if (!issue.nodeId) continue;
    (byNodeId[issue.nodeId] ??= []).push(issue);
  }

  return { errors, warnings, byNodeId, isActivatable: errors.length === 0 };
}

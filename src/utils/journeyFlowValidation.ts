import type { Node, Edge } from '@xyflow/react';

const TRIGGER_NODE_TYPE = 'journey-trigger-node';
const EXIT_NODE_TYPE = 'exit-journey-node';

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
 * with no outgoing edge) that are not an `exit-journey-node`. Such nodes leave
 * the journey "running" for up to 30 days instead of completing (EVO-1691), so
 * the editor warns about them on save (EVO-1692). A lone trigger (no downstream)
 * counts as dangling too. Cyclic paths with no exit are not detected.
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
      if (node.type !== EXIT_NODE_TYPE) {
        danglingNodes.push({ id: node.id, label: labelFor(node) });
      }
      continue;
    }
    queue.push(...targets);
  }

  return { isValid: danglingNodes.length === 0, danglingNodes };
}

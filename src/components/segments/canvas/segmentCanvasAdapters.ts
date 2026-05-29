import type { Edge, Node } from '@xyflow/react';
import type { SegmentNodeUnion } from '@/types/analytics/segments';
import { minimalSegmentNode } from './segmentCanvasMeta';

/**
 * Canvas <-> definition adapters. Bridges BaseFlowEditor's `(nodes, edges)`
 * model and the edge-less `{ entryNode(type, children), nodes[] }` shape.
 * Source of truth for node payloads is the page's `nodes` state; the canvas
 * owns structure (which nodes exist) + selection. Edges are visual-only here.
 */

export interface CanvasFlowData {
  nodes: Node[];
  edges: Edge[];
}

export type EntryType = 'And' | 'Or' | 'Everyone';

const isEveryone = (type?: string) => type === 'Everyone';

const NODE_X = 280;
const NODE_Y_START = 80;
const NODE_Y_GAP = 140;

/** Build the canvas from the current definition (used to seed / hydrate). */
export function flowFromDefinition(
  definitionType: EntryType,
  nodes: SegmentNodeUnion[],
): CanvasFlowData {
  if (isEveryone(definitionType)) {
    return {
      nodes: [
        {
          id: 'everyone',
          type: 'Everyone',
          position: { x: NODE_X, y: NODE_Y_START },
          data: { label: 'All contacts' },
        },
      ],
      edges: [],
    };
  }

  return {
    nodes: nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      position: { x: NODE_X, y: NODE_Y_START + index * NODE_Y_GAP },
      data: { label: node.type },
    })),
    edges: [],
  };
}

export interface ReconcileResult {
  definitionType: EntryType;
  nodes: SegmentNodeUnion[];
}

/**
 * Reconcile a canvas change back into `{ definitionType, nodes }`, PRESERVING
 * the payloads already authored in `prevNodes` (matched by id). New canvas ids
 * get a minimal node; removed ids are dropped. `Everyone` is entry-only: an
 * Everyone tile (or empty canvas) collapses to "all contacts"; when it coexists
 * with real conditions the Everyone tiles are ignored (never drop real work).
 */
export function reconcileCanvasToDefinition(
  flow: CanvasFlowData | undefined,
  prevNodes: SegmentNodeUnion[],
  prevType: EntryType,
): ReconcileResult {
  const rfNodes = flow?.nodes ?? [];
  const conditionNodes = rfNodes.filter((n) => !isEveryone(n.type));

  if (conditionNodes.length === 0) {
    return { definitionType: 'Everyone', nodes: [] };
  }

  const prevById = new Map(prevNodes.map((n) => [n.id, n]));
  const nodes = conditionNodes.map(
    (rf) => prevById.get(rf.id) ?? minimalSegmentNode(rf.id, String(rf.type)),
  );
  const definitionType: EntryType = prevType === 'Or' ? 'Or' : 'And';
  return { definitionType, nodes };
}

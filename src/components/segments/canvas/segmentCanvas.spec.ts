import { describe, expect, it } from 'vitest';
import { SEGMENT_NODE_META, minimalSegmentNode } from './segmentCanvasMeta';
import { flowFromDefinition, reconcileCanvasToDefinition } from './segmentCanvasAdapters';
import type { SegmentNodeUnion } from '@/types/analytics/segments';

describe('segment canvas palette', () => {
  it('exposes exactly the 8 expected node types (AC6)', () => {
    expect(SEGMENT_NODE_META).toHaveLength(8);
    expect(new Set(SEGMENT_NODE_META.map((m) => m.type))).toEqual(
      new Set(['Everyone', 'UserProperty', 'CustomAttribute', 'Label', 'Performed', 'RandomBucket', 'Email', 'WhatsApp']),
    );
  });
});

describe('segment canvas adapters', () => {
  const performed: SegmentNodeUnion = { id: 'n1', type: 'Performed', event: 'x' };
  const label: SegmentNodeUnion = { id: 'n2', type: 'Label', labelId: 'l', condition: 'has' };

  it('Everyone definition seeds a single Everyone tile', () => {
    const flow = flowFromDefinition('Everyone', []);
    expect(flow.nodes).toHaveLength(1);
    expect(flow.nodes[0].type).toBe('Everyone');
  });

  it('reconcile preserves payloads by id and keeps the combinator', () => {
    const flow = { nodes: [{ id: 'n1', type: 'Performed' }, { id: 'n2', type: 'Label' }] as never[], edges: [] };
    const result = reconcileCanvasToDefinition(flow, [performed, label], 'Or');
    expect(result.definitionType).toBe('Or');
    expect(result.nodes).toEqual([performed, label]); // same payloads, not minimal stubs
  });

  it('an Everyone tile alongside conditions does not drop the conditions', () => {
    const flow = {
      nodes: [{ id: 'everyone', type: 'Everyone' }, { id: 'n1', type: 'Performed' }] as never[],
      edges: [],
    };
    const result = reconcileCanvasToDefinition(flow, [performed], 'And');
    expect(result.definitionType).toBe('And');
    expect(result.nodes.map((n) => n.id)).toEqual(['n1']);
  });

  it('empty canvas collapses to Everyone', () => {
    const result = reconcileCanvasToDefinition({ nodes: [], edges: [] }, [performed], 'And');
    expect(result.definitionType).toBe('Everyone');
    expect(result.nodes).toEqual([]);
  });

  it('a new canvas id gets a minimal node of its type', () => {
    const flow = { nodes: [{ id: 'fresh', type: 'RandomBucket' }] as never[], edges: [] };
    const result = reconcileCanvasToDefinition(flow, [], 'And');
    expect(result.nodes[0]).toEqual(minimalSegmentNode('fresh', 'RandomBucket'));
  });
});

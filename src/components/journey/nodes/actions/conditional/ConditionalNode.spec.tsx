import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider, type Edge } from '@xyflow/react';
import { ConditionalNode, type ConditionalNodeData } from './ConditionalNode';
import '@/i18n/config';

// The node reads connected handles via useEdges(); mock it so we can feed the
// exact edges a saved (legacy) journey would hydrate into the editor.
const edgesMock = vi.hoisted(() => ({ current: [] as Edge[] }));

vi.mock('@xyflow/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    useEdges: () => edgesMock.current,
  };
});

function renderNode(data: ConditionalNodeData, edges: Edge[]) {
  edgesMock.current = edges;
  return render(
    <ReactFlowProvider>
      <ConditionalNode id="cond-1" selected={false} data={data} />
    </ReactFlowProvider>,
  );
}

const data: ConditionalNodeData = {
  label: 'Conditional',
  paths: [
    {
      id: 'p1',
      name: 'True branch',
      logicalOperator: 'AND',
      conditions: [{ id: 'c1', type: 'contact', field: 'contact.name', operator: 'equals', value: 'x' }],
    },
  ],
};

// EVO-1902: the Handle id stays `path-<id>` so it matches the sourceHandle that
// legacy journeys already saved. Routing is normalized at runtime by EVO-1922.
describe('ConditionalNode — handle connectivity (EVO-1902)', () => {
  it('renders the TRUE branch handle as connected for a legacy edge sourceHandle="path-<id>"', () => {
    const { container } = renderNode(data, [
      { id: 'e1', source: 'cond-1', target: 'next', sourceHandle: 'path-p1' } as Edge,
    ]);

    const handle = container.querySelector('[data-handleid="path-p1"]');
    expect(handle).not.toBeNull();
    // connected => green; disconnected => neutral-400 (gray).
    expect(handle!.className).toContain('!bg-green-500');
    expect(handle!.className).not.toContain('!bg-neutral-400');
  });

  it('renders the branch handle as disconnected (gray) when no edge matches', () => {
    const { container } = renderNode(data, []);

    const handle = container.querySelector('[data-handleid="path-p1"]');
    expect(handle).not.toBeNull();
    expect(handle!.className).toContain('!bg-neutral-400');
    expect(handle!.className).not.toContain('!bg-green-500');
  });

  it('does NOT mark the branch connected for a raw (un-prefixed) edge sourceHandle="<id>"', () => {
    // Guards against re-introducing the rejected change (Handle id = raw path.id):
    // legacy edges are `path-<id>`, so a raw-id handle would render them as gray.
    const { container } = renderNode(data, [
      { id: 'e1', source: 'cond-1', target: 'next', sourceHandle: 'p1' } as Edge,
    ]);

    const handle = container.querySelector('[data-handleid="path-p1"]');
    expect(handle).not.toBeNull();
    expect(handle!.className).toContain('!bg-neutral-400');
  });
});

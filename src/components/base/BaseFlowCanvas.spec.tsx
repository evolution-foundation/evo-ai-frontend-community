import { act, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }
});

const reactFlowMocks = vi.hoisted(() => ({
  capturedProps: { current: null as Record<string, unknown> | null },
}));

vi.mock('@xyflow/react', async importOriginal => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlow: vi.fn((props: Record<string, unknown>) => {
      reactFlowMocks.capturedProps.current = props;
      return (
        <div data-testid="react-flow-mock">
          {(props.children as React.ReactNode) ?? null}
        </div>
      );
    }),
    // jsdom has no real flow viewport; the drop handler only needs a position.
    useReactFlow: () => ({
      screenToFlowPosition: (p: { x: number; y: number }) => p,
    }),
  };
});

import { ReactFlowProvider } from '@xyflow/react';
import { BaseFlowCanvas } from './BaseFlowCanvas';
import { DnDProvider, useDnD } from '@/contexts/DnDContext';
import { DarkModeProvider } from '@/contexts/ThemeContext';

const NoopNode = () => <div />;

function renderCanvas(opts: {
  onFlowDataChange?: ReturnType<typeof vi.fn>;
  onFlowDataChangeExtended?: ReturnType<typeof vi.fn>;
  initialNodes?: Array<Record<string, unknown>>;
  initialEdges?: Array<Record<string, unknown>>;
}) {
  const initialNodes = opts.initialNodes ?? [
    { id: 'n1', type: 'noop', position: { x: 0, y: 0 }, data: {} },
    { id: 'n2', type: 'noop', position: { x: 200, y: 0 }, data: {} },
  ];
  const initialEdges = opts.initialEdges ?? [];

  return render(
    <DarkModeProvider>
      <DnDProvider>
        <ReactFlowProvider>
          <BaseFlowCanvas
            nodeTypes={{ noop: NoopNode }}
            initialNodes={initialNodes as never}
            initialEdges={initialEdges as never}
            onFlowDataChange={opts.onFlowDataChange}
            onFlowDataChangeExtended={opts.onFlowDataChangeExtended}
          />
        </ReactFlowProvider>
      </DnDProvider>
    </DarkModeProvider>,
  );
}

afterEach(() => {
  reactFlowMocks.capturedProps.current = null;
  vi.clearAllMocks();
});

// EVO-1573 review coverage map (each test fails on the pre-fix `develop`):
//  - AC1 happy path: handleConnect did not call onFlowDataChange at all → tests 1+2 fail
//  - AC1 parity: handleEdgesChange did not call onFlowDataChange → test 3 fails (delete dropped)
//  - AC3 no-regression: the workaround path (connect + node move) still
//    persists the edge — test 4 guards that handleNodesChange's closure
//    reads the updated edges array after setEdges flushed
//  - M1 (review): edge selection-only changes are volatile UI state and
//    must NOT mark the editor store as dirty — test 5 guards that
//    handleEdgesChange filters `select`-type changes before propagating
describe('BaseFlowCanvas — EVO-1573 edge propagation', () => {
  it('handleConnect propagates the new edge to onFlowDataChange (AC1)', () => {
    const onFlowDataChange = vi.fn();
    renderCanvas({ onFlowDataChange });

    const props = reactFlowMocks.capturedProps.current!;
    expect(props).toBeTruthy();

    act(() => {
      (props.onConnect as (c: Record<string, unknown>) => void)({
        source: 'n1',
        target: 'n2',
        sourceHandle: 'out',
        targetHandle: 'in',
      });
    });

    expect(onFlowDataChange).toHaveBeenCalled();
    const lastCall = onFlowDataChange.mock.lastCall as
      | [Array<{ id: string }>, Array<Record<string, unknown>>]
      | undefined;
    expect(lastCall).toBeTruthy();
    expect(lastCall![0].map(n => n.id)).toEqual(['n1', 'n2']);
    expect(lastCall![1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'n1',
          target: 'n2',
          sourceHandle: 'out',
          targetHandle: 'in',
        }),
      ]),
    );
  });

  it('handleConnect propagates the new edge via onFlowDataChangeExtended', () => {
    const onFlowDataChangeExtended = vi.fn();
    renderCanvas({ onFlowDataChangeExtended });

    const props = reactFlowMocks.capturedProps.current!;
    act(() => {
      (props.onConnect as (c: Record<string, unknown>) => void)({
        source: 'n1',
        target: 'n2',
      });
    });

    expect(onFlowDataChangeExtended).toHaveBeenCalled();
    const arg = onFlowDataChangeExtended.mock.lastCall?.[0] as {
      nodes: Array<{ id: string }>;
      edges: Array<Record<string, unknown>>;
      variables: unknown[];
    };
    expect(arg.nodes.map(n => n.id)).toEqual(['n1', 'n2']);
    expect(arg.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'n1', target: 'n2' }),
      ]),
    );
  });

  it('handleEdgesChange propagates deletes to onFlowDataChange (parity fix)', () => {
    const onFlowDataChange = vi.fn();
    renderCanvas({
      onFlowDataChange,
      initialEdges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n1' },
      ],
    });

    const props = reactFlowMocks.capturedProps.current!;
    onFlowDataChange.mockClear();

    act(() => {
      (props.onEdgesChange as (changes: Array<Record<string, unknown>>) => void)([
        { type: 'remove', id: 'e1' },
      ]);
    });

    expect(onFlowDataChange).toHaveBeenCalled();
    const lastCall = onFlowDataChange.mock.lastCall as
      | [unknown, Array<{ id: string }>]
      | undefined;
    expect(lastCall![1].map(e => e.id)).toEqual(['e2']);
  });

  it('preserves the new edge across a subsequent node movement (AC3 — workaround path no regression)', () => {
    const onFlowDataChange = vi.fn();
    renderCanvas({ onFlowDataChange });
    const connectProps = reactFlowMocks.capturedProps.current!;

    act(() => {
      (connectProps.onConnect as (c: Record<string, unknown>) => void)({
        source: 'n1',
        target: 'n2',
      });
    });

    onFlowDataChange.mockClear();
    const refreshedProps = reactFlowMocks.capturedProps.current!;

    act(() => {
      (refreshedProps.onNodesChange as (changes: Array<Record<string, unknown>>) => void)([
        { type: 'position', id: 'n1', position: { x: 50, y: 50 }, dragging: false },
      ]);
    });

    expect(onFlowDataChange).toHaveBeenCalled();
    const lastCall = onFlowDataChange.mock.lastCall as
      | [Array<{ id: string; position: { x: number; y: number } }>, Array<{ source: string; target: string }>]
      | undefined;
    const updatedNode = lastCall![0].find(n => n.id === 'n1');
    expect(updatedNode?.position).toEqual({ x: 50, y: 50 });
    expect(lastCall![1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'n1', target: 'n2' }),
      ]),
    );
  });

  it('does not propagate volatile select-only edge changes to onFlowDataChange (M1 review)', () => {
    const onFlowDataChange = vi.fn();
    renderCanvas({
      onFlowDataChange,
      initialEdges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    });
    const props = reactFlowMocks.capturedProps.current!;
    onFlowDataChange.mockClear();

    act(() => {
      (props.onEdgesChange as (changes: Array<Record<string, unknown>>) => void)([
        { type: 'select', id: 'e1', selected: true },
      ]);
    });

    expect(onFlowDataChange).not.toHaveBeenCalled();
  });
});

// EVO-1643: dropping an action node from the palette went through handleDrop's
// default branch, which added the node to canvas state via setNodes but never
// notified the editor store — so the save snapshot kept only the trigger and
// dropped every action node. These tests fail on pre-fix `develop`.
function DnDTypeSetter({ value }: { value: string }) {
  const { setType } = useDnD();
  useEffect(() => {
    setType(value);
  }, [value, setType]);
  return null;
}

function renderCanvasForDrop(opts: {
  onFlowDataChange?: ReturnType<typeof vi.fn>;
  onFlowDataChangeExtended?: ReturnType<typeof vi.fn>;
  dndType: string;
}) {
  return render(
    <DarkModeProvider>
      <DnDProvider>
        <ReactFlowProvider>
          <DnDTypeSetter value={opts.dndType} />
          <BaseFlowCanvas
            nodeTypes={{ noop: NoopNode }}
            initialNodes={
              [{ id: 'trigger-1', type: 'noop', position: { x: 0, y: 0 }, data: {} }] as never
            }
            initialEdges={[] as never}
            onFlowDataChange={opts.onFlowDataChange}
            onFlowDataChangeExtended={opts.onFlowDataChangeExtended}
          />
        </ReactFlowProvider>
      </DnDProvider>
    </DarkModeProvider>,
  );
}

describe('BaseFlowCanvas — EVO-1643 drop propagation', () => {
  it('propagates a dropped node to onFlowDataChange so the save snapshot keeps it', () => {
    const onFlowDataChange = vi.fn();
    renderCanvasForDrop({ onFlowDataChange, dndType: 'send-canned-response-node' });

    const props = reactFlowMocks.capturedProps.current!;
    expect(props).toBeTruthy();
    onFlowDataChange.mockClear();

    act(() => {
      (props.onDrop as (e: unknown) => void)({
        preventDefault: () => {},
        clientX: 120,
        clientY: 120,
      });
    });

    expect(onFlowDataChange).toHaveBeenCalled();
    const lastCall = onFlowDataChange.mock.lastCall as
      | [Array<{ id: string; type: string }>, unknown]
      | undefined;
    expect(lastCall).toBeTruthy();
    expect(lastCall![0].map(n => n.id)).toContain('trigger-1');
    expect(lastCall![0].some(n => n.type === 'send-canned-response-node')).toBe(true);
    expect(lastCall![0]).toHaveLength(2);
  });

  it('propagates a dropped node via onFlowDataChangeExtended', () => {
    const onFlowDataChangeExtended = vi.fn();
    renderCanvasForDrop({ onFlowDataChangeExtended, dndType: 'assign-to-pipeline-node' });

    const props = reactFlowMocks.capturedProps.current!;
    onFlowDataChangeExtended.mockClear();

    act(() => {
      (props.onDrop as (e: unknown) => void)({
        preventDefault: () => {},
        clientX: 80,
        clientY: 80,
      });
    });

    expect(onFlowDataChangeExtended).toHaveBeenCalled();
    const arg = onFlowDataChangeExtended.mock.lastCall?.[0] as {
      nodes: Array<{ type: string }>;
    };
    expect(arg.nodes.some(n => n.type === 'assign-to-pipeline-node')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import { validateJourneyTerminalPaths } from './journeyFlowValidation';

const node = (
  id: string,
  type: string,
  data: Record<string, unknown> = {},
): Node => ({ id, type, position: { x: 0, y: 0 }, data });

const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
});

describe('validateJourneyTerminalPaths', () => {
  it('is valid when every terminal path ends in an exit-journey-node', () => {
    const nodes = [
      node('t', 'journey-trigger-node'),
      node('a', 'send-message-node'),
      node('e', 'exit-journey-node'),
    ];
    const result = validateJourneyTerminalPaths(nodes, [
      edge('t', 'a'),
      edge('a', 'e'),
    ]);
    expect(result.isValid).toBe(true);
    expect(result.danglingNodes).toEqual([]);
  });

  it('flags a terminal action node with no exit', () => {
    const nodes = [
      node('t', 'journey-trigger-node'),
      node('a', 'send-message-node', { label: 'Send message' }),
    ];
    const result = validateJourneyTerminalPaths(nodes, [edge('t', 'a')]);
    expect(result.isValid).toBe(false);
    expect(result.danglingNodes).toEqual([{ id: 'a', label: 'Send message' }]);
  });

  it('flags only the dangling branch when another branch reaches an exit', () => {
    const nodes = [
      node('t', 'journey-trigger-node'),
      node('c', 'conditional-node'),
      node('a', 'send-message-node', { label: 'No exit' }),
      node('e', 'exit-journey-node'),
    ];
    const result = validateJourneyTerminalPaths(nodes, [
      edge('t', 'c'),
      edge('c', 'a'),
      edge('c', 'e'),
    ]);
    expect(result.isValid).toBe(false);
    expect(result.danglingNodes.map((n) => n.id)).toEqual(['a']);
  });

  it('flags a lone trigger with no downstream nodes', () => {
    const result = validateJourneyTerminalPaths(
      [node('t', 'journey-trigger-node')],
      [],
    );
    expect(result.isValid).toBe(false);
    expect(result.danglingNodes.map((n) => n.id)).toEqual(['t']);
  });

  it('ignores nodes not reachable from a trigger', () => {
    const nodes = [
      node('t', 'journey-trigger-node'),
      node('e', 'exit-journey-node'),
      node('orphan', 'send-message-node'),
    ];
    const result = validateJourneyTerminalPaths(nodes, [edge('t', 'e')]);
    expect(result.isValid).toBe(true);
  });
});

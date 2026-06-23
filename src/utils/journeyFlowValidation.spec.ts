import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import {
  validateJourneyTerminalPaths,
  validateJourney,
} from './journeyFlowValidation';

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

  it('treats a transfer-journey-node as a valid terminal path', () => {
    const nodes = [
      node('t', 'journey-trigger-node'),
      node('a', 'send-message-node'),
      node('x', 'transfer-journey-node'),
    ];
    const result = validateJourneyTerminalPaths(nodes, [
      edge('t', 'a'),
      edge('a', 'x'),
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

describe('validateJourney (EVO-1744)', () => {
  const sendMsg = (id: string, extra: Record<string, unknown> = {}) =>
    node(id, 'send-message-node', { label: 'Send', inboxId: 'i1', message: 'hi', ...extra });

  it('AC7: a fully-configured, coherent, terminating journey is activatable', () => {
    const nodes = [
      node('t', 'journey-trigger-node', {
        triggerType: 'event',
        eventName: 'conversation.created',
      }),
      sendMsg('a'),
      node('e', 'exit-journey-node'),
    ];
    const r = validateJourney(nodes, [edge('t', 'a'), edge('a', 'e')]);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.isActivatable).toBe(true);
  });

  it('AC1/AC5: a node missing required config is an error that blocks activation', () => {
    const nodes = [
      node('t', 'journey-trigger-node', {
        triggerType: 'event',
        eventName: 'conversation.created',
      }),
      node('a', 'send-message-node', { label: 'Send' }), // no inboxId/message
      node('e', 'exit-journey-node'),
    ];
    const r = validateJourney(nodes, [edge('t', 'a'), edge('a', 'e')]);
    expect(r.isActivatable).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].rule).toBe('requiredConfig');
    expect(r.errors[0].nodeId).toBe('a');
    expect(r.byNodeId['a']).toBeTruthy();
  });

  it('AC2: a contact-only trigger feeding a conversation action warns (not blocks)', () => {
    const nodes = [
      node('t', 'journey-trigger-node', { triggerType: 'customAttribute' }),
      sendMsg('a'),
      node('e', 'exit-journey-node'),
    ];
    const r = validateJourney(nodes, [edge('t', 'a'), edge('a', 'e')]);
    expect(r.errors).toEqual([]); // warning, not error
    expect(r.isActivatable).toBe(true);
    expect(r.warnings.some((w) => w.rule === 'triggerActionContext' && w.nodeId === 'a')).toBe(true);
  });

  it('AC2: an event trigger on a conversation-category event does NOT warn', () => {
    const nodes = [
      node('t', 'journey-trigger-node', {
        triggerType: 'event',
        eventName: 'conversation.created',
      }),
      sendMsg('a'),
      node('e', 'exit-journey-node'),
    ];
    const r = validateJourney(nodes, [edge('t', 'a'), edge('a', 'e')]);
    expect(r.warnings.some((w) => w.rule === 'triggerActionContext')).toBe(false);
  });

  it('AC4: a dangling path surfaces as a terminalPath warning from the engine', () => {
    const nodes = [
      node('t', 'journey-trigger-node', {
        triggerType: 'event',
        eventName: 'conversation.created',
      }),
      sendMsg('a'), // no exit downstream
    ];
    const r = validateJourney(nodes, [edge('t', 'a')]);
    expect(r.warnings.some((w) => w.rule === 'terminalPath' && w.nodeId === 'a')).toBe(true);
    expect(r.isActivatable).toBe(true); // warning, not error
  });
});

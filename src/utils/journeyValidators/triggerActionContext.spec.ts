import { describe, it, expect } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import {
  triggerProvidesConversation,
  validateTriggerActionContext,
  CONVERSATION_REQUIRING_NODES,
} from './triggerActionContext';

const node = (id: string, type: string, data: Record<string, unknown> = {}): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data,
});
const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
});

describe('triggerProvidesConversation (EVO-1744)', () => {
  it('event trigger on a conversation-category event provides conversation', () => {
    expect(
      triggerProvidesConversation({ triggerType: 'event', eventName: 'conversation.created' }),
    ).toBe(true);
  });
  it('event trigger on a contact-category event does NOT', () => {
    expect(
      triggerProvidesConversation({ triggerType: 'event', eventName: 'contact.created' }),
    ).toBe(false);
  });
  it('contact-level trigger types do NOT provide conversation', () => {
    for (const tt of ['manual', 'segment', 'contactCreated', 'label', 'customAttribute', 'pipelineStageChanged']) {
      expect(triggerProvidesConversation({ triggerType: tt })).toBe(false);
    }
  });
  it('webhook is treated as provides=true (indeterminate, no-warn)', () => {
    expect(triggerProvidesConversation({ triggerType: 'webhook' })).toBe(true);
  });
});

describe('validateTriggerActionContext (EVO-1744)', () => {
  it('warns each conversation-requiring node reachable from a non-providing trigger', () => {
    const nodes = [
      node('t', 'journey-trigger-node', { triggerType: 'label' }),
      node('a', 'send-message-node', { label: 'Send' }),
      node('b', 'add-label-node'), // not conversation-requiring
    ];
    const issues = validateTriggerActionContext(nodes, [edge('t', 'a'), edge('a', 'b')]);
    expect(issues).toHaveLength(1);
    expect(issues[0].nodeId).toBe('a');
    expect(issues[0].severity).toBe('warning');
  });

  it('does not warn when the trigger provides conversation', () => {
    const nodes = [
      node('t', 'journey-trigger-node', { triggerType: 'event', eventName: 'message.created' }),
      node('a', 'send-message-node'),
    ];
    expect(validateTriggerActionContext(nodes, [edge('t', 'a')])).toEqual([]);
  });

  it('the conversation set excludes assign-bot and send-webhook', () => {
    expect(CONVERSATION_REQUIRING_NODES.has('assign-bot-node')).toBe(false);
    expect(CONVERSATION_REQUIRING_NODES.has('send-webhook-node')).toBe(false);
    expect(CONVERSATION_REQUIRING_NODES.has('defer-conversation-node')).toBe(true);
    expect(CONVERSATION_REQUIRING_NODES.size).toBe(13);
  });
});

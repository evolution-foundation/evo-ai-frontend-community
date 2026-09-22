import { describe, it, expect } from 'vitest';
import { actionsSkippedWithoutConversation } from './conversationBoundActions';

const sendMessage = { action_name: 'send_message', action_params: ['hi'] };
const addLabel = { action_name: 'add_label', action_params: ['vip'] };

describe('actionsSkippedWithoutConversation', () => {
  it('lists the conversation-bound actions of a stage-entry rule', () => {
    expect(actionsSkippedWithoutConversation('pipeline_stage_updated', [addLabel, sendMessage])).toEqual([
      'send_message',
    ]);
  });

  it('lists nothing when every action runs on the contact', () => {
    const webhook = { action_name: 'send_webhook_event', action_params: ['https://example.com'] };
    const removeLabel = { action_name: 'remove_label', action_params: ['vip'] };
    expect(
      actionsSkippedWithoutConversation('pipeline_stage_updated', [addLabel, removeLabel, webhook]),
    ).toEqual([]);
  });

  it('lists nothing for an event that always carries a conversation', () => {
    expect(actionsSkippedWithoutConversation('conversation_created', [sendMessage])).toEqual([]);
    expect(actionsSkippedWithoutConversation('message_created', [sendMessage])).toEqual([]);
  });

  it('tells a contact attribute from a conversation attribute', () => {
    const onContact = {
      action_name: 'update_custom_attribute',
      action_params: [{ custom_attribute_key: 'cpf', custom_attribute_model: 'contact_attribute' }],
    };
    const onConversation = {
      action_name: 'update_custom_attribute',
      action_params: [{ custom_attribute_key: 'plan', custom_attribute_model: 'conversation_attribute' }],
    };
    expect(actionsSkippedWithoutConversation('pipeline_stage_updated', [onContact])).toEqual([]);
    expect(actionsSkippedWithoutConversation('pipeline_stage_updated', [onConversation])).toEqual([
      'update_custom_attribute',
    ]);
  });

  it('flags a pipeline-item attribute: the backend writes it through the conversation', () => {
    const onPipelineItem = {
      action_name: 'update_custom_attribute',
      action_params: [{ custom_attribute_key: 'deal', custom_attribute_model: 'pipeline_item_attribute' }],
    };
    expect(actionsSkippedWithoutConversation('pipeline_stage_updated', [onPipelineItem])).toEqual([
      'update_custom_attribute',
    ]);
  });

  it('does not flag an attribute action whose model is not chosen yet', () => {
    const blank = {
      action_name: 'update_custom_attribute',
      action_params: [{ custom_attribute_key: '', custom_attribute_model: '' }],
    };
    expect(actionsSkippedWithoutConversation('pipeline_stage_updated', [blank])).toEqual([]);
  });

  it('names each action once and tolerates missing input', () => {
    expect(actionsSkippedWithoutConversation('pipeline_stage_updated', [sendMessage, sendMessage])).toEqual([
      'send_message',
    ]);
    expect(actionsSkippedWithoutConversation(undefined, [sendMessage])).toEqual([]);
    expect(actionsSkippedWithoutConversation('pipeline_stage_updated', undefined)).toEqual([]);
  });
});

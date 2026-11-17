import { describe, expect, it } from 'vitest';
import { getDealCardPresentation } from './dealCardPresentation';
import type { PipelineItem } from '@/types/analytics';

const baseItem = {
  id: 'deal-1',
  item_id: 'contact-1',
  type: 'contact',
  pipeline_id: 'pipeline-1',
  stage_id: 'stage-1',
  is_lead: false,
  created_at: 1,
  updated_at: 1,
  tasks_info: {
    pending_count: 0,
    overdue_count: 0,
    due_soon_count: 0,
    completed_count: 0,
    total_count: 0,
  },
} satisfies PipelineItem;

describe('getDealCardPresentation', () => {
  it('prioritizes canonical deal, avatar, tags and latest-message fields', () => {
    const view = getDealCardPresentation({
      ...baseItem,
      title: 'Renovação anual',
      value: 12500,
      currency: 'BRL',
      contact_count: 3,
      labels: [{ id: 'label-1', name: 'VIP', color: '#ff00aa' }],
      primary_contact: {
        id: 'contact-1',
        name: 'Ana',
        thumbnail: '/ana.jpg',
        labels: [{ name: 'Contato', color: '#00aaff' }],
      },
      latest_message: {
        id: 'message-1',
        content: 'Podemos assinar amanhã',
        message_type: 'incoming',
        created_at: '2026-08-30T10:00:00Z',
        conversation_id: 'conversation-1',
      },
    });

    expect(view).toMatchObject({
      title: 'Renovação anual',
      secondary: 'Ana',
      avatarUrl: '/ana.jpg',
      additionalContacts: 2,
      value: 12500,
    });
    expect(view.labels[0].name).toBe('VIP');
    expect(view.message?.content).toBe('Podemos assinar amanhã');
  });

  it('keeps legacy message fields but does not borrow contact or conversation labels', () => {
    const view = getDealCardPresentation({
      ...baseItem,
      contact: { id: 'contact-1', name: 'Bruno' },
      conversation: {
        id: 'conversation-1',
        display_id: '42',
        status: 'open',
        last_activity_at: 1,
        contact: { id: 'contact-1', name: 'Bruno' },
        labels: [{ id: 1, title: 'Lead' }],
        last_non_activity_message: {
          id: 'message-1',
          content: 'Oi',
          message_type: 0,
          created_at: 1,
        },
      },
    });

    expect(view.title).toBe('Negócio - Bruno');
    expect(view.labels).toEqual([]);
    expect(view.message?.content).toBe('Oi');
  });
});

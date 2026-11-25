import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MessagesProvider, useMessages } from './MessagesContext';
import type { Message } from '@/types/chat/api';

vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

const full = [{ name: 'Ana Sintética', phones: ['+55 11 90000-0001'], organization: null }];
const masked = [{ name: 'Ana Sintética', phones: ['+*********0001'], organization: null }];
const message = (shared_contacts: unknown, extra = {}) =>
  ({ id: 'm1', conversation_id: 'c1', created_at: 1, content: 'Ana Sintética', content_attributes: { shared_contacts }, ...extra }) as unknown as Message;

const setup = (initial: Message) => {
  const wrapper = ({ children }: { children: ReactNode }) => <MessagesProvider>{children}</MessagesProvider>;
  const { result } = renderHook(() => useMessages(), { wrapper });
  act(() => result.current.setMessages('c1', [initial]));
  return result;
};

describe('MessagesContext shared contacts on message.updated', () => {
  it('keeps the full phones already loaded when the update comes masked', () => {
    const result = setup(message(full));
    act(() => result.current.updateMessage('c1', message(masked, { status: 'read' })));
    const [updated] = result.current.getMessages('c1');
    expect(updated.status).toBe('read');
    expect(updated.content_attributes.shared_contacts).toEqual(full);
  });

  it('accepts an update that is not masked', () => {
    const result = setup(message(masked));
    act(() => result.current.updateMessage('c1', message(full)));
    expect(result.current.getMessages('c1')[0].content_attributes.shared_contacts).toEqual(full);
  });
});

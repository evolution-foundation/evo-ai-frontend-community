import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

import MessageStatus from './MessageStatus';
import type { Message } from '@/types/chat/api';

const mockMessage = (overrides: Partial<Message> = {}): Message =>
  ({
    id: 'msg-1',
    created_at: new Date().toISOString(),
    private: false,
    status: 'failed',
    content_attributes: {},
    ...overrides,
  }) as unknown as Message;

// Regression: the "failed" badge used to always show a generic "Status
// indisponível" label, hiding the real provider error (e.g. "131026: Message
// undeliverable") that the backend already captures in
// content_attributes.external_error. Agents had no way to tell a bad phone
// number apart from a retry-worthy transient failure without asking engineering.
describe('MessageStatus — failed messages', () => {
  it('shows a plain-language explanation for a recognized error code, not the raw code', () => {
    render(
      <MessageStatus
        message={mockMessage({ content_attributes: { external_error: '131026: Message undeliverable' } })}
        isOwn={true}
      />,
    );

    expect(screen.getByText('O número não tem WhatsApp ativo ou não pôde ser alcançado.')).toBeInTheDocument();
    expect(screen.queryByText('131026: Message undeliverable')).not.toBeInTheDocument();
  });

  it('falls back to the raw error text when the error is not one we recognize', () => {
    render(
      <MessageStatus
        message={mockMessage({ content_attributes: { external_error: '999999: Some brand-new error' } })}
        isOwn={true}
      />,
    );

    expect(screen.getByText('999999: Some brand-new error')).toBeInTheDocument();
  });

  it('falls back to the generic retry label when no external_error was captured', () => {
    render(<MessageStatus message={mockMessage({ content_attributes: {} })} isOwn={true} />);

    expect(screen.getByText('messages.messageStatus.tryAgain')).toBeInTheDocument();
  });

  it('does not render a status badge for messages that are not own', () => {
    const { container } = render(
      <MessageStatus
        message={mockMessage({ content_attributes: { external_error: '131026: Message undeliverable' } })}
        isOwn={false}
      />,
    );

    expect(screen.queryByText('O número não tem WhatsApp ativo ou não pôde ser alcançado.')).not.toBeInTheDocument();
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });
});

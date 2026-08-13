import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'messages.messageContact.sharedContact': 'Contato compartilhado',
        'messages.messageContact.unknownPhone': 'Telefone não informado',
      };
      return map[key] ?? key;
    },
  }),
}));

import MessageContact from './MessageContact';

const mockAttachment = (overrides = {}) => ({
  id: '1',
  message_id: '1',
  file_type: 'contact' as const,
  fallback_title: '+5511999998888',
  meta: { display_name: 'Fernanda Martins' },
  ...overrides,
});

describe('MessageContact', () => {
  it('renders contact name and phone from a single attachment', () => {
    render(<MessageContact attachments={[mockAttachment()]} />);
    expect(screen.getByText('Fernanda Martins')).toBeTruthy();
    expect(screen.getByText('+5511999998888')).toBeTruthy();
  });

  it('renders one card per attachment for a vCard with multiple phones', () => {
    render(
      <MessageContact
        attachments={[
          mockAttachment({ id: '1', fallback_title: '+5511999998888' }),
          mockAttachment({ id: '2', fallback_title: '+5511888887777' }),
        ]}
      />,
    );
    expect(screen.getByText('+5511999998888')).toBeTruthy();
    expect(screen.getByText('+5511888887777')).toBeTruthy();
  });

  it('falls back to a generic label when display_name is missing', () => {
    render(<MessageContact attachments={[mockAttachment({ meta: {} })]} />);
    expect(screen.getByText('Contato compartilhado')).toBeTruthy();
    expect(screen.getByText('+5511999998888')).toBeTruthy();
  });

  it('falls back to a generic label when fallback_title is missing', () => {
    render(<MessageContact attachments={[mockAttachment({ fallback_title: '' })]} />);
    expect(screen.getByText('Fernanda Martins')).toBeTruthy();
    expect(screen.getByText('Telefone não informado')).toBeTruthy();
  });

  it('ignores attachments that are not file_type contact', () => {
    render(
      <MessageContact
        attachments={[mockAttachment({ id: '1' }), mockAttachment({ id: '2', file_type: 'image' })]}
      />,
    );
    expect(screen.getAllByText('Fernanda Martins')).toHaveLength(1);
  });
});

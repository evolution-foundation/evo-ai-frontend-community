import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MessageTemplate } from '@/types/channels/inbox';
import TemplatesPicker from './TemplatesPicker';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

const approved: MessageTemplate = {
  id: 'approved-1',
  name: 'ini_approved',
  content: 'Olá',
  language: 'pt_BR',
  category: 'UTILITY',
  status: 'APPROVED',
};

const approvedViaSettings: MessageTemplate = {
  id: 'approved-2',
  name: 'ini_settings',
  content: 'Olá',
  language: 'pt_BR',
  category: 'UTILITY',
  settings: { status: 'APPROVED' },
};

const pendingImplicit: MessageTemplate = {
  id: 'pending-1',
  name: 'ini_conversa',
  content: 'Olá',
  language: 'pt_BR',
  category: 'UTILITY',
  settings: {},
};

const pendingExplicit: MessageTemplate = {
  id: 'pending-2',
  name: 'ini_pending',
  content: 'Olá',
  language: 'pt_BR',
  category: 'UTILITY',
  status: 'PENDING',
};

const rejected: MessageTemplate = {
  id: 'rejected-1',
  name: 'ini_rejected',
  content: 'Olá',
  language: 'pt_BR',
  category: 'UTILITY',
  status: 'REJECTED',
};

const withImageHeader: MessageTemplate = {
  id: 'image-1',
  name: 'ini_media',
  content: 'Olá',
  language: 'pt_BR',
  category: 'MARKETING',
  status: 'APPROVED',
  components: { header: { type: 'HEADER', format: 'IMAGE' } },
};

describe('TemplatesPicker', () => {
  it('renders every template as clickable when isWhatsAppCloud=false regardless of status', () => {
    const onSelect = vi.fn();
    render(
      <TemplatesPicker
        isWhatsAppCloud={false}
        templates={[approved, pendingImplicit, rejected]}
        onSelect={onSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    buttons.forEach(b => expect(b).not.toBeDisabled());

    fireEvent.click(screen.getByText('ini_conversa'));
    expect(onSelect).toHaveBeenCalledWith(pendingImplicit);
  });

  it('renders approved template (top-level status) clickable when isWhatsAppCloud=true', () => {
    const onSelect = vi.fn();
    render(
      <TemplatesPicker isWhatsAppCloud templates={[approved]} onSelect={onSelect} />,
    );
    const btn = screen.getByRole('button', { name: /ini_approved/ });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(approved);
  });

  it('renders approved via settings.status fallback when isWhatsAppCloud=true', () => {
    const onSelect = vi.fn();
    render(
      <TemplatesPicker
        isWhatsAppCloud
        templates={[approvedViaSettings]}
        onSelect={onSelect}
      />,
    );
    const btn = screen.getByRole('button', { name: /ini_settings/ });
    expect(btn).not.toBeDisabled();
  });

  it('renders missing-status as visible + disabled + pending badge when isWhatsAppCloud=true', () => {
    const onSelect = vi.fn();
    render(
      <TemplatesPicker
        isWhatsAppCloud
        templates={[pendingImplicit]}
        onSelect={onSelect}
      />,
    );

    const btn = screen.getByRole('button', { name: /ini_conversa/ });
    expect(btn).toBeDisabled();
    expect(
      screen.getByText('messageTemplates.picker.status.pending'),
    ).toBeTruthy();

    fireEvent.click(btn);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders explicit PENDING status with pending badge and disabled', () => {
    render(
      <TemplatesPicker
        isWhatsAppCloud
        templates={[pendingExplicit]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /ini_pending/ })).toBeDisabled();
    expect(
      screen.getByText('messageTemplates.picker.status.pending'),
    ).toBeTruthy();
  });

  it('renders REJECTED with rejected badge and disabled', () => {
    render(
      <TemplatesPicker isWhatsAppCloud templates={[rejected]} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /ini_rejected/ })).toBeDisabled();
    expect(
      screen.getByText('messageTemplates.picker.status.rejected'),
    ).toBeTruthy();
  });

  it('excludes templates with unsupported header format (IMAGE/VIDEO/DOCUMENT) entirely', () => {
    render(
      <TemplatesPicker
        isWhatsAppCloud
        templates={[withImageHeader, approved]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByText('ini_media')).toBeNull();
    expect(screen.getByText('ini_approved')).toBeTruthy();
  });

  it('search filter narrows visible set by name over approved + pending', () => {
    render(
      <TemplatesPicker
        isWhatsAppCloud
        templates={[approved, pendingImplicit]}
        onSelect={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      'messageTemplates.picker.searchPlaceholder',
    );
    fireEvent.change(searchInput, { target: { value: 'conversa' } });

    expect(screen.getByText('ini_conversa')).toBeTruthy();
    expect(screen.queryByText('ini_approved')).toBeNull();
  });

  it('empty-state appears only when search yields zero results', () => {
    render(
      <TemplatesPicker
        isWhatsAppCloud
        templates={[approved]}
        onSelect={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      'messageTemplates.picker.searchPlaceholder',
    );
    fireEvent.change(searchInput, { target: { value: 'zzznothing' } });

    expect(
      screen.getByText(/messageTemplates\.picker\.noTemplatesFound/),
    ).toBeTruthy();
  });
});

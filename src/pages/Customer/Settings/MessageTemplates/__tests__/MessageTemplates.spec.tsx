import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({
  inboxes: [] as Array<{ id: string; name: string; channel_type: string; provider?: string }>,
  navigate: vi.fn(),
  globalService: {
    getTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  },
  channelService: {
    getTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    syncTemplates: vi.fn(),
    transformToFrontendFormat: vi.fn(),
    transformToBackendFormat: vi.fn(),
  },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en', changeLanguage: vi.fn() }),
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({ can: () => true, canAny: () => true, canAll: () => true, isReady: true }),
}));

vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: (selector: (s: unknown) => unknown) =>
    selector({ inboxes: h.inboxes, fetchInboxes: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/services/messageTemplates/globalMessageTemplatesService', () => ({
  default: h.globalService,
  providerToChannelType: (p: string) => (p === 'email' ? 'Channel::Email' : 'Channel::Api'),
  inferTemplateProvider: () => 'generic',
}));

vi.mock('@/services/channels/messageTemplatesService', () => ({
  default: h.channelService,
  supportsTemplateSync: (ct: string) => ct === 'Channel::Whatsapp',
  usesStructuredComponents: (ct: string) => ct === 'Channel::Whatsapp',
  getChannelTemplateConfig: (ct: string) => ({
    supportsMedia: true,
    supportsButtons: true,
    supportsStructured: ct === 'Channel::Whatsapp',
    categories: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
    templateTypes: ['text', 'interactive', 'media'],
  }),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => h.navigate };
});

// Keep the real design system EXCEPT the Radix Select family, which is hard to
// drive in jsdom — render it as a native <select> so scope/provider switching is
// assertable. Everything else (Button, Badge, Dialog, Table, etc.) stays real.
vi.mock('@evoapi/design-system', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Select: ({
      children,
      value,
      onValueChange,
      disabled,
    }: {
      children: ReactNode;
      value?: string | null;
      onValueChange?: (value: string) => void;
      disabled?: boolean;
    }) => (
      <select
        data-testid="ds-select"
        disabled={disabled}
        value={value || ''}
        onChange={e => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
      <option value={value}>{children}</option>
    ),
  };
});

import MessageTemplates from '../MessageTemplates';

const stdResponse = {
  success: true,
  data: [{ id: 't1', name: 'welcome', language: 'en_US', category: 'MARKETING' }],
  meta: {},
  message: '',
};

const selectWithOption = (optionValue: string): HTMLSelectElement => {
  const select = screen
    .getAllByTestId('ds-select')
    .find(s => s.querySelector(`option[value="${optionValue}"]`));
  if (!select) throw new Error(`No <select> with option ${optionValue}`);
  return select as HTMLSelectElement;
};

beforeEach(() => {
  vi.clearAllMocks();
  h.inboxes = [
    { id: 'wa-1', name: 'WhatsApp Cloud', channel_type: 'Channel::Whatsapp', provider: 'whatsapp_cloud' },
    { id: 'em-1', name: 'Email Inbox', channel_type: 'Channel::Email' },
  ];
  h.globalService.getTemplates.mockResolvedValue(stdResponse);
  h.channelService.getTemplates.mockResolvedValue(stdResponse);
  h.channelService.syncTemplates.mockResolvedValue([]);
  h.globalService.createTemplate.mockResolvedValue({ id: 'new' });
  h.channelService.createTemplate.mockResolvedValue({ id: 'new' });
});

describe('MessageTemplates (unified screen)', () => {
  it('defaults to Global scope and lists channel-less templates (no inbox arg)', async () => {
    render(<MessageTemplates />);
    expect(await screen.findByText('welcome')).toBeInTheDocument();
    expect(h.globalService.getTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ sort_by: 'name' }),
    );
    expect(h.channelService.getTemplates).not.toHaveBeenCalled();
  });

  it('fetches exactly once on mount (no infinite render/fetch loop)', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(h.globalService.getTemplates).toHaveBeenCalledTimes(1);
  });

  it('switching scope to an inbox re-queries the per-inbox service with the inbox id', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    // Only the scope select is mounted while the modal is closed.
    fireEvent.change(screen.getByTestId('ds-select'), { target: { value: 'wa-1' } });
    await waitFor(() =>
      expect(h.channelService.getTemplates).toHaveBeenCalledWith(
        'wa-1',
        expect.objectContaining({ page: 1 }),
      ),
    );
  });

  it('shows the Meta sync button only for a syncable inbox and calls syncTemplates', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    expect(screen.queryByText('actions.sync')).not.toBeInTheDocument(); // Global scope: hidden
    fireEvent.change(screen.getByTestId('ds-select'), { target: { value: 'wa-1' } });
    const syncBtn = await screen.findByText('actions.sync');
    fireEvent.click(syncBtn);
    await waitFor(() => expect(h.channelService.syncTemplates).toHaveBeenCalledWith('wa-1'));
  });

  it('routes New to the EmailTemplateEditor for an email inbox (no inline modal)', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    fireEvent.change(screen.getByTestId('ds-select'), { target: { value: 'em-1' } });
    await waitFor(() =>
      expect(h.channelService.getTemplates).toHaveBeenCalledWith('em-1', expect.anything()),
    );
    fireEvent.click(screen.getByText('newTemplate'));
    expect(h.navigate).toHaveBeenCalledWith(
      expect.stringContaining('/settings/email-template-editor?inboxId=em-1'),
    );
    expect(screen.queryByText('settings.messageTemplates.form.createTitle')).not.toBeInTheDocument();
  });

  it('creates a global template via the global service with the generic provider', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    fireEvent.click(screen.getByText('newTemplate'));
    await screen.findByText('settings.messageTemplates.form.createTitle');
    fireEvent.change(screen.getByPlaceholderText('settings.messageTemplates.form.namePlaceholder'), {
      target: { value: 'welcome_msg' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.messageTemplates.form.contentPlaceholder'), {
      target: { value: 'hi {{name}}' },
    });
    fireEvent.click(screen.getByText('settings.messageTemplates.form.create'));
    await waitFor(() =>
      expect(h.globalService.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'welcome_msg', content: 'hi {{name}}' }),
        'generic',
      ),
    );
  });

  it('creates an inbox template via the per-inbox service with the channel_type', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    fireEvent.change(screen.getByTestId('ds-select'), { target: { value: 'wa-1' } });
    await screen.findByText('actions.sync');
    fireEvent.click(screen.getByText('newTemplate'));
    await screen.findByText('settings.messageTemplates.form.createTitle');
    fireEvent.change(screen.getByPlaceholderText('settings.messageTemplates.form.namePlaceholder'), {
      target: { value: 'promo' },
    });
    fireEvent.change(screen.getByPlaceholderText('settings.messageTemplates.form.bodyTextPlaceholder'), {
      target: { value: 'Body {{1}}' },
    });
    fireEvent.click(screen.getByText('settings.messageTemplates.form.create'));
    await waitFor(() =>
      expect(h.channelService.createTemplate).toHaveBeenCalledWith(
        'wa-1',
        expect.objectContaining({ name: 'promo' }),
        'Channel::Whatsapp',
      ),
    );
  });

  it('preserves typed input when toggling the provider in Global scope (F3)', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    fireEvent.click(screen.getByText('newTemplate'));
    await screen.findByText('settings.messageTemplates.form.createTitle');
    const nameInput = screen.getByPlaceholderText(
      'settings.messageTemplates.form.namePlaceholder',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'keep_me' } });
    // Toggle provider generic -> email via the in-modal channel selector.
    fireEvent.change(selectWithOption('Channel::Email'), { target: { value: 'Channel::Email' } });
    expect(
      (screen.getByPlaceholderText('settings.messageTemplates.form.namePlaceholder') as HTMLInputElement)
        .value,
    ).toBe('keep_me');
  });
});

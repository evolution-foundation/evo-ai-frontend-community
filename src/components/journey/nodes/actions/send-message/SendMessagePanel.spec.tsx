import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SendMessagePanel } from './SendMessagePanel';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import { automationService } from '@/services/automation/automationService';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('@/services/automation/automationService', () => ({
  automationService: { getFormData: vi.fn() },
}));

vi.mock('@/services/channels/messageTemplatesService', () => ({
  default: { getTemplates: vi.fn() },
}));

vi.mock('@/components/journey/environment-manager', () => ({
  VariableTextarea: ({ value, onChange, placeholder }: any) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockedFormData = vi.mocked(automationService.getFormData);
const mockedGetTemplates = vi.mocked(MessageTemplateService.getTemplates);

const inboxes = [
  { id: 'i1', name: 'WA Cloud', channel_type: 'Channel::Whatsapp', provider: 'whatsapp_cloud' },
  { id: 'i2', name: 'WA Evolution', channel_type: 'Channel::Whatsapp', provider: 'evolution' },
  { id: 'i3', name: 'Email Box', channel_type: 'Channel::Email' },
];

const template = {
  id: 'tpl-1',
  name: 'welcome',
  content: 'Olá {{first_name}}!',
  language: 'pt_BR',
  category: 'UTILITY' as const,
  variables: [{ name: 'first_name', label: 'First name', required: true }],
};

const noop = () => {};

const renderPanel = (data: Record<string, unknown>) =>
  render(
    <SendMessagePanel nodeId="n1" data={data as any} onUpdate={noop} onClose={noop} />,
  );

beforeEach(() => {
  mockedFormData.mockReset().mockResolvedValue({ inboxes } as any);
  mockedGetTemplates.mockReset().mockResolvedValue({ success: true, data: [template] } as any);
});

describe('SendMessagePanel template mode (EVO-1255)', () => {
  it('AC1: forces template mode for a WhatsApp Cloud inbox and locks free text', async () => {
    renderPanel({ inboxId: 'i1', message: '' });

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalledWith('i1', expect.anything()));
    expect(screen.getByText('panels.sendMessage.templateRequiredForCloud')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'panels.sendMessage.modeText' }),
    ).toBeDisabled();
  });

  it('AC2: keeps free-text mode available for non-Cloud channels', async () => {
    renderPanel({ inboxId: 'i2', message: 'hello' });

    await waitFor(() => expect(mockedFormData).toHaveBeenCalled());
    expect(mockedGetTemplates).not.toHaveBeenCalled();
    expect(screen.getByText('panels.sendMessage.message')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'panels.sendMessage.modeText' }),
    ).not.toBeDisabled();
  });

  it('AC3: flags missing template selection in template mode', async () => {
    renderPanel({ inboxId: 'i2', messageMode: 'template', message: '' });

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalled());
    expect(
      await screen.findByText('panels.sendMessage.selectTemplateValidation'),
    ).toBeInTheDocument();
  });

  it('renders variable inputs and flags empty required variables', async () => {
    renderPanel({
      inboxId: 'i2',
      messageMode: 'template',
      templateId: 'tpl-1',
      templateParams: { first_name: '' },
      message: '',
    });

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalled());
    expect(await screen.findByText('First name')).toBeInTheDocument();
    expect(screen.getByText('panels.sendMessage.fillRequiredVariables')).toBeInTheDocument();
    expect(screen.getByText('Olá {{first_name}}!')).toBeInTheDocument();
  });

  it('flags a template that no longer exists', async () => {
    mockedGetTemplates.mockResolvedValue({ success: true, data: [] } as any);
    renderPanel({ inboxId: 'i2', messageMode: 'template', templateId: 'tpl-gone', message: '' });

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalled());
    expect(
      await screen.findByText('panels.sendMessage.templateUnavailable'),
    ).toBeInTheDocument();
  });

  it('hides the event-channel option and attachments in template mode', async () => {
    renderPanel({ inboxId: 'i2', messageMode: 'template', message: '' });

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalled());
    expect(screen.queryByText('panels.sendMessage.useEventChannel')).toBeNull();
    expect(screen.queryByText('panels.sendMessage.attachments')).toBeNull();
  });
});

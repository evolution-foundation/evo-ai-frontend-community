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

// Capture every VariableTextarea render so we can assert journeyId is wired
// through (EVO-1855: the picker fetches journey custom variables via
// useJourneyVariables(journeyId) — a dropped prop silently degrades it to
// system-only variables).
const variableTextareaProps: any[] = [];
vi.mock('@/components/journey/environment-manager', () => ({
  VariableTextarea: ({ value, onChange, placeholder, ...rest }: any) => {
    variableTextareaProps.push({ value, placeholder, ...rest });
    return <textarea value={value} onChange={onChange} placeholder={placeholder} />;
  },
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

const renderPanel = (data: Record<string, unknown>, journeyId?: string) =>
  render(
    <SendMessagePanel
      nodeId="n1"
      data={data as any}
      onUpdate={noop}
      onClose={noop}
      journeyId={journeyId}
    />,
  );

beforeEach(() => {
  variableTextareaProps.length = 0;
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

describe('SendMessagePanel journey variable wiring (EVO-1855)', () => {
  it('passes journeyId to the free-text message picker so it can fetch journey variables', async () => {
    renderPanel({ inboxId: 'i2', messageMode: 'text', message: 'hi' }, 'journey-99');

    await waitFor(() => expect(mockedFormData).toHaveBeenCalled());
    await waitFor(() => expect(variableTextareaProps.length).toBeGreaterThan(0));
    expect(variableTextareaProps.every(p => p.journeyId === 'journey-99')).toBe(true);
  });

  it('passes journeyId to the expression picker in template mode', async () => {
    renderPanel(
      {
        inboxId: 'i2',
        messageMode: 'template',
        templateId: 'tpl-1',
        message: '',
        templateVariables: [
          { variable: 'first_name', source: 'expression', expression: '{{contact.name}}' },
        ],
      },
      'journey-99',
    );

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalled());
    await waitFor(() => expect(variableTextareaProps.length).toBeGreaterThan(0));
    expect(variableTextareaProps.every(p => p.journeyId === 'journey-99')).toBe(true);
  });
});

describe('SendMessagePanel variable source mappings (EVO-1267)', () => {
  const twoVarTemplate = {
    ...template,
    content: 'Olá {{first_name}}, deal {{deal_value}}!',
    variables: [
      { name: 'first_name', label: 'First name', required: true },
      { name: 'deal_value', label: 'Deal value', required: false },
    ],
  };

  beforeEach(() => {
    mockedGetTemplates.mockReset().mockResolvedValue({
      success: true,
      data: [twoVarTemplate],
    } as unknown as Awaited<ReturnType<typeof MessageTemplateService.getTemplates>>);
  });

  it('AC1: renders one source dropdown per detected template variable', async () => {
    renderPanel({
      inboxId: 'i2',
      messageMode: 'template',
      templateId: 'tpl-1',
      message: '',
    });

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalled());
    expect(await screen.findByText('First name')).toBeInTheDocument();
    expect(screen.getByText('Deal value')).toBeInTheDocument();
    // Both variables default to the 'fixed' source (pre-10.19 behavior).
    expect(screen.getAllByText('panels.sendMessage.variableSources.fixed')).toHaveLength(2);
  });

  it('AC3: an unbalanced custom expression flags the panel and disables Save', async () => {
    renderPanel({
      inboxId: 'i2',
      messageMode: 'template',
      templateId: 'tpl-1',
      message: '',
      templateVariables: [
        { variable: 'first_name', source: 'expression', expression: '{{contact.name' },
      ],
    });

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalled());
    expect(
      (await screen.findAllByText('panels.sendMessage.invalidExpression')).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'panels.actions.save' })).toBeDisabled();
  });

  it('shows the curated field picker and fallback input for root sources', async () => {
    renderPanel({
      inboxId: 'i2',
      messageMode: 'template',
      templateId: 'tpl-1',
      message: '',
      templateVariables: [
        { variable: 'first_name', source: 'contact', path: 'name', fallback: 'amigo' },
      ],
    });

    await waitFor(() => expect(mockedGetTemplates).toHaveBeenCalled());
    expect(
      await screen.findByText('panels.sendMessage.variableFields.contact.name'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('panels.sendMessage.fallbackPlaceholder'),
    ).toBeInTheDocument();
  });
});

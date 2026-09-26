import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditStageModal from './EditStageModal';
import type { PipelineStage } from '@/types/analytics';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: vi.fn().mockResolvedValue({ data: [] }),
    getPipelineStages: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/services/channels/agentBotsService', () => ({
  default: { getAll: vi.fn().mockResolvedValue([]) },
}));

const getCannedResponsesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [] }));
vi.mock('@/services/cannedResponses/cannedResponsesService', () => ({
  cannedResponsesService: { getCannedResponses: getCannedResponsesMock },
}));

const getCustomAttributesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [] }));
vi.mock('@/services/customAttributes/customAttributesService', () => ({
  customAttributesService: { getCustomAttributes: getCustomAttributesMock },
}));

const fetchCombinedTemplateOptionsMock = vi.hoisted(() => vi.fn());
vi.mock('@/services/messageTemplates/combinedTemplateOptions', () => ({
  fetchCombinedTemplateOptions: fetchCombinedTemplateOptionsMock,
}));

// StageAutomationRules is exercised by its own spec file — here we only need
// to prove EditStageModal feeds it the merged (generic + WhatsApp Cloud)
// template list, so it is replaced with a stub that surfaces the prop.
vi.mock('./StageAutomationRules', () => ({
  default: ({
    messageTemplates,
    cannedResponses,
    customAttributes,
  }: {
    messageTemplates: { id: string; name: string }[];
    cannedResponses: { id: string | number; name: string }[];
    customAttributes: { attribute_key: string }[];
  }) => (
    <>
      <div data-testid="message-templates">{JSON.stringify(messageTemplates)}</div>
      <div data-testid="canned-responses">{JSON.stringify(cannedResponses)}</div>
      <div data-testid="custom-attributes">{JSON.stringify(customAttributes)}</div>
    </>
  ),
}));

const stage: PipelineStage = {
  id: 'stage-1',
  name: 'Novo',
  color: '#3B82F6',
  position: 0,
  pipeline_id: 'pipe-1',
  created_at: 0,
  updated_at: 0,
};

beforeEach(() => vi.clearAllMocks());

describe('EditStageModal — template sourcing (WhatsApp Cloud fix)', () => {
  it('feeds StageAutomationRules the combined (generic + WhatsApp Cloud) template list', async () => {
    fetchCombinedTemplateOptionsMock.mockResolvedValue([
      { id: 'g1', name: 'Welcome', source: 'generic', placeholders: [] },
      {
        id: 'w1',
        name: 'boas_vindas_crm',
        source: 'whatsapp',
        inboxName: 'Support Line',
        placeholders: ['1'],
      },
    ]);

    render(
      <EditStageModal
        open
        onOpenChange={vi.fn()}
        stage={stage}
        onSubmit={vi.fn()}
        loading={false}
      />,
    );

    await waitFor(() => expect(fetchCombinedTemplateOptionsMock).toHaveBeenCalled());

    // StageAutomationRules only mounts once its Tabs panel is active.
    await userEvent.click(screen.getByRole('tab', { name: 'editStage.automation' }));

    const rendered = await screen.findByTestId('message-templates');
    const parsed = JSON.parse(rendered.textContent ?? '[]');
    expect(parsed).toEqual([
      { id: 'g1', name: 'Welcome', source: 'generic', placeholders: [] },
      {
        id: 'w1',
        name: 'boas_vindas_crm',
        source: 'whatsapp',
        inboxName: 'Support Line',
        placeholders: ['1'],
      },
    ]);
  });
});

describe('EditStageModal — canned responses and custom attributes wiring', () => {
  it('fetches canned responses and custom attributes, feeding both to StageAutomationRules', async () => {
    getCannedResponsesMock.mockResolvedValue({
      data: [{ id: '1', short_code: 'saudacao', content: 'Olá!' }],
    });
    getCustomAttributesMock.mockResolvedValue({
      data: [
        {
          id: 'attr-1',
          attribute_display_name: 'Origem',
          attribute_display_type: 'text',
          attribute_key: 'origem',
          attribute_model: 'conversation_attribute',
          created_at: '',
          updated_at: '',
        },
      ],
    });

    render(
      <EditStageModal
        open
        onOpenChange={vi.fn()}
        stage={stage}
        onSubmit={vi.fn()}
        loading={false}
      />,
    );

    await waitFor(() => expect(getCannedResponsesMock).toHaveBeenCalled());
    await waitFor(() => expect(getCustomAttributesMock).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('tab', { name: 'editStage.automation' }));

    const cannedRendered = await screen.findByTestId('canned-responses');
    expect(JSON.parse(cannedRendered.textContent ?? '[]')).toEqual([
      { id: '1', name: '/saudacao' },
    ]);

    const attrsRendered = await screen.findByTestId('custom-attributes');
    expect(JSON.parse(attrsRendered.textContent ?? '[]')).toEqual([
      expect.objectContaining({ attribute_key: 'origem' }),
    ]);
  });
});

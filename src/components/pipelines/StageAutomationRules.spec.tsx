import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StageAutomationRules from './StageAutomationRules';
import type { MessageTemplateOption } from './StageAutomationRules';
import type { StageAutomationRule } from '@/types/analytics/pipelines';
import type { Team } from '@/types/users';
import type { CustomAttributeDefinition } from '@/types/settings';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

// The pending-templates hint links out to Message Templates; the spec renders
// without a Router, so useNavigate is stubbed (the rest of the module is real).
const navigateSpy = vi.fn();
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateSpy,
}));

const inactivityRule = (minutes: number): StageAutomationRule => ({
  id: 'rule-1',
  trigger: 'inactivity',
  trigger_value: { minutes, base: 'no_customer_reply' },
  action: 'send_direct_message',
  action_value: 'Oi! Ainda tem interesse?',
});

const renderRules = (minutes: number) => {
  const onChange = vi.fn();
  render(<StageAutomationRules rules={[inactivityRule(minutes)]} onChange={onChange} />);
  return onChange;
};

// The real parent (EditStageModal) feeds every onChange back as the new rules
// prop; the spy above does not, which would hide a value dropped on selection.
function StatefulRules({ minutes }: { minutes: number }) {
  const [rules, setRules] = useState([inactivityRule(minutes)]);
  return <StageAutomationRules rules={rules} onChange={setRules} />;
}

// The rule row renders several selects (trigger, duration, base, action…);
// the duration one is the only one whose value carries the minutes/hours label.
const durationCombobox = () => {
  const found = screen
    .getAllByRole('combobox')
    .find(cb => /stageAutomation\.inactivity\.(minutes|hour|days)/.test(cb.textContent ?? ''));
  if (!found) throw new Error('duration combobox not found — did the inactivity label keys change?');
  return found;
};

// CRM-467: the duration Select used to be a closed preset list capped at 24h.
// Values the API accepts (any positive minutes) rendered as an EMPTY select,
// making a live rule look timerless — and inviting a destructive re-save.
describe('StageAutomationRules — inactivity duration (CRM-467)', () => {
  it('renders 24h from the preset list (regression)', () => {
    renderRules(1440);
    expect(screen.getByText('24 stageAutomation.inactivity.hours')).toBeTruthy();
  });

  it('renders the new 48h preset as the selected value', () => {
    renderRules(2880);
    expect(screen.getByText('48 stageAutomation.inactivity.hours')).toBeTruthy();
  });

  it('renders an out-of-list value as a dynamic option instead of an empty select', () => {
    renderRules(90);
    expect(screen.getByText('90 stageAutomation.inactivity.minutes')).toBeTruthy();
  });

  it('offers 48h and 72h in the duration dropdown', async () => {
    const user = userEvent.setup();
    renderRules(1440);

    await user.click(durationCombobox());

    expect(screen.getByRole('option', { name: '48 stageAutomation.inactivity.hours' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '72 stageAutomation.inactivity.hours' })).toBeTruthy();
  });

  it('labels a value of a week or more in days', () => {
    renderRules(10080);
    expect(screen.getByText('7 stageAutomation.inactivity.days')).toBeTruthy();
  });

  it('never rewrites an untouched rule (no onChange on mount)', () => {
    const onChange = renderRules(90);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the API duration when another field of the rule is edited', async () => {
    const user = userEvent.setup();
    const onChange = renderRules(2880);

    await user.type(screen.getByPlaceholderText('stageAutomation.directMessagePlaceholder'), '!');

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        trigger_value: { minutes: 2880, base: 'no_customer_reply' },
      }),
    ]);
  });

  it('keeps an API duration pickable after another one is selected', async () => {
    const user = userEvent.setup();
    render(<StatefulRules minutes={90} />);

    await user.click(durationCombobox());
    await user.click(screen.getByRole('option', { name: '24 stageAutomation.inactivity.hours' }));
    await user.click(durationCombobox());

    expect(
      screen.getByRole('option', { name: '90 stageAutomation.inactivity.minutes' }),
    ).toBeTruthy();
  });

  it('emits the picked minutes and keeps the base on change', async () => {
    const user = userEvent.setup();
    const onChange = renderRules(1440);

    await user.click(durationCombobox());
    await user.click(screen.getByRole('option', { name: '72 stageAutomation.inactivity.hours' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        trigger_value: { minutes: 4320, base: 'no_customer_reply' },
      }),
    ]);
  });
});

// The owner's annotated spec (2026-08-31): a template PENDING Meta approval must
// stay visible (disabled, with the approval note) instead of collapsing into
// "no templates"; all-pending and truly-empty each get an honest hint that links
// to Message Templates.
describe('StageAutomationRules — send_template with pending templates', () => {
  const templateRule = (value: string): StageAutomationRule => ({
    ...inactivityRule(60),
    action: 'send_template',
    action_value: value,
  });
  const renderTemplates = (templates: MessageTemplateOption[], value = '') =>
    render(
      <StageAutomationRules
        rules={[templateRule(value)]}
        onChange={vi.fn()}
        messageTemplates={templates}
      />,
    );

  it('a selected PENDING template renders with the Meta-approval note', () => {
    renderTemplates(
      [
        { id: 'tpl-1', name: 'Boas-vindas', status: 'APPROVED' },
        { id: 'tpl-2', name: 'Follow-up', status: 'PENDING' },
      ],
      'tpl-2',
    );
    expect(screen.getByText(/stageAutomation\.templatePending/)).toBeTruthy();
  });

  it('only pending templates: the hint says they await approval and links out', async () => {
    renderTemplates([{ id: 'tpl-2', name: 'Follow-up', status: 'PENDING' }]);
    expect(screen.getByText('stageAutomation.templatesPendingHint')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'stageAutomation.manageTemplates' }));
    expect(navigateSpy).toHaveBeenCalledWith('/settings/message-templates');
  });

  it('truly empty: the hint asks to create one, with the same link', () => {
    renderTemplates([]);
    expect(screen.getByText('stageAutomation.noTemplatesHint')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'stageAutomation.manageTemplates' })).toBeTruthy();
  });

  it('approved templates present: no hint below the select', () => {
    renderTemplates([{ id: 'tpl-1', name: 'Boas-vindas', status: 'APPROVED' }]);
    expect(screen.queryByText('stageAutomation.templatesPendingHint')).toBeNull();
    expect(screen.queryByText('stageAutomation.noTemplatesHint')).toBeNull();
  });
});

// CRM: a WhatsApp Cloud template's {{1}}, {{2}}... placeholders need a source
// mapped in (contact/conversation/pipeline field) plus a fallback, mirroring
// the per-variable picker already used by the canvas/flow "send message" node.
describe('StageAutomationRules — send_template variable mapping', () => {
  const templateRule = (
    value: string,
    overrides: Partial<StageAutomationRule> = {},
  ): StageAutomationRule => ({
    ...inactivityRule(60),
    action: 'send_template',
    action_value: value,
    ...overrides,
  });

  const whatsappTemplate: MessageTemplateOption = {
    id: 'w1',
    name: 'boas_vindas_crm',
    status: 'APPROVED',
    source: 'whatsapp',
    inboxName: 'Support Line',
    placeholders: ['1', '2'],
    content: 'Olá, {{1}}! Sua assinatura foi confirmada. {{2}}',
  };

  const genericTemplate: MessageTemplateOption = {
    id: 'g1',
    name: 'Welcome',
    status: 'ACTIVE',
    source: 'generic',
    placeholders: [],
  };

  it('renders one mapping field per placeholder when the selected template has variables', () => {
    render(
      <StageAutomationRules
        rules={[templateRule('w1')]}
        onChange={vi.fn()}
        messageTemplates={[whatsappTemplate]}
      />,
    );

    expect(screen.getAllByPlaceholderText('stageAutomation.variableMapping.fallbackPlaceholder')).toHaveLength(2);
  });

  it('shows the template body so the user can see what each placeholder replaces', () => {
    const { container } = render(
      <StageAutomationRules
        rules={[templateRule('w1')]}
        onChange={vi.fn()}
        messageTemplates={[whatsappTemplate]}
      />,
    );

    // Placeholders render as separate highlighted <strong> nodes, so the
    // template body is split across several text nodes — assert on the
    // container's concatenated text rather than a single getByText match.
    expect(container.textContent).toContain('Olá, {{1}}! Sua assinatura foi confirmada. {{2}}');
  });

  it('renders no mapping fields for a template with no placeholders', () => {
    render(
      <StageAutomationRules
        rules={[templateRule('g1')]}
        onChange={vi.fn()}
        messageTemplates={[genericTemplate]}
      />,
    );

    expect(
      screen.queryByPlaceholderText('stageAutomation.variableMapping.fallbackPlaceholder'),
    ).toBeNull();
  });

  it('renders no mapping fields when no template is selected yet', () => {
    render(
      <StageAutomationRules
        rules={[templateRule('')]}
        onChange={vi.fn()}
        messageTemplates={[whatsappTemplate]}
      />,
    );

    expect(
      screen.queryByPlaceholderText('stageAutomation.variableMapping.fallbackPlaceholder'),
    ).toBeNull();
  });

  it('writes the mapped path into action_variables when a field is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StageAutomationRules
        rules={[templateRule('w1')]}
        onChange={onChange}
        messageTemplates={[whatsappTemplate]}
      />,
    );

    const pathCombobox = screen.getAllByRole('combobox').find(
      cb => cb.textContent === 'stageAutomation.variableMapping.choosePath',
    );
    if (!pathCombobox) throw new Error('placeholder field combobox not found');
    await user.click(pathCombobox);
    await user.click(screen.getByRole('option', { name: 'stageAutomation.variableMapping.fields.contact_name' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        action_variables: { '1': '{{contact.name}}' },
      }),
    ]);
  });

  it('writes the fallback text into action_variable_fallbacks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StageAutomationRules
        rules={[templateRule('w1')]}
        onChange={onChange}
        messageTemplates={[whatsappTemplate]}
      />,
    );

    const fallbackInputs = screen.getAllByPlaceholderText(
      'stageAutomation.variableMapping.fallbackPlaceholder',
    );
    await user.type(fallbackInputs[0], 'x');

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        action_variable_fallbacks: { '1': 'x' },
      }),
    ]);
  });

  it('labels a WhatsApp Cloud option with its inbox, and a generic one plainly', async () => {
    const user = userEvent.setup();
    render(
      <StageAutomationRules
        rules={[templateRule('')]}
        onChange={vi.fn()}
        messageTemplates={[genericTemplate, whatsappTemplate]}
      />,
    );

    const templateCombobox = screen
      .getAllByRole('combobox')
      .find(cb => cb.textContent === 'stageAutomation.selectTemplate');
    if (!templateCombobox) throw new Error('template combobox not found');
    await user.click(templateCombobox);

    expect(screen.getByRole('option', { name: /stageAutomation\.templateSourceLabels\.generic.*Welcome/ })).toBeTruthy();
    expect(
      screen.getByRole('option', {
        name: /stageAutomation\.templateSourceLabels\.whatsapp.*Support Line.*boas_vindas_crm/,
      }),
    ).toBeTruthy();
  });

  // Bug: {{1}} in template A ("contact.name") and {{1}} in template B (e.g.
  // an order number) are unrelated. Switching the selected template must not
  // let B silently inherit A's stale mapping by key coincidence.
  const otherWhatsappTemplate: MessageTemplateOption = {
    id: 'w2',
    name: 'order_update',
    status: 'APPROVED',
    source: 'whatsapp',
    inboxName: 'Support Line',
    placeholders: ['1'],
  };

  it('clears action_variables/action_variable_fallbacks when the template selection changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StageAutomationRules
        rules={[
          templateRule('w1', {
            action_variables: { '1': '{{contact.name}}', '2': '{{contact.email}}' },
            action_variable_fallbacks: { '1': 'x' },
          }),
        ]}
        onChange={onChange}
        messageTemplates={[whatsappTemplate, otherWhatsappTemplate]}
      />,
    );

    const templateCombobox = screen
      .getAllByRole('combobox')
      .find(cb => /boas_vindas_crm/.test(cb.textContent ?? ''));
    if (!templateCombobox) throw new Error('template combobox not found');
    await user.click(templateCombobox);
    await user.click(screen.getByRole('option', { name: /order_update/ }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        action_value: 'w2',
        action_variables: undefined,
        action_variable_fallbacks: undefined,
      }),
    ]);
  });

  it('clears action_variables/action_variable_fallbacks when switching the action away from send_template', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StageAutomationRules
        rules={[
          templateRule('w1', {
            action_variables: { '1': '{{contact.name}}' },
            action_variable_fallbacks: { '1': 'x' },
          }),
        ]}
        onChange={onChange}
        messageTemplates={[whatsappTemplate]}
      />,
    );

    const actionCombobox = screen
      .getAllByRole('combobox')
      .find(cb => cb.textContent === 'stageAutomation.actions.send_template');
    if (!actionCombobox) throw new Error('action-type combobox not found');
    await user.click(actionCombobox);
    await user.click(screen.getByRole('option', { name: 'stageAutomation.actions.send_direct_message' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        action: 'send_direct_message',
        action_value: '',
        action_variables: undefined,
        action_variable_fallbacks: undefined,
      }),
    ]);
  });
});

describe('StageAutomationRules — new actions (remove_label, assign_team, change_priority, create_pipeline_task)', () => {
  it('renders remove_label action with label options', () => {
    const removeLabelRule: StageAutomationRule = {
      id: 'rule-2',
      trigger: 'label_added',
      trigger_value: 'novo-lead',
      action: 'remove_label',
      action_value: 'prospect',
    };
    render(
      <StageAutomationRules
        rules={[removeLabelRule]}
        onChange={vi.fn()}
        labels={[{ id: '1', title: 'prospect', color: '#ff0000', show_on_sidebar: true }]}
      />,
    );
    expect(screen.getByText('prospect')).toBeTruthy();
  });

  it('renders assign_team action with team options', () => {
    const assignTeamRule: StageAutomationRule = {
      id: 'rule-3',
      trigger: 'conversation_status_changed',
      trigger_value: 'resolved',
      action: 'assign_team',
      action_value: '1',
    };
    render(
      <StageAutomationRules
        rules={[assignTeamRule]}
        onChange={vi.fn()}
        teams={[{ id: 1, name: 'Vendas', description: 'Equipe de vendas', is_member: true } as any]}
      />,
    );
    expect(screen.getByText('Vendas')).toBeTruthy();
  });

  it('renders change_priority action', () => {
    const priorityRule: StageAutomationRule = {
      id: 'rule-4',
      trigger: 'label_added',
      trigger_value: 'urgente',
      action: 'change_priority',
      action_value: 'urgent',
    };
    render(
      <StageAutomationRules
        rules={[priorityRule]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('stageAutomation.priorities.urgent')).toBeTruthy();
  });

  it('renders create_pipeline_task action with input', () => {
    const taskRule: StageAutomationRule = {
      id: 'rule-5',
      trigger: 'conversation_status_changed',
      trigger_value: 'open',
      action: 'create_pipeline_task',
      action_value: 'Ligar para o cliente',
    };
    render(
      <StageAutomationRules
        rules={[taskRule]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('Ligar para o cliente')).toBeTruthy();
  });
});

describe('StageAutomationRules — new actions (send_canned_response, send_email_to_team, send_email_transcript, update_custom_attribute)', () => {
  const vendasTeam: Team[] = [
    { id: '1', name: 'Vendas', description: 'Equipe de vendas', allow_auto_assign: false, is_member: true },
  ];
  const origemAttribute: CustomAttributeDefinition[] = [
    {
      id: 'attr-1',
      attribute_display_name: 'Origem',
      attribute_display_type: 'text',
      attribute_key: 'origem',
      attribute_model: 'conversation_attribute',
      created_at: '',
      updated_at: '',
    },
  ];

  it('renders send_canned_response action with canned response options, storing the id as a plain string', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const cannedRule: StageAutomationRule = {
      id: 'rule-6',
      trigger: 'label_added',
      trigger_value: 'novo-lead',
      action: 'send_canned_response',
      action_value: '',
    };
    render(
      <StageAutomationRules
        rules={[cannedRule]}
        onChange={onChange}
        cannedResponses={[{ id: '10', name: '/saudacao' }]}
      />,
    );

    const combobox = screen
      .getAllByRole('combobox')
      .find(cb => cb.textContent === 'stageAutomation.selectCannedResponse');
    if (!combobox) throw new Error('canned response combobox not found');
    await user.click(combobox);
    expect(screen.getByRole('option', { name: '/saudacao' })).toBeTruthy();
    await user.click(screen.getByRole('option', { name: '/saudacao' }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ action_value: '10' }),
    ]);
  });

  it('renders send_email_to_team action with a team checklist and message box, storing action_value as JSON', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const emailToTeamRule: StageAutomationRule = {
      id: 'rule-7',
      trigger: 'conversation_status_changed',
      trigger_value: 'resolved',
      action: 'send_email_to_team',
      action_value: '',
    };
    render(
      <StageAutomationRules
        rules={[emailToTeamRule]}
        onChange={onChange}
        teams={vendasTeam}
      />,
    );

    await user.click(screen.getByText('Vendas'));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        action_value: JSON.stringify({ team_ids: ['1'], message: '' }),
      }),
    ]);
  });

  it('writes the message into send_email_to_team action_value JSON', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const emailToTeamRule: StageAutomationRule = {
      id: 'rule-7b',
      trigger: 'conversation_status_changed',
      trigger_value: 'resolved',
      action: 'send_email_to_team',
      action_value: JSON.stringify({ team_ids: ['1'], message: '' }),
    };
    render(
      <StageAutomationRules
        rules={[emailToTeamRule]}
        onChange={onChange}
        teams={vendasTeam}
      />,
    );

    const textarea = screen.getByPlaceholderText('stageAutomation.emailToTeamMessagePlaceholder');
    await user.type(textarea, 'x');

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        action_value: JSON.stringify({ team_ids: ['1'], message: 'x' }),
      }),
    ]);
  });

  it('renders send_email_transcript action as a plain comma-separated email input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const transcriptRule: StageAutomationRule = {
      id: 'rule-8',
      trigger: 'label_added',
      trigger_value: 'fechado',
      action: 'send_email_transcript',
      action_value: '',
    };
    render(
      <StageAutomationRules
        rules={[transcriptRule]}
        onChange={onChange}
      />,
    );

    const input = screen.getByPlaceholderText('stageAutomation.emailTranscriptPlaceholder');
    await user.type(input, 'a');

    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ action_value: 'a' }),
    ]);
  });

  it('renders update_custom_attribute action with an attribute picker and value input, storing action_value as JSON', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const attrRule: StageAutomationRule = {
      id: 'rule-9',
      trigger: 'label_added',
      trigger_value: 'novo-lead',
      action: 'update_custom_attribute',
      action_value: '',
    };
    render(
      <StageAutomationRules
        rules={[attrRule]}
        onChange={onChange}
        customAttributes={origemAttribute}
      />,
    );

    const combobox = screen
      .getAllByRole('combobox')
      .find(cb => cb.textContent === 'stageAutomation.selectCustomAttribute');
    if (!combobox) throw new Error('custom attribute combobox not found');
    await user.click(combobox);
    expect(screen.getByRole('option', { name: /Origem/ })).toBeTruthy();
    await user.click(screen.getByRole('option', { name: /Origem/ }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        action_value: JSON.stringify({
          custom_attribute_key: 'origem',
          custom_attribute_model: 'conversation_attribute',
          custom_attribute_value: '',
        }),
      }),
    ]);
  });

  it('writes the typed value into update_custom_attribute action_value JSON', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const attrRule: StageAutomationRule = {
      id: 'rule-9b',
      trigger: 'label_added',
      trigger_value: 'novo-lead',
      action: 'update_custom_attribute',
      action_value: JSON.stringify({
        custom_attribute_key: 'origem',
        custom_attribute_model: 'conversation_attribute',
        custom_attribute_value: '',
      }),
    };
    render(
      <StageAutomationRules
        rules={[attrRule]}
        onChange={onChange}
        customAttributes={origemAttribute}
      />,
    );

    const valueInput = screen.getByPlaceholderText('stageAutomation.customAttributeValuePlaceholder');
    await user.type(valueInput, 'y');

    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        action_value: JSON.stringify({
          custom_attribute_key: 'origem',
          custom_attribute_model: 'conversation_attribute',
          custom_attribute_value: 'y',
        }),
      }),
    ]);
  });
});

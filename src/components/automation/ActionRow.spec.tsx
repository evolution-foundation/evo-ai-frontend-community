import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  automationRuleSchema,
  type AutomationRuleFormData,
} from '@/pages/Customer/Automation/registries';
import ActionRow from './ActionRow';
import type { AutomationFormData } from '@/hooks/automation/useAutomationFormData';

const emptyFormData: AutomationFormData = {
  inboxes: [],
  agents: [],
  teams: [],
  labels: [],
  pipelines: [],
  pipelineStages: [],
  priorities: [],
  statuses: [],
  messageTypes: [],
  cannedResponses: [],
  messageTemplates: [],
};

function Wrapper({
  defaultValues,
  formData = emptyFormData,
}: {
  defaultValues: AutomationRuleFormData;
  formData?: AutomationFormData;
}) {
  const methods = useForm<AutomationRuleFormData>({
    resolver: zodResolver(automationRuleSchema),
    defaultValues,
  });
  return (
    <FormProvider {...methods}>
      <ActionRow
        control={methods.control}
        index={0}
        formData={formData}
        onRemove={() => {}}
        onActionChange={() => {}}
      />
    </FormProvider>
  );
}

describe('ActionRow', () => {
  it('renders for a send_message action with the action select and remove button', () => {
    const defaults: AutomationRuleFormData = {
      name: 'Test',
      description: '',
      event_name: 'conversation_created',
      active: true,
      mode: 'simple',
      conditions: [],
      actions: [{ action_name: 'send_message', action_params: ['hi'] }],
    };
    const { container } = render(<Wrapper defaultValues={defaults} />);
    expect(container.querySelector('button[aria-label*="remove"]')).toBeTruthy();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  // EVO-1646: send_email_to_team must expose a team multi-select.
  it('renders a team checkbox per team for send_email_to_team and toggles selection', () => {
    const defaults: AutomationRuleFormData = {
      name: 'Test',
      description: '',
      event_name: 'conversation_created',
      active: true,
      mode: 'simple',
      conditions: [],
      actions: [{ action_name: 'send_email_to_team', action_params: [{ team_ids: [], message: '' }] }],
    };
    const formData: AutomationFormData = {
      ...emptyFormData,
      teams: [
        { id: '9324e2c6-6365-4924-99d4-6cd7c2d5e9bc', name: 'Sales' },
        { id: 'a1b2c3d4-0000-4924-99d4-6cd7c2d5e9bc', name: 'Support' },
      ],
    };
    render(<Wrapper defaultValues={defaults} formData={formData} />);
    expect(screen.getByText('Sales')).toBeTruthy();
    expect(screen.getByText('Support')).toBeTruthy();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('false');
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('true');
  });

  it('shows the no-teams message for send_email_to_team when no teams exist', () => {
    const defaults: AutomationRuleFormData = {
      name: 'Test',
      description: '',
      event_name: 'conversation_created',
      active: true,
      mode: 'simple',
      conditions: [],
      actions: [{ action_name: 'send_email_to_team', action_params: [{ team_ids: [], message: '' }] }],
    };
    render(<Wrapper defaultValues={defaults} />);
    expect(screen.getByText(/send_email_to_team_no_teams/)).toBeTruthy();
  });

  it('renders the no-params placeholder for resolve_conversation', () => {
    const defaults: AutomationRuleFormData = {
      name: 'Test',
      description: '',
      event_name: 'conversation_created',
      active: true,
      mode: 'simple',
      conditions: [],
      actions: [{ action_name: 'resolve_conversation', action_params: [] }],
    };
    render(<Wrapper defaultValues={defaults} />);
    expect(screen.getByText(/form\.fields\.actionRow\.noParams/)).toBeTruthy();
  });
});

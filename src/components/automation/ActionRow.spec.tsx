import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
};

function Wrapper({ defaultValues }: { defaultValues: AutomationRuleFormData }) {
  const methods = useForm<AutomationRuleFormData>({
    resolver: zodResolver(automationRuleSchema),
    defaultValues,
  });
  return (
    <FormProvider {...methods}>
      <ActionRow
        control={methods.control}
        index={0}
        formData={emptyFormData}
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

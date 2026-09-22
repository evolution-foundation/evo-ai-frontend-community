import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AutomationForm from './AutomationForm';

class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);

vi.mock('@/services/automation/automationService', () => ({
  automationService: {
    getFormData: vi.fn().mockResolvedValue({
      inboxes: [],
      agents: [],
      teams: [],
      labels: [],
      campaigns: [],
      customAttributes: [],
    }),
    getAutomation: vi.fn(),
    createAutomation: vi.fn(),
    updateAutomation: vi.fn(),
  },
}));

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: vi.fn().mockResolvedValue({ data: [] }),
    getPipelineStages: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

// useAutomationFormData also loads canned responses + message templates
// (added by EVO-1263). Mock them so the form-data load resolves in tests.
vi.mock('@/services/cannedResponses/cannedResponsesService', () => ({
  cannedResponsesService: {
    getCannedResponses: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/services/channels/messageTemplatesService', () => ({
  default: {
    getTemplates: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

function renderForm(mode: 'create' | 'edit', initialPath = '/automation/new') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/automation/new" element={<AutomationForm mode={mode} />} />
        <Route path="/automation/:id/edit" element={<AutomationForm mode={mode} />} />
        <Route path="/automation" element={<div>list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AutomationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode title and form fields after form-data loads', async () => {
    renderForm('create');
    await waitFor(() => {
      expect(screen.getByText(/form\.title\.create/)).toBeTruthy();
    });
    expect(screen.getByText(/form\.fields\.name/)).toBeTruthy();
    expect(screen.getByText(/form\.fields\.event\.label/)).toBeTruthy();
  });

  it('renders edit mode title when mode is edit', async () => {
    const { automationService } = await import('@/services/automation/automationService');
    vi.mocked(automationService.getAutomation).mockResolvedValue({
      id: 'rule-1',
      name: 'Existing rule',
      description: 'Some context',
      event_name: 'conversation_created',
      active: true,
      mode: 'simple',
      conditions: [],
      actions: [{ action_name: 'send_message', action_params: ['hi'] }],
    } as never);

    const { container } = renderForm('edit', '/automation/rule-1/edit');
    await waitFor(() => {
      expect(screen.getByText(/form\.title\.edit/)).toBeTruthy();
    });

    // Regression: extractData returns the rule directly, so the form must
    // consume `response` as the rule (not `response.data`). If the form
    // mishandles the unwrap the input stays empty.
    await waitFor(() => {
      const nameInput = container.querySelector('input#name') as HTMLInputElement | null;
      expect(nameInput).not.toBeNull();
      expect(nameInput?.value).toBe('Existing rule');
    });
  });

  it('restores From and To pickers when editing a rule that uses attribute_changed', async () => {
    const { automationService } = await import('@/services/automation/automationService');
    vi.mocked(automationService.getAutomation).mockResolvedValue({
      id: 'rule-2',
      name: 'On status transition',
      description: '',
      event_name: 'conversation_updated',
      active: true,
      mode: 'simple',
      conditions: [
        {
          attribute_key: 'status',
          filter_operator: 'attribute_changed',
          query_operator: 'AND',
          values: { from: ['open'], to: ['resolved'] },
        },
      ],
      actions: [{ action_name: 'send_message', action_params: ['hi'] }],
    } as never);

    renderForm('edit', '/automation/rule-2/edit');

    await waitFor(() => {
      expect(screen.getByText(/form\.title\.edit/)).toBeTruthy();
    });

    // The From / To labels should appear, proving the renderer branched on
    // the attribute_changed shape rather than falling back to the flat-array
    // single-value picker. Both labels and the operator label exist because
    // they share the i18n key suffix, so we assert that we see at least one
    // of each.
    await waitFor(() => {
      expect(screen.getAllByText(/form\.fields\.conditionRow\.from/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/form\.fields\.conditionRow\.to/).length).toBeGreaterThan(0);
    });
  });

  it('enables the submit button with NO conditions once name + action are validly filled', async () => {
    const { container } = renderForm('create');
    await waitFor(() => {
      expect(screen.getByText(/form\.title\.create/)).toBeTruthy();
    });

    const submit = screen.getByRole('button', {
      name: /form\.buttons\.create/,
    }) as HTMLButtonElement;

    // Default action (send_message) has an empty message and name is blank → blocked.
    expect(submit.disabled).toBe(true);

    // Fill the name; still blocked because the action message is empty.
    const nameInput = container.querySelector('input#name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My rule' } });
    expect(submit.disabled).toBe(true);

    // Fill the action message — WITHOUT adding any condition.
    const msgInput = screen.getByPlaceholderText(
      /params\.send_message/,
    ) as HTMLInputElement;
    fireEvent.change(msgInput, { target: { value: 'Hello' } });

    // Conditions are empty (optional) and all required fields are valid → enabled.
    await waitFor(() => {
      expect(submit.disabled).toBe(false);
    });
  });

  describe('actions that need a conversation on a stage-entry rule', () => {
    const stageEntryRule = (actions: unknown[]) =>
      ({
        id: 'rule-1',
        name: 'Stage entry',
        description: '',
        event_name: 'pipeline_stage_updated',
        active: true,
        mode: 'simple',
        conditions: [],
        actions,
      }) as never;

    it('warns, naming the action, that it will not run on a card without a conversation', async () => {
      const { automationService } = await import('@/services/automation/automationService');
      vi.mocked(automationService.getAutomation).mockResolvedValue(
        stageEntryRule([{ action_name: 'send_message', action_params: ['hi'] }]),
      );

      renderForm('edit', '/automation/rule-1/edit');

      const notice = await screen.findByRole('status');
      expect(notice.textContent).toMatch(/form\.fields\.actions\.noConversationNotice/);
    });

    it('stays quiet when every action runs on the contact', async () => {
      const { automationService } = await import('@/services/automation/automationService');
      vi.mocked(automationService.getAutomation).mockResolvedValue(
        stageEntryRule([{ action_name: 'add_label', action_params: ['vip'] }]),
      );

      const { container } = renderForm('edit', '/automation/rule-1/edit');
      await waitFor(() => {
        expect((container.querySelector('input#name') as HTMLInputElement | null)?.value).toBe('Stage entry');
      });

      expect(screen.queryByRole('status')).toBeNull();
    });

    it('stays quiet on an event that always has a conversation', async () => {
      const { automationService } = await import('@/services/automation/automationService');
      vi.mocked(automationService.getAutomation).mockResolvedValue({
        id: 'rule-1',
        name: 'On conversation',
        description: '',
        event_name: 'conversation_created',
        active: true,
        mode: 'simple',
        conditions: [],
        actions: [{ action_name: 'send_message', action_params: ['hi'] }],
      } as never);

      const { container } = renderForm('edit', '/automation/rule-1/edit');
      await waitFor(() => {
        expect((container.querySelector('input#name') as HTMLInputElement | null)?.value).toBe('On conversation');
      });

      expect(screen.queryByRole('status')).toBeNull();
    });

    it('repeats the warning in a toast when the rule is saved', async () => {
      const { automationService } = await import('@/services/automation/automationService');
      const { toast } = await import('sonner');
      vi.mocked(automationService.getAutomation).mockResolvedValue(
        stageEntryRule([{ action_name: 'send_message', action_params: ['hi'] }]),
      );
      vi.mocked(automationService.updateAutomation).mockResolvedValue({} as never);

      renderForm('edit', '/automation/rule-1/edit');
      await screen.findByRole('status');

      const submit = screen.getByRole('button', { name: /form\.buttons\.(save|update)/ }) as HTMLButtonElement;
      await waitFor(() => expect(submit.disabled).toBe(false));
      fireEvent.click(submit);

      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith(
          expect.stringMatching(/form\.fields\.actions\.noConversationNotice/),
        );
      });
    });
  });

  it('navigates back to list and toasts on 404 in edit mode', async () => {
    const { automationService } = await import('@/services/automation/automationService');
    vi.mocked(automationService.getAutomation).mockRejectedValue({
      response: { status: 404 },
    });

    renderForm('edit', '/automation/missing/edit');
    await waitFor(() => {
      expect(screen.getByText('list')).toBeTruthy();
    });
  });
});

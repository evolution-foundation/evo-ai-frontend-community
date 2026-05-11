import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

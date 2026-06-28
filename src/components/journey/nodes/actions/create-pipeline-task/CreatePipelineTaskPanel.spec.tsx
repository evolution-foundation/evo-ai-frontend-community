import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreatePipelineTaskPanel } from './CreatePipelineTaskPanel';
import { CreatePipelineTaskNodeData } from './CreatePipelineTaskNode';
import '@/i18n/config';

vi.mock('@/services/automation/automationService', () => ({
  automationService: { getFormData: vi.fn() },
}));

import { automationService } from '@/services/automation/automationService';

const mockGetFormData = automationService.getFormData as unknown as ReturnType<typeof vi.fn>;

const AGENTS = [
  { id: 'u1', name: 'Alice', email: 'alice@example.com' },
  { id: 'u2', name: 'Bob', email: 'bob@example.com' },
];

const SAVE_RE = /save|salvar|guardar|salva/i;
const TITLE_RE = /title|título/i;

function makeData(overrides: Partial<CreatePipelineTaskNodeData> = {}): CreatePipelineTaskNodeData {
  return { label: 'Create Pipeline Task', ...overrides };
}

function renderPanel(props: Partial<Parameters<typeof CreatePipelineTaskPanel>[0]> = {}) {
  return render(
    <CreatePipelineTaskPanel
      nodeId="n1"
      data={makeData()}
      onUpdate={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('CreatePipelineTaskPanel', () => {
  it('keeps Save disabled until a title is entered (title is required)', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: AGENTS });
    const user = userEvent.setup();
    renderPanel();

    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: SAVE_RE })).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: TITLE_RE }), 'Follow up');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: SAVE_RE })).not.toBeDisabled(),
    );
  });

  it('emits onUpdate with the title and default priority on save', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: AGENTS });
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onUpdate, onClose });

    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());
    await user.type(screen.getByRole('textbox', { name: TITLE_RE }), 'Call the lead');

    const saveBtn = screen.getByRole('button', { name: SAVE_RE });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      'n1',
      expect.objectContaining({
        title: 'Call the lead',
        priority: 'medium',
        task_type: 'call',
        due_date: null,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('persists the configured task_type so the backend receives a valid type', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: AGENTS });
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    renderPanel({
      onUpdate,
      data: makeData({ title: 'Send recap', task_type: 'email' }),
    });

    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());

    // Dirty the form so Save enables, then persist.
    await user.type(screen.getByRole('textbox', { name: TITLE_RE }), '!');
    const saveBtn = screen.getByRole('button', { name: SAVE_RE });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      'n1',
      expect.objectContaining({ task_type: 'email' }),
    );
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoveToPipelineStagePanel } from './MoveToPipelineStagePanel';
import { MoveToPipelineStageNodeData } from './MoveToPipelineStageNode';
import '@/i18n/config';

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: vi.fn(),
    getPipelineStages: vi.fn(),
  },
}));

import { pipelinesService } from '@/services/pipelines/pipelinesService';

const mockGetPipelines = pipelinesService.getPipelines as unknown as ReturnType<typeof vi.fn>;
const mockGetStages = pipelinesService.getPipelineStages as unknown as ReturnType<typeof vi.fn>;

const PIPELINES = [
  { id: 'pipe-1', name: 'Sales' },
  { id: 'pipe-2', name: 'Onboarding' },
];
const STAGES = [
  { id: 'stage-1', name: 'Lead' },
  { id: 'stage-2', name: 'Qualified' },
];

const SAVE_RE = /save|salvar|guardar|enregistrer|salva/i;

function makeData(overrides: Partial<MoveToPipelineStageNodeData> = {}): MoveToPipelineStageNodeData {
  return { label: 'Move to Pipeline Stage', ...overrides };
}

function renderPanel(props: Partial<Parameters<typeof MoveToPipelineStagePanel>[0]> = {}) {
  return render(
    <MoveToPipelineStagePanel
      nodeId="n1"
      data={makeData()}
      onUpdate={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

async function selectPipeline(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('combobox', { name: /pipeline/i }));
  await user.click(within(await screen.findByRole('listbox')).getByText(name));
}

async function selectStage(user: ReturnType<typeof userEvent.setup>, name: string) {
  await waitFor(() => expect(screen.getByRole('combobox', { name: /stage/i })).not.toBeDisabled());
  await user.click(screen.getByRole('combobox', { name: /stage/i }));
  await user.click(within(await screen.findByRole('listbox')).getByText(name));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('MoveToPipelineStagePanel', () => {
  it('fetches the selected pipeline stages and renders them in the stage select', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    mockGetStages.mockResolvedValueOnce({ data: STAGES });
    const user = userEvent.setup();
    renderPanel();

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());
    await selectPipeline(user, 'Sales');

    await waitFor(() => expect(mockGetStages).toHaveBeenCalledWith('pipe-1'));
    await user.click(screen.getByRole('combobox', { name: /stage/i }));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('Lead')).toBeTruthy();
    expect(within(listbox).getByText('Qualified')).toBeTruthy();
  });

  it('keeps Save disabled until a stage is selected', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    mockGetStages.mockResolvedValueOnce({ data: STAGES });
    const user = userEvent.setup();
    renderPanel();

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: SAVE_RE })).toBeDisabled();

    await selectPipeline(user, 'Sales');
    expect(screen.getByRole('button', { name: SAVE_RE })).toBeDisabled();

    await selectStage(user, 'Qualified');
    await waitFor(() => expect(screen.getByRole('button', { name: SAVE_RE })).not.toBeDisabled());
  });

  it('emits onUpdate with stage_id + stage_name on save (backend contract)', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    mockGetStages.mockResolvedValueOnce({ data: STAGES });
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onUpdate, onClose });

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());
    await selectPipeline(user, 'Sales');
    await selectStage(user, 'Qualified');

    const saveBtn = screen.getByRole('button', { name: SAVE_RE });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    const saveCall = onUpdate.mock.calls.find(([, payload]) => payload?.stage_id === 'stage-2');
    expect(saveCall).toBeTruthy();
    expect(saveCall?.[0]).toBe('n1');
    expect(saveCall?.[1]).toMatchObject({
      pipeline_id: 'pipe-1',
      stage_id: 'stage-2',
      stage_name: 'Qualified',
    });
    expect(onClose).toHaveBeenCalled();
  });
});

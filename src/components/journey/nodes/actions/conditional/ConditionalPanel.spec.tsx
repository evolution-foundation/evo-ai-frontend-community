import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConditionalPanel } from './ConditionalPanel';
import { ConditionalNodeData } from './ConditionalNode';
import '@/i18n/config';

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: vi.fn(),
    getPipelineStages: vi.fn(),
  },
}));

import { pipelinesService } from '@/services/pipelines/pipelinesService';

const mockGetPipelines = pipelinesService.getPipelines as unknown as ReturnType<typeof vi.fn>;
const mockGetPipelineStages =
  pipelinesService.getPipelineStages as unknown as ReturnType<typeof vi.fn>;

const PIPELINE_STAGE_FIELD = '{{conversation.pipeline_stage_id}}';

const PIPELINES = [{ id: 'pipe-1', name: 'Sales' }];
const STAGES = [
  { id: 'stage-1', name: 'New' },
  { id: 'stage-2', name: 'Won' },
];

function dataWithStageCondition(value = ''): ConditionalNodeData {
  return {
    paths: [
      {
        id: 'path-1',
        name: 'Stage path',
        color: 'green',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'cond-1',
            type: 'custom',
            field: PIPELINE_STAGE_FIELD,
            operator: 'equals',
            value,
          },
        ],
      },
    ],
  } as ConditionalNodeData;
}

function dataWithContactCondition(): ConditionalNodeData {
  return {
    paths: [
      {
        id: 'path-1',
        name: 'Contact path',
        color: 'green',
        logicalOperator: 'AND',
        conditions: [
          {
            id: 'cond-1',
            type: 'contact',
            field: '{{contact.email}}',
            operator: 'equals',
            value: '',
          },
        ],
      },
    ],
  } as ConditionalNodeData;
}

// The value picker is one of several comboboxes in the panel; identify it by
// the stage placeholder it shows while no stage is selected.
function getStageTrigger(): HTMLElement {
  const trigger = screen
    .getAllByRole('combobox')
    .find(el => /select a stage|selecione um est/i.test(el.textContent || ''));
  if (!trigger) throw new Error('stage picker trigger not found');
  return trigger;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ConditionalPanel — pipeline stage picker', () => {
  it('loads pipelines + stages and renders them in the value picker when the field is the pipeline stage', async () => {
    mockGetPipelines.mockResolvedValue({ data: PIPELINES });
    mockGetPipelineStages.mockResolvedValue({ data: STAGES });
    const user = userEvent.setup();

    render(
      <ConditionalPanel
        nodeId="n1"
        data={dataWithStageCondition()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
        journeyId="j1"
      />,
    );

    await waitFor(() => expect(mockGetPipelineStages).toHaveBeenCalledWith('pipe-1'));

    await user.click(getStageTrigger());

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('[Sales] New')).toBeTruthy();
    expect(within(listbox).getByText('[Sales] Won')).toBeTruthy();
  });

  it('persists the selected stage id (not a raw typed value) on save', async () => {
    mockGetPipelines.mockResolvedValue({ data: PIPELINES });
    mockGetPipelineStages.mockResolvedValue({ data: STAGES });
    const onUpdate = vi.fn();
    const user = userEvent.setup();

    render(
      <ConditionalPanel
        nodeId="n1"
        data={dataWithStageCondition()}
        onUpdate={onUpdate}
        onClose={vi.fn()}
        journeyId="j1"
      />,
    );

    await waitFor(() => expect(mockGetPipelineStages).toHaveBeenCalled());

    await user.click(getStageTrigger());
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('[Sales] Won'));

    const saveBtn = await screen.findByRole('button', {
      name: /save|salvar|guardar|enregistrer|salva/i,
    });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    expect(onUpdate).toHaveBeenCalled();
    const [, updatedData] = onUpdate.mock.calls[0];
    expect(updatedData.paths[0].conditions[0]).toMatchObject({
      field: PIPELINE_STAGE_FIELD,
      operator: 'equals',
      value: 'stage-2',
      valueLabel: '[Sales] Won',
    });
  });

  it('does not fetch pipelines when no condition uses the pipeline stage field', async () => {
    mockGetPipelines.mockResolvedValue({ data: PIPELINES });

    render(
      <ConditionalPanel
        nodeId="n1"
        data={dataWithContactCondition()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
        journeyId="j1"
      />,
    );

    // Let any effects settle, then assert the lazy loader stayed gated.
    await waitFor(() => expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0));
    expect(mockGetPipelines).not.toHaveBeenCalled();
  });
});

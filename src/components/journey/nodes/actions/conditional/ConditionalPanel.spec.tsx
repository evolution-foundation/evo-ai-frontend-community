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

vi.mock('@/services/customAttributes/customAttributesService', () => ({
  customAttributesService: {
    getCustomAttributes: vi.fn(),
  },
}));

import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';

const mockGetPipelines = pipelinesService.getPipelines as unknown as ReturnType<typeof vi.fn>;
const mockGetPipelineStages =
  pipelinesService.getPipelineStages as unknown as ReturnType<typeof vi.fn>;
const mockGetCustomAttributes =
  customAttributesService.getCustomAttributes as unknown as ReturnType<typeof vi.fn>;

const PLAN_INTEREST_ATTR = {
  id: 'attr-1',
  attribute_key: 'plan_interest',
  attribute_display_name: 'Plan Interest',
  attribute_display_type: 'list',
  attribute_model: 'contact_attribute',
};

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

function dataWithContactCondition(field = '{{contact.email}}'): ConditionalNodeData {
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
            field,
            operator: 'equals',
            value: '',
          },
        ],
      },
    ],
  } as ConditionalNodeData;
}

// The field picker (VariableSelect) is the combobox showing the
// "Select a variable..." placeholder while no field is selected.
function getFieldTrigger(): HTMLElement {
  // The field picker shows a "Select variable…" style placeholder while empty;
  // match the `variable` stem across locales (variable/variável/variabile).
  const trigger = screen
    .getAllByRole('combobox')
    .find(el => /variabl|variáv|variabil/i.test(el.textContent || ''));
  if (!trigger) throw new Error('field picker trigger not found');
  return trigger;
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

beforeEach(() => {
  // Default: empty attribute list so the always-on fetch in the field picker
  // resolves to a promise in every test (per-test cases override this).
  mockGetCustomAttributes.mockResolvedValue({ data: [] });
});

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

describe('ConditionalPanel — contact custom attributes in the field picker', () => {
  it('lists fetched contact custom attributes and emits {{contact.customAttributes.<key>}} on select', async () => {
    mockGetCustomAttributes.mockResolvedValue({ data: [PLAN_INTEREST_ATTR] });
    const onUpdate = vi.fn();
    const user = userEvent.setup();

    render(
      <ConditionalPanel
        nodeId="n1"
        data={dataWithContactCondition('')}
        onUpdate={onUpdate}
        onClose={vi.fn()}
        journeyId="j1"
      />,
    );

    await waitFor(() =>
      expect(mockGetCustomAttributes).toHaveBeenCalledWith('contact_attribute'),
    );

    await user.click(getFieldTrigger());
    const listbox = await screen.findByRole('listbox');
    const option = within(listbox).getByText('Plan Interest');
    await user.click(option);

    const saveBtn = await screen.findByRole('button', {
      name: /save|salvar|guardar|enregistrer|salva/i,
    });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    expect(onUpdate).toHaveBeenCalled();
    const [, updatedData] = onUpdate.mock.calls[0];
    expect(updatedData.paths[0].conditions[0].field).toBe(
      '{{contact.customAttributes.plan_interest}}',
    );
  });

  it('degrades gracefully when the custom-attributes fetch fails (no crash, picker still opens)', async () => {
    mockGetCustomAttributes.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();

    render(
      <ConditionalPanel
        nodeId="n1"
        data={dataWithContactCondition('')}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
        journeyId="j1"
      />,
    );

    await waitFor(() => expect(mockGetCustomAttributes).toHaveBeenCalled());

    // Picker still opens and remains usable (system + journey variables): the
    // listbox renders options, and the failed-fetch Contact Attributes section
    // is simply absent (no "Plan Interest", no crash).
    await user.click(getFieldTrigger());
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getAllByRole('option').length).toBeGreaterThan(0);
    expect(within(listbox).queryByText('Plan Interest')).toBeNull();
  });
});

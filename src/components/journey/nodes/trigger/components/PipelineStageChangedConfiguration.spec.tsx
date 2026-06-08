import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PipelineStageChangedConfiguration,
  type PipelineStageChangedSelection,
} from './PipelineStageChangedConfiguration';
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
  { id: 'pipe-sales', name: 'Sales' },
  { id: 'pipe-onboarding', name: 'Onboarding' },
];
const SALES_STAGES = [
  { id: 'stage-lead', name: 'Lead' },
  { id: 'stage-qualified', name: 'Qualified' },
];

function Harness({ initial }: { initial?: PipelineStageChangedSelection }) {
  const [selection, setSelection] = useState<PipelineStageChangedSelection>(initial ?? {});
  return (
    <>
      <PipelineStageChangedConfiguration selection={selection} onChange={setSelection} />
      <div data-testid="state">{JSON.stringify(selection)}</div>
    </>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('PipelineStageChangedConfiguration', () => {
  it('loads pipelines on mount and renders them in the pipeline select (AC1 prep)', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    const user = userEvent.setup();

    render(<Harness />);

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());

    const pipelineCombo = screen.getByRole('combobox', { name: /pipeline/i });
    await user.click(pipelineCombo);

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('Sales')).toBeTruthy();
    expect(within(listbox).getByText('Onboarding')).toBeTruthy();
  });

  it('shows the empty-state info banner when no filters are configured (AC1)', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });

    render(<Harness />);

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());

    expect(
      await screen.findByText(
        /any pipeline stage transition|qualquer transi[çc][ãa]o|cualquier transici[óo]n|toute transition|qualsiasi transizione/i,
      ),
    ).toBeTruthy();
  });

  it('fetches stages when a pipeline is selected and lists them in From/To selects (AC1, AC2)', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    mockGetStages.mockResolvedValueOnce({ data: SALES_STAGES });
    const user = userEvent.setup();

    render(<Harness />);

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());
    await user.click(screen.getByRole('combobox', { name: /pipeline/i }));
    const pipelineList = await screen.findByRole('listbox');
    await user.click(within(pipelineList).getByText('Sales'));

    await waitFor(() => expect(mockGetStages).toHaveBeenCalledWith('pipe-sales'));

    await user.click(screen.getByRole('combobox', { name: /from stage|stage de origem|etapa de origen|étape d'origine|stage di origine/i }));
    const fromList = await screen.findByRole('listbox');
    expect(within(fromList).getByText('Lead')).toBeTruthy();
    expect(within(fromList).getByText('Qualified')).toBeTruthy();
  });

  it('emits onChange with pipelineId + pipelineName when pipeline is picked (AC1 contract)', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    mockGetStages.mockResolvedValueOnce({ data: SALES_STAGES });
    const user = userEvent.setup();

    render(<Harness />);
    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());

    await user.click(screen.getByRole('combobox', { name: /pipeline/i }));
    const list = await screen.findByRole('listbox');
    await user.click(within(list).getByText('Sales'));

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent || '{}');
      expect(state.pipelineId).toBe('pipe-sales');
      expect(state.pipelineName).toBe('Sales');
    });
  });

  it('emits onChange with fromStageId + fromStageName when a from-stage is picked', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    mockGetStages.mockResolvedValueOnce({ data: SALES_STAGES });
    const user = userEvent.setup();

    render(
      <Harness
        initial={{ pipelineId: 'pipe-sales', pipelineName: 'Sales' }}
      />,
    );
    await waitFor(() => expect(mockGetStages).toHaveBeenCalledWith('pipe-sales'));

    await user.click(screen.getByRole('combobox', { name: /from stage|stage de origem|etapa de origen|étape d'origine|stage di origine/i }));
    const list = await screen.findByRole('listbox');
    await user.click(within(list).getByText('Lead'));

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent || '{}');
      expect(state.fromStageId).toBe('stage-lead');
      expect(state.fromStageName).toBe('Lead');
      expect(state.pipelineId).toBe('pipe-sales');
    });
  });

  it('resets stage filters when the user switches pipelines (AC2 — no leakage)', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    mockGetStages.mockResolvedValueOnce({ data: SALES_STAGES });
    mockGetStages.mockResolvedValueOnce({ data: [] });
    const user = userEvent.setup();

    render(
      <Harness
        initial={{
          pipelineId: 'pipe-sales',
          pipelineName: 'Sales',
          fromStageId: 'stage-lead',
          fromStageName: 'Lead',
        }}
      />,
    );
    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());

    await user.click(screen.getByRole('combobox', { name: /pipeline/i }));
    const list = await screen.findByRole('listbox');
    await user.click(within(list).getByText('Onboarding'));

    await waitFor(() => {
      const state = JSON.parse(screen.getByTestId('state').textContent || '{}');
      expect(state.pipelineId).toBe('pipe-onboarding');
      expect(state.fromStageId).toBeUndefined();
      expect(state.fromStageName).toBeUndefined();
    });
  });

  it('renders the error banner when getPipelines fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPipelines.mockRejectedValueOnce(new Error('network down'));

    render(<Harness />);

    await waitFor(() => expect(consoleError).toHaveBeenCalled());

    expect(
      await screen.findByText(
        /could not load pipelines|n[ãa]o foi poss[íi]vel carregar|no se pudieron cargar|impossible de charger|impossibile caricare/i,
      ),
    ).toBeTruthy();

    consoleError.mockRestore();
  });
});

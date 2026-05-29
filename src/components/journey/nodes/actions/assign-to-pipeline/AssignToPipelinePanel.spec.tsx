import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssignToPipelinePanel } from './AssignToPipelinePanel';
import { AssignToPipelineNodeData } from './AssignToPipelineNode';
import '@/i18n/config';

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: vi.fn(),
  },
}));

import { pipelinesService } from '@/services/pipelines/pipelinesService';

const mockGetPipelines = pipelinesService.getPipelines as unknown as ReturnType<typeof vi.fn>;

const PIPELINES = [
  { id: 'pipe-1', name: 'Sales' },
  { id: 'pipe-2', name: 'Onboarding' },
];

function makeData(overrides: Partial<AssignToPipelineNodeData> = {}): AssignToPipelineNodeData {
  return {
    label: 'Assign to Pipeline',
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('AssignToPipelinePanel', () => {
  it('shows the loading placeholder while pipelines are fetching', async () => {
    let resolveFn: (value: unknown) => void = () => {};
    mockGetPipelines.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFn = resolve;
        }),
    );

    render(
      <AssignToPipelinePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox')).toBeTruthy();

    resolveFn({ data: PIPELINES });
    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());
  });

  it('renders the pipelines returned by the service inside the select', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    const user = userEvent.setup();

    render(
      <AssignToPipelinePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());
    await user.click(screen.getByRole('combobox'));

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('Sales')).toBeTruthy();
    expect(within(listbox).getByText('Onboarding')).toBeTruthy();
  });

  it('keeps Save disabled until a pipeline is selected, then enables it', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    const user = userEvent.setup();

    render(
      <AssignToPipelinePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());

    const saveBtn = screen.getByRole('button', { name: /save|salvar|guardar|enregistrer|salva/i });
    expect(saveBtn).toBeDisabled();

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Sales'));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /save|salvar|guardar|enregistrer|salva/i }),
      ).not.toBeDisabled(),
    );
  });

  it('emits onUpdate with pipeline_id + pipeline_name on save (AC1 contract)', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: PIPELINES });
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <AssignToPipelinePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={onUpdate}
        onClose={onClose}
      />,
    );

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Onboarding'));

    const saveBtn = await screen.findByRole('button', {
      name: /save|salvar|guardar|enregistrer|salva/i,
    });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    const saveCall = onUpdate.mock.calls.find(
      ([, payload]) => payload?.pipeline_id === 'pipe-2',
    );
    expect(saveCall).toBeTruthy();
    expect(saveCall?.[0]).toBe('n1');
    expect(saveCall?.[1]).toMatchObject({
      pipeline_id: 'pipe-2',
      pipeline_name: 'Onboarding',
      formDataOptions: { pipelines: PIPELINES },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the empty-state message when zero pipelines are returned', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: [] });

    render(
      <AssignToPipelinePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());

    expect(
      await screen.findByText(
        /no pipelines found|nenhuma pipeline|sin pipelines|aucune pipeline|nessuna pipeline/i,
      ),
    ).toBeTruthy();
  });

  it('renders an error banner when the fetch fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPipelines.mockRejectedValueOnce(new Error('boom'));

    render(
      <AssignToPipelinePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(consoleError).toHaveBeenCalled());

    expect(
      await screen.findByText(
        /could not load pipelines|n[ãa]o foi poss[íi]vel carregar|no se pudieron cargar|impossible de charger|impossibile caricare/i,
      ),
    ).toBeTruthy();

    consoleError.mockRestore();
  });
});

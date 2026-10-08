import i18n from '@/i18n/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PipelineKanban from './PipelineKanban';

// A deep link to a pipeline the user cannot open used to fall through to a nameless,
// empty board. Forbidden and missing pipelines now get their own explicit state.
const getPipeline = vi.fn();
const toastError = vi.fn();

vi.mock('@/services/pipelines', () => ({
  pipelinesService: {
    getPipeline: (...args: unknown[]) => getPipeline(...args),
    getPipelines: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/hooks/usePipelineBoardColumns', () => ({
  boardFilterParams: () => ({}),
  usePipelineBoardColumns: () => ({
    columns: {},
    loadMore: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
    moveItem: vi.fn(),
  }),
}));

vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: () => ({ agents: [], fetchAgents: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={['/pipelines/p-1']}>
      <Routes>
        <Route path="/pipelines/:pipelineId" element={<PipelineKanban />} />
        <Route path="/pipelines" element={<div>pipelines-list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PipelineKanban load failures', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt-BR');
    getPipeline.mockReset();
    toastError.mockReset();
  });

  it('shows the no-access state on 403, without the board or an error toast', async () => {
    getPipeline.mockRejectedValue(httpError(403));
    renderBoard();

    expect(await screen.findByText('Sem acesso a este pipeline')).toBeInTheDocument();
    expect(screen.queryByText('Pipeline não encontrado')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buscar por nome, telefone, email...')).not.toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows the not-found state on 404', async () => {
    getPipeline.mockRejectedValue(httpError(404));
    renderBoard();

    expect(await screen.findByText('Pipeline não encontrado')).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('keeps the generic error toast for any other failure', async () => {
    getPipeline.mockRejectedValue(httpError(500));
    renderBoard();

    await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith('Erro ao carregar dados do pipeline'));
    expect(await screen.findByPlaceholderText('Buscar por nome, telefone, email...')).toBeInTheDocument();
    expect(screen.queryByText('Sem acesso a este pipeline')).not.toBeInTheDocument();
    expect(screen.queryByText('Pipeline não encontrado')).not.toBeInTheDocument();
  });

  it('takes the user back to the pipelines list', async () => {
    getPipeline.mockRejectedValue(httpError(403));
    renderBoard();

    await userEvent.click(await screen.findByRole('button', { name: 'Voltar aos pipelines' }));

    expect(await screen.findByText('pipelines-list')).toBeInTheDocument();
  });
});

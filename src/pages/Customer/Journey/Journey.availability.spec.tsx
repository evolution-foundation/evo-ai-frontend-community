import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JourneyPage from './Journey';
const state = vi.hoisted(() => ({ configured: false, loading: false, get: vi.fn() }));
vi.mock('@/hooks/useEvoFlow', () => ({ useEvoFlow: () => state }));
vi.mock('@/contexts/PermissionsContext', () => ({ usePermissions: () => ({ can: () => true, isReady: true }) }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('../../../services', () => ({ journeyService: { getJourneys: state.get } }));
vi.mock('@/components/journey/JourneyModal', () => ({ default: () => null }));
vi.mock('../../../components/base/BaseHeader', () => ({ default: () => <h1>Jornadas ativas</h1> }));
vi.mock('../../../components/base/BaseTable', () => ({ default: () => <div>Lista</div> }));
describe('journey direct access', () => {
  beforeEach(() => { state.get.mockReset().mockResolvedValue({ data: [] }); state.loading = false; state.configured = false; });
  it('shows neutral unavailable state and never requests Flow when absent', () => {
    render(<MemoryRouter><JourneyPage /></MemoryRouter>);
    expect(screen.getByText('Jornadas indisponíveis nesta instalação')).toBeInTheDocument();
    expect(screen.getByText('Voltar')).toBeInTheDocument();
    expect(screen.queryByText(/ainda não está configurado/)).toBeNull();
    expect(state.get).not.toHaveBeenCalled();
  });
  it('waits for configuration before displaying availability', () => {
    state.loading = true;
    render(<MemoryRouter><JourneyPage /></MemoryRouter>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(state.get).not.toHaveBeenCalled();
  });
  it('shows connection failure with retry instead of unavailable configuration', async () => {
    state.configured = true; state.get.mockRejectedValueOnce(new Error('offline'));
    render(<MemoryRouter><JourneyPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar');
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
    expect(screen.queryByText('Jornadas indisponíveis nesta instalação')).toBeNull();
  });
  it('loads journeys when configured', async () => {
    state.configured = true;
    render(<MemoryRouter><JourneyPage /></MemoryRouter>);
    await waitFor(() => expect(state.get).toHaveBeenCalledOnce());
    expect(screen.getByText('Jornadas ativas')).toBeInTheDocument();
    expect(screen.queryByText('Jornadas indisponíveis nesta instalação')).toBeNull();
  });
});

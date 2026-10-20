import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmhOperations } from './AmhOperations';
import type { Operations } from './api';
afterEach(cleanup);
const snapshot: Operations = {
  at: '2026-10-20T12:00:00Z',
  outbound_enabled: false,
  state: 'paused',
  reception_enabled: true,
  inbound: {
    available: true,
    counts: { pending: 2 },
    recent: [
      {
        id: 'qa-receipt',
        state: 'pending',
        created_at: '2026-10-20T11:00:00Z',
        updated_at: '2026-10-20T11:00:00Z',
      },
    ],
  },
  limit: 50,
  activation: 'blocked_pending_controlled_validation',
  private_reply_button: 'pending_real_contract_validation',
  mautic: 'not_queried',
  rules: [
    {
      id: 'qa-rule',
      name: 'QA AMH',
      state: 'paused',
      version: 1,
      draft_changed: true,
      scope: { account: 'qa-account', ad: 'qa-ad' },
      material: 'amh',
      keywords: ['AMH'],
      preview: 'Oi! Acesse {{link}}.',
      simulations: 1,
      last_simulation: { outcome: 'uncertain', at: '2026-10-20T11:00:00Z', outbound_calls: 0 },
    },
  ],
};
describe('AMH operations', () => {
  it('separates real pending events from inert simulation, filters rules, and cannot activate', async () => {
    const api = { get: vi.fn().mockResolvedValue(snapshot) };
    render(<AmhOperations api={api} />);
    await screen.findByText('QA AMH');
    expect(screen.getByText(/Última: Incerto/)).toHaveTextContent('Chamadas externas: 0');
    expect(screen.getByText('Recibo: qa-receipt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ligar automação' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ligar automação' }));
    expect(api.get).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Buscar regra, conta, anúncio ou publicação'), {
      target: { value: 'qa-ad' },
    });
    expect(screen.getByText('QA AMH')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar material'), {
      target: { value: 'amh-consultorio' },
    });
    expect(screen.queryByText('QA AMH')).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhuma regra encontrada/)).toBeInTheDocument();
  });
  it('keeps a timestamped previous snapshot and a visible warning after failed refresh', async () => {
    const api = {
      get: vi
        .fn()
        .mockResolvedValueOnce(snapshot)
        .mockRejectedValueOnce(new Error('secret must not render')),
    };
    render(<AmhOperations api={api} />);
    await screen.findByText('QA AMH');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Atualizar acompanhamento' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar acompanhamento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('última consulta');
    expect(screen.getByText('QA AMH')).toBeInTheDocument();
    expect(screen.queryByText('secret must not render')).not.toBeInTheDocument();
  });
  it('does not turn unavailable configuration into a healthy empty queue', async () => {
    const api = {
      get: vi
        .fn()
        .mockResolvedValue({ ...snapshot, inbound: { available: false, counts: {}, recent: [] } }),
    };
    render(<AmhOperations api={api} />);
    expect(await screen.findByText(/Eventos indisponíveis/)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum evento na inbox/)).not.toBeInTheDocument();
  });
  it('offers retry after initial API failure without rendering invented counters', async () => {
    const api = {
      get: vi.fn().mockRejectedValueOnce(new Error('Denied')).mockResolvedValueOnce(snapshot),
    };
    render(<AmhOperations api={api} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar');
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar acompanhamento' }));
    await screen.findByText('QA AMH');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

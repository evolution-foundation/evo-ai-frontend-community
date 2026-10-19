import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmhVisualProof } from './AmhVisualProof';
import { initialGraph, type Proof } from './contract';
import type { ProofApi } from './api';
vi.mock('@xyflow/react', async importOriginal => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  ReactFlow: () => <div>Canvas</div>,
}));
afterEach(cleanup);
function setup() {
  const proof: Proof = {
    id: 'qa',
    name: 'QA',
    draft: initialGraph(),
    versions: [],
    ledger: [],
    lock_version: 0,
    state: 'paused',
    outbound_enabled: false,
  };
  const api: ProofApi = {
    list: vi.fn().mockResolvedValue([proof]),
    get: vi.fn().mockResolvedValue(proof),
    create: vi.fn().mockResolvedValue(proof),
    save: vi.fn().mockResolvedValue({ ...proof, lock_version: 1 }),
    publish: vi.fn().mockResolvedValue({
      ...proof,
      versions: [
        {
          id: 'v1',
          number: 1,
          graph: initialGraph(),
          at: '2026-10-19T17:00:00Z',
          digest: 'qa',
          actor: 'qa',
          state: 'paused',
        },
      ],
    }),
    simulate: vi.fn(),
  };
  return { proof, api };
}
describe('AMH visual proof', () => {
  it('saves editable parameters through the server and reopens before publishing', async () => {
    const { api } = setup();
    render(<AmhVisualProof api={api} permissions={{ create: true, edit: true, publish: true }} />);
    fireEvent.change(screen.getByLabelText('Palavras-chave'), {
      target: { value: 'AMH\nCONSULTÓRIO' },
    });
    expect(screen.getByRole('button', { name: 'Publicar versão de simulação' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
    expect(vi.mocked(api.create).mock.calls[0][1].nodes[2].data.keywords).toEqual([
      'AMH',
      'CONSULTÓRIO',
    ]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reabrir do CRM' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir do CRM' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('qa'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Publicar versão de simulação' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Publicar versão de simulação' }));
    await waitFor(() => expect(api.publish).toHaveBeenCalledOnce());
    expect(screen.getByText('Pausada · saídas bloqueadas')).toBeInTheDocument();
  });
  it('does not offer editing or publication to a reader', async () => {
    const { api } = setup();
    render(
      <AmhVisualProof api={api} permissions={{ create: false, edit: false, publish: false }} />,
    );
    await waitFor(() => expect(api.list).toHaveBeenCalled());
    expect(screen.getByLabelText('Palavras-chave')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publicar versão de simulação' })).toBeDisabled();
    expect(api.create).not.toHaveBeenCalled();
  });
  it('preserves unsaved parameters when the API rejects a stale edit', async () => {
    const { api } = setup();
    vi.mocked(api.create).mockRejectedValue(
      new Error('Outra edição foi salva. Reabra antes de alterar.'),
    );
    render(<AmhVisualProof api={api} permissions={{ create: true, edit: true, publish: true }} />);
    fireEvent.change(screen.getByLabelText('Palavras-chave'), { target: { value: 'MATERIAL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Outra edição foi salva'),
    );
    expect(screen.getByLabelText('Palavras-chave')).toHaveValue('MATERIAL');
    expect(screen.getByRole('button', { name: 'Publicar versão de simulação' })).toBeDisabled();
  });
});

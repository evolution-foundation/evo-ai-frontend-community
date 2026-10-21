import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AmhAutomation } from './AmhAutomation';
import { keywordMatches } from './keywordMatches';
import { initialGraph } from './contract';
import type { AutomationApi } from './automationApi';
const permissions = { create: true, edit: true, publish: true };
function setup(
  commentLikeStatus: 'connection_required' | 'configured' | 'disabled' = 'configured',
) {
  const api = {
    catalog: vi.fn().mockResolvedValue({
      account: { id: '90001', label: 'Conta QA' },
      publications: [{ id: '90004', label: 'O AMH na prática', source: 'instagram' }],
      execution_available: false,
      test_available: false,
      comment_like_status: commentLikeStatus,
    }),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    save: vi.fn(),
    get: vi.fn(),
    publish: vi.fn(),
    simulate: vi.fn(),
    activate: vi.fn(),
    testEvents: vi.fn(),
    testReply: vi.fn(),
    deliveries: vi.fn(),
  } satisfies AutomationApi;
  render(
    <MemoryRouter>
      <AmhAutomation permissions={permissions} api={api} />
    </MemoryRouter>,
  );
  return api;
}
describe('Instagram automation product', () => {
  it('recognizes full Unicode words, accents, phrases and regex characters without matching substrings', () => {
    const rule = initialGraph().nodes[2].data;
    expect(keywordMatches('Quero ámh!', rule)).toBe(true);
    expect(keywordMatches('XAMH', rule)).toBe(false);
    expect(keywordMatches('AMH_extra', rule)).toBe(false);
    expect(keywordMatches('C++!', { ...rule, keywords: ['C++'] })).toBe(true);
    expect(keywordMatches('XAMH', { ...rule, mode: 'contains' })).toBe(true);
    expect(keywordMatches('quero MATERIAL AGORA!', { ...rule, keywords: ['material agora'] })).toBe(
      true,
    );
  });
  it('guides a publication, keyword alternatives, preview and persists actual account scope', async () => {
    const api = setup();
    await screen.findByText('O AMH na prática');
    fireEvent.change(screen.getByLabelText('Publicação ou anúncio'), {
      target: { value: '90004' },
    });
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByText('✓ Este comentário aciona o convite')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Palavras-chave'), { target: { value: 'material' } });
    fireEvent.click(screen.getByText('Adicionar'));
    fireEvent.change(screen.getByLabelText('Experimente um comentário'), {
      target: { value: 'XAMH' },
    });
    expect(screen.getByText('Este comentário não aciona o convite')).toBeTruthy();
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByLabelText('Mensagem após o clique')).toBeTruthy();
    fireEvent.click(screen.getByText('Salvar rascunho •'));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    const graph = api.create.mock.calls[0][1];
    expect(graph.nodes.find(n => n.id === 'scope')?.data).toMatchObject({
      account: '90001',
      media: '90004',
    });
    expect(graph.nodes.find(n => n.id === 'keyword')?.data.keywords).toEqual(['AMH', 'material']);
    expect(api.testReply).not.toHaveBeenCalled();
  });
  it('keeps the material out of the initial preview until the confirmation button is clicked', async () => {
    const api = setup();
    await screen.findByText('O AMH na prática');
    expect(screen.queryByText('Acessar material')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pode enviar', exact: true }));
    expect(screen.getByRole('button', { name: 'Acessar material', exact: true })).toBeTruthy();
    expect(api.testReply).not.toHaveBeenCalled();
    expect(api.activate).not.toHaveBeenCalled();
  });
  it('explains the missing Facebook authorization while keeping the invitation configuration usable', async () => {
    setup('connection_required');
    expect(
      await screen.findByText(/Para curtir comentários, autorize a conexão Facebook/),
    ).toBeTruthy();
    expect(screen.getByLabelText('Publicação ou anúncio')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pode enviar', exact: true })).toBeTruthy();
  });
});

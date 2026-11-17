import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WhatsappInboxesSettings from './WhatsappInboxesSettings';

const mocks = vi.hoisted(() => ({ getWhatsappInboxes: vi.fn(), saveWhatsappInboxes: vi.fn(), can: vi.fn() }));
vi.mock('@/services/pipelines', () => ({ pipelinesService: mocks }));
vi.mock('@/contexts/PermissionsContext', () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock('@/hooks/useLanguage', async () => { const { pipelinesT } = await import('@/test/pipelinesI18n'); return { useLanguage: () => ({ t: pipelinesT }) }; });
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const inbox = (id: string, name: string, connected = true) => ({ id, name, phone_number: `+55119${id}`, connected });
const payload = (allowedIds: string[], def: string | null) => ({
  pipeline_id: 'p1', configured: allowedIds.length > 0, default_inbox_id: def,
  allowed: allowedIds.map(id => inbox(id, `Linha ${id}`)),
  eligible: [inbox('1', 'Linha 1'), inbox('2', 'Linha 2', false)],
});

describe('WhatsappInboxesSettings', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.can.mockReturnValue(true); });

  it('warns when nothing is authorized and saves the chosen numbers with a default', async () => {
    mocks.getWhatsappInboxes.mockResolvedValue(payload([], null));
    mocks.saveWhatsappInboxes.mockResolvedValue(payload(['1'], '1'));
    render(<WhatsappInboxesSettings pipelineId="p1" />);
    expect(await screen.findByText(/Nenhum número autorizado/)).toBeInTheDocument();
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Autorizar Linha 1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar números' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Salvar números' }));
    await waitFor(() => expect(mocks.saveWhatsappInboxes).toHaveBeenCalledWith('p1', ['1'], '1'));
    await waitFor(() => expect(screen.queryByText(/Nenhum número autorizado/)).toBeNull());
  });

  it('is read-only without pipelines.update (no save button, switches disabled)', async () => {
    mocks.can.mockReturnValue(false);
    mocks.getWhatsappInboxes.mockResolvedValue(payload(['1'], '1'));
    render(<WhatsappInboxesSettings pipelineId="p1" />);
    expect(await screen.findByText(/não alterar estes números/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Autorizar Linha 1' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar números' })).toBeNull();
    expect(mocks.can).toHaveBeenCalledWith('pipelines', 'update');
  });

  it('moves the default when the default number is unchecked', async () => {
    mocks.getWhatsappInboxes.mockResolvedValue({ ...payload(['1', '2'], '1') });
    mocks.saveWhatsappInboxes.mockResolvedValue(payload(['2'], '2'));
    render(<WhatsappInboxesSettings pipelineId="p1" />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Autorizar Linha 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar números' }));
    await waitFor(() => expect(mocks.saveWhatsappInboxes).toHaveBeenCalledWith('p1', ['2'], '2'));
  });
});

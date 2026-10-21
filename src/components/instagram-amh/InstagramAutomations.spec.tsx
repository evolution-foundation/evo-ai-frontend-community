import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { InstagramAutomations } from './InstagramAutomations';
import { automationApi } from './automationApi';

describe('Instagram automation overview', () => {
  it('shows actual rule states, filters test flows and opens a saved configuration', async () => {
    const api = { ...automationApi,
      list: vi.fn().mockResolvedValue([
        { id: 'qa-one', name: 'Material principal', state: 'test', version: 2, material: 'amh', keywords: ['AMH'], scope: { media: '90004' } },
        { id: 'qa-two', name: 'Outro conteúdo', state: 'paused', material: 'amh-consultorio', scope: { media: '90005' } },
      ]),
      catalog: vi.fn().mockResolvedValue({ account: { id: '90001', label: '@conta_qa' }, publications: [{ id: '90004', label: 'Conteúdo AMH', source: 'instagram' }], execution_available: true, test_available: true }),
      get: vi.fn().mockRejectedValue(new Error('QA read only')),
    };
    render(<MemoryRouter><InstagramAutomations permissions={{ create: true, edit: true, publish: true }} api={api} /></MemoryRouter>);
    expect(await screen.findByText('Material principal')).toBeTruthy();
    expect(screen.getByText('Nenhuma automação comercial ativa')).toBeTruthy();
    expect(screen.getByText('@conta_qa')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'test' } });
    expect(screen.queryByText('Outro conteúdo')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir configuração' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('qa-one'));
    await screen.findByText('QA read only');
  });
});

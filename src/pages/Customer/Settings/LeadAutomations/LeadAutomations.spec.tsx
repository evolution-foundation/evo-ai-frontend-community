import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/config';
import i18n from '@/i18n/config';
import LeadAutomations, { LeadAutomationsScreen } from './LeadAutomations';
import { leadAutomations as service, type Rule } from '@/services/leadAutomations/service';
const mocks = vi.hoisted(() => ({
  auth: { user: { role: { key: 'administrator' } }, isLoading: false },
  permissions: { can: () => true, isReady: true, loading: false },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/contexts/PermissionsContext', () => ({ usePermissions: () => mocks.permissions }));
vi.mock('@/services/leadAutomations/service', () => ({
  leadAutomations: {
    list: vi.fn(),
    save: vi.fn(),
    activation: vi.fn(),
    remove: vi.fn(),
    test: vi.fn(),
    runs: vi.fn(),
    token: vi.fn(),
  },
}));
vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: vi.fn().mockResolvedValue({
      data: [
        { id: 'p1', name: 'Pipeline sintética', stages: [{ id: 's1', name: 'Novo lead' }] },
        { id: 'p2', name: 'Outra pipeline' },
      ],
    }),
    getPipelineStages: vi.fn().mockImplementation((id: string) =>
      Promise.resolve({
        data: [{ id: id === 'p1' ? 's1' : 's2', name: id === 'p1' ? 'Novo lead' : 'Outra etapa' }],
      }),
    ),
  },
}));
vi.mock('@/services/users/usersService', () => ({
  default: {
    getUsers: vi.fn().mockResolvedValue({ data: [{ id: 'u1', name: 'Responsável sintético' }] }),
  },
}));
vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn().mockResolvedValue({ data: [{ id: 'l1', title: 'Novo' }] }) },
}));
vi.mock('@/services/channels/inboxesService', () => ({
  default: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'i1',
          name: 'Caixa sintética',
          provider: 'evolution',
          provider_config: { instance_name: 'sintetica' },
        },
      ],
    }),
  },
}));
const rule: Rule = {
  id: 'r1',
  revision: 4,
  activated_at: '2026-11-14T10:00:00Z',
  has_intake_token: true,
  name: 'Aquisição sintética',
  active: true,
  pipeline_id: 'p1',
  pipeline_stage_id: 's1',
  owner_id: null,
  label_ids: [],
  title_template: 'Novo lead · {{contact_name}}',
  conditions: {
    version: 1,
    operator: 'any',
    ctwa: { enabled: true, inbox_id: 'i1', instance_name: 'sintetica' },
    domain: { enabled: true, host: 'co.example.com' },
  },
};
const page = <T,>(data: T[]) => ({
  data,
  meta: { pagination: { page: 1, total_pages: 1, total_count: data.length } },
});
const mount = () =>
  render(
    <MemoryRouter>
      <LeadAutomationsScreen />
    </MemoryRouter>,
  );
beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('pt-BR');
  mocks.auth.user.role.key = 'administrator';
  vi.mocked(service.list).mockResolvedValue(page([rule]));
  vi.mocked(service.runs).mockResolvedValue(page([]));
  vi.mocked(service.save).mockResolvedValue(rule);
});
describe('Automações de leads', () => {
  it('restringe acesso direto a administrador e não busca dados', () => {
    mocks.auth.user.role.key = 'agent';
    render(<LeadAutomations />);
    expect(screen.getByRole('alert')).toHaveTextContent('restrito');
    expect(service.list).not.toHaveBeenCalled();
  });
  it('aceita administrador da instalação', async () => {
    mocks.auth.user.role.key = 'super_admin';
    render(
      <MemoryRouter>
        <LeadAutomations />
      </MemoryRouter>,
    );
    expect(await screen.findByText(rule.name)).toBeInTheDocument();
  });
  it('lista fontes, destino e estado', async () => {
    mount();
    expect(await screen.findByText(rule.name)).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText(/Pipeline sintética · Novo lead/)).toBeInTheDocument();
  });
  it('cria inativa com caixa real e etapa dependente', async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText(rule.name);
    await user.click(screen.getByRole('button', { name: 'Criar regra' }));
    await user.type(screen.getByLabelText('Nome da regra'), 'Regra nova');
    await user.click(screen.getByLabelText('Anúncio de WhatsApp (CTWA)'));
    await user.selectOptions(screen.getByLabelText('Caixa de WhatsApp'), 'i1');
    expect(screen.getByLabelText('Instância')).toHaveValue('sintetica');
    await user.selectOptions(screen.getByLabelText('Pipeline'), 'p1');
    await waitFor(() => expect(screen.getByLabelText('Etapa inicial')).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText('Etapa inicial'), 's1');
    await user.selectOptions(screen.getByLabelText('Responsável (opcional)'), 'u1');
    await user.click(screen.getByRole('button', { name: 'Salvar regra' }));
    await waitFor(() =>
      expect(service.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Regra nova',
          active: false,
          pipeline_id: 'p1',
          pipeline_stage_id: 's1',
          owner_id: 'u1',
          conditions: expect.objectContaining({
            ctwa: { enabled: true, inbox_id: 'i1', instance_name: 'sintetica' },
          }),
        }),
        undefined,
      ),
    );
  });
  it('limpa a etapa ao trocar pipeline e mantém rascunho no conflito', async () => {
    const user = userEvent.setup();
    const { AxiosError } = await import('axios');
    vi.mocked(service.save).mockRejectedValue(
      new AxiosError('conflict', '409', undefined, undefined, { status: 409 } as never),
    );
    mount();
    await screen.findByText(rule.name);
    await user.click(screen.getByRole('button', { name: 'Editar regra' }));
    await waitFor(() => expect(screen.getByLabelText('Etapa inicial')).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText('Pipeline'), 'p2');
    expect(screen.getByLabelText('Etapa inicial')).toHaveValue('');
    await waitFor(() => expect(screen.getByLabelText('Etapa inicial')).not.toBeDisabled());
    await user.selectOptions(screen.getByLabelText('Etapa inicial'), 's2');
    await user.click(screen.getByRole('button', { name: 'Salvar regra' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('rascunho');
    expect(screen.getByLabelText('Nome da regra')).toHaveValue(rule.name);
  });
  it('testa a regra salva sem chamar criação', async () => {
    vi.mocked(service.test).mockResolvedValue({
      matched: true,
      reasons: [],
      action: { pipeline_id: 'p1', pipeline_stage_id: 's1', title: 'Contato sintético' },
      dry_run: true,
    });
    const user = userEvent.setup();
    mount();
    await screen.findByText(rule.name);
    await user.click(screen.getByRole('button', { name: 'Testar regra' }));
    await user.click(screen.getByRole('button', { name: 'Testar regra' }));
    expect(await screen.findByText('Criaria negócio')).toBeInTheDocument();
    expect(service.test).toHaveBeenCalledWith('r1', expect.objectContaining({ source: 'ctwa' }));
    expect(service.save).not.toHaveBeenCalled();
  });
  it('mostra execuções e filtra falhas', async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText(rule.name);
    vi.mocked(service.runs).mockResolvedValue(
      page([
        {
          id: 'run',
          status: 'created',
          source: 'domain',
          reason_code: 'created',
          contact_id: 'c1',
          deal_id: 'd1',
          executed_at: new Date().toISOString(),
        },
      ]),
    );
    await user.click(screen.getByRole('button', { name: 'Últimas execuções' }));
    expect(await screen.findByRole('link', { name: 'Abrir negócio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir negócio' })).toHaveAttribute(
      'href',
      '/pipelines/p1/deals/d1',
    );
    await user.selectOptions(screen.getByLabelText('Filtrar resultado'), 'error');
    await waitFor(() => expect(service.runs).toHaveBeenLastCalledWith('r1', 1, 'error'));
  });
  it('usa a origem atual no endpoint quando a URL da API não está definida', async () => {
    vi.stubEnv('VITE_API_URL', '');
    try {
      const user = userEvent.setup();
      mount();
      await user.click(await screen.findByRole('button', { name: 'Integração do site' }));
      expect(screen.getByText(`${window.location.origin}/public/lead_automation_rules/r1/leads`)).toBeInTheDocument();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('renova token com revisão e apaga ao sair', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(service.token).mockResolvedValue({ ...rule, revision: 5, token: 'synthetic-only' });
    vi.mocked(service.list).mockResolvedValue(page([{ ...rule, revision: 5 }]));
    const user = userEvent.setup();
    mount();
    await screen.findByText(rule.name);
    await user.click(screen.getByRole('button', { name: 'Integração do site' }));
    await user.click(screen.getByRole('button', { name: 'Renovar token' }));
    expect(await screen.findByText('synthetic-only')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(screen.queryByText('synthetic-only')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desativar', exact: true }));
    await waitFor(() =>
      expect(service.activation).toHaveBeenCalledWith(expect.objectContaining({ revision: 5 })),
    );
  });
  it('exclui com confirmação e revisão da regra', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    mount();
    await screen.findByText(rule.name);
    await user.click(screen.getByRole('button', { name: 'Editar regra' }));
    await user.click(screen.getByRole('button', { name: 'Excluir regra' }));
    await waitFor(() => expect(service.remove).toHaveBeenCalledWith(rule));
  });
  it('mostra estado vazio', async () => {
    vi.mocked(service.list).mockResolvedValue(page([]));
    mount();
    expect(await screen.findByText(/Nenhuma regra criada/)).toBeInTheDocument();
  });
  it('mostra erro e permite recarregar', async () => {
    vi.mocked(service.list).mockRejectedValueOnce(new Error('offline'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível');
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }));
    expect(await screen.findByText(rule.name)).toBeInTheDocument();
  });
  it('mostra carregamento enquanto a lista aguarda resposta', () => {
    vi.mocked(service.list).mockReturnValue(new Promise(() => {}));
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });
});

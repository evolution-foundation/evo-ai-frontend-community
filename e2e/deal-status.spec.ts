import { expect, test, type Page, type Route } from '@playwright/test';

// R1 (repaginada 2): status do negócio aberto/ganho/perdido no quadro e no modal. API simulada com dados sintéticos.
const ok = (data: unknown) => ({ success: true, data, meta: {}, message: '' });
const json = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
const shots = process.env.E2E_SHOTS;

type Status = 'open' | 'won' | 'lost';
type Deal = Record<string, unknown> & { id: string; deal_status: Status; stage_id: string; title: string; value: number; lost_reason?: string | null; completed_at?: number | null };

async function installApi(page: Page) {
  const mk = (id: string, title: string, stage: string, status: Status, value: number, extra: Partial<Deal> = {}): Deal => ({
    id, deal_id: id, pipeline_id: 'pipeline-1', pipeline_stage_id: stage, stage_id: stage, title, value, currency: 'BRL', notes: '',
    custom_fields: {}, owner: null, primary_contact: null, contacts: [], conversations: [], labels: [], files: [], history: [], tasks: [], scheduled_actions: [],
    contact_count: 0, conversation_count: 0, file_count: 0, is_lead: false, item_id: id, type: 'deal', entered_at: 1788091200,
    created_at: '2026-08-30T10:00:00Z', updated_at: '2026-08-30T10:00:00Z', deal_status: status, lost_reason: null, completed_at: status === 'open' ? null : 1788177600,
    tasks_info: { pending_count: 0, overdue_count: 0, due_soon_count: 0, completed_count: 0, total_count: 0 }, ...extra,
  });
  const deals: Deal[] = [
    mk('deal-open', 'Negócio aberto', 'stage-1', 'open', 1000),
    mk('deal-open-2', 'Outro aberto', 'stage-2', 'open', 500),
    mk('deal-won', 'Negócio ganho', 'stage-2', 'won', 3000),
    mk('deal-lost', 'Negócio perdido', 'stage-1', 'lost', 700, { lost_reason: 'Sem orçamento' }),
  ];
  const requests: string[] = [];
  const item = (d: Deal) => ({ ...d, contact: null, conversation: null, services_info: { has_services: false, total_value: d.value, formatted_total: '' } });
  const pipeline = (filter: string) => {
    const visible = deals.filter(d => filter === 'all' || d.deal_status === (filter === 'won' || filter === 'lost' ? filter : 'open'));
    const stage = (id: string, name: string) => { const items = visible.filter(d => d.stage_id === id).map(item); return { id, name, color: '#7c3aed', item_count: items.length, total_value: items.reduce((sum, d) => sum + Number(d.value), 0), items }; };
    return {
      id: 'pipeline-1', name: 'Pipeline Comercial', description: '', custom_fields: {}, services_info: { total_value: 0 },
      deal_status_counts: { open: deals.filter(d => d.deal_status === 'open').length, won: deals.filter(d => d.deal_status === 'won').length, lost: deals.filter(d => d.deal_status === 'lost').length },
      stages: [stage('stage-1', 'Novo lead'), stage('stage-2', 'Proposta')],
    };
  };

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/undefined/, '');
    const method = request.method();
    if (path.endsWith('/auth/validate')) return json(route, ok({ user: { id: 'user-1', name: 'Usuário E2E', email: 'e2e@example.com', account_id: 'account-1', account: { id: 'account-1', name: 'Conta E2E' }, role: 'administrator', ui_settings: {} }, token: { access_token: 'e2e-token' } }));
    if (path.endsWith('/resource_actions')) return json(route, ok({ resources: { pipelines: ['read', 'create', 'update'] }, all_permissions: [] }));
    if (path.endsWith('/permissions')) return json(route, ok({ permissions: ['pipelines.read', 'pipelines.create', 'pipelines.update'] }));
    if (path.endsWith('/user_tours')) return json(route, ok([{ tour_key: 'onboarding:welcome', status: 'completed' }]));
    if (path.includes('/unread_count')) return json(route, ok({ count: 0 }));
    if (path.endsWith('/users')) return json(route, ok([]));
    if (path.endsWith('/labels')) return json(route, ok([]));
    if (path.endsWith('/pipelines/pipeline-1') && method === 'GET') { requests.push(url.searchParams.get('deal_status') || ''); return json(route, ok(pipeline(url.searchParams.get('deal_status') || 'open'))); }
    if (path.endsWith('/pipelines') && method === 'GET') return json(route, ok([pipeline('open')]));
    const dealMatch = path.match(/\/deals\/([^/]+)(\/status)?$/);
    if (dealMatch) {
      const deal = deals.find(d => d.id === dealMatch[1]);
      if (!deal) return json(route, { success: false }, 404);
      if (dealMatch[2] && method === 'PATCH') {
        const body = request.postDataJSON() as { status: Status; lost_reason?: string };
        deal.deal_status = body.status;
        deal.lost_reason = body.status === 'lost' ? body.lost_reason ?? null : null;
        deal.completed_at = body.status === 'open' ? null : 1788264000;
      }
      return json(route, ok(deal));
    }
    if (path.includes('/conversation_status')) return json(route, ok({ deal_id: 'x', pipeline_id: 'pipeline-1', has_active: false, conversation: null, can_start: false, reason: 'no_contact', allowed_inboxes: [], default_inbox_id: null }));
    return json(route, ok(path.endsWith('/account') ? { id: 'account-1', locale: 'pt_BR' } : []));
  });
  return { deals, requests };
}

async function boot(page: Page, width: number, theme: 'light' | 'dark') {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript(selectedTheme => { localStorage.setItem('access_token', 'e2e-token'); localStorage.setItem('theme', selectedTheme); localStorage.setItem('i18nextLng', 'pt-BR'); }, theme);
  return installApi(page);
}

const titles = (page: Page) => page.locator('[data-deal-id] .deal-title').allTextContents();

test('padrão só abertos; Ganhos/Perdidos/Todos na URL; ganhar, perder e reabrir pelo modal', async ({ page }) => {
  test.setTimeout(90_000);
  const state = await boot(page, 1440, 'light');
  await page.goto('/pipelines/pipeline-1');
  await expect(page.getByRole('button', { name: 'Negócio aberto', exact: true })).toBeVisible();
  expect((await titles(page)).sort()).toEqual(['Negócio aberto', 'Outro aberto']);
  expect(state.requests[0]).toBe('open');
  const selector = page.getByRole('group', { name: 'Situação do negócio' });
  await expect(selector.getByRole('button', { name: /Abertos/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(selector.getByRole('button', { name: /Ganhos/ })).toContainText('1');
  await expect(page).not.toHaveURL(/deal_status/);
  if (shots) await page.screenshot({ path: `${shots}/r1-abertos-1440-light.png` });

  // Ganhos: só o ganho, com selo, sem alça de arrastar, e o filtro vai para a URL
  await selector.getByRole('button', { name: /Ganhos/ }).click();
  await expect(page).toHaveURL(/deal_status=won/);
  await expect(page.getByRole('button', { name: 'Negócio ganho', exact: true })).toBeVisible();
  await expect.poll(() => titles(page)).toEqual(['Negócio ganho']);
  await expect(page.locator('[data-deal-id="deal-won"] .deal-status-seal.is-won')).toBeVisible();
  await expect(page.locator('[data-deal-id="deal-won"] .deal-move-handle')).toHaveCount(0);
  await expect(page.locator('[data-deal-id="deal-won"]')).toHaveAttribute('draggable', 'false');
  await expect(page.locator('[data-deal-id="deal-won"]').getByRole('button', { name: /Mover cart/ })).toHaveCount(0);
  await expect(page.getByText('Nenhum negócio ganho nesta etapa')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/r1-ganhos-1440-light.png` });

  // Perdidos: selo com motivo no tooltip
  await selector.getByRole('button', { name: /Perdidos/ }).click();
  await expect.poll(() => titles(page)).toEqual(['Negócio perdido']);
  await expect(page.locator('[data-deal-id="deal-lost"] .deal-status-seal.is-lost')).toHaveAttribute('title', 'Motivo: Sem orçamento');

  // Todos
  await selector.getByRole('button', { name: /Todos/ }).click();
  await expect.poll(async () => (await titles(page)).length).toBe(4);

  // Reabrir o perdido pelo modal; o quadro (Todos) segue mostrando e o selo some
  await page.getByRole('button', { name: 'Negócio perdido', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText(/Perdido · Sem orçamento/)).toBeVisible();
  await expect(modal.getByLabel('Etapa do negócio')).toBeDisabled();
  await modal.getByRole('button', { name: 'Reabrir' }).click();
  await expect(modal.getByRole('button', { name: 'Marcar como ganho' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-deal-id="deal-lost"] .deal-status-seal')).toHaveCount(0);
  expect(state.deals.find(d => d.id === 'deal-lost')?.deal_status).toBe('open');

  // Marcar o aberto como perdido com motivo; em "Abertos" ele some e o contador atualiza
  await selector.getByRole('button', { name: /Abertos/ }).click();
  await page.getByRole('button', { name: 'Negócio aberto', exact: true }).click();
  await modal.getByRole('button', { name: 'Marcar como perdido' }).click();
  await modal.getByLabel('Motivo da perda (opcional)').fill('Escolheu concorrente');
  await modal.getByRole('button', { name: 'Confirmar perdido' }).click();
  await expect(modal.getByText(/Perdido · Escolheu concorrente/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-deal-id="deal-open"]')).toHaveCount(0);
  await expect(selector.getByRole('button', { name: /Perdidos/ })).toContainText('1');
  await expect(selector.getByRole('button', { name: /Abertos/ })).toContainText('2');
  expect(state.deals.find(d => d.id === 'deal-open')?.lost_reason).toBe('Escolheu concorrente');
});

test('deep link ?deal_status=won recarrega no filtro certo', async ({ page }) => {
  const state = await boot(page, 1440, 'dark');
  await page.goto('/pipelines/pipeline-1?deal_status=won');
  await expect(page.getByRole('button', { name: 'Negócio ganho', exact: true })).toBeVisible();
  expect(state.requests[0]).toBe('won');
  await expect(page.getByRole('group', { name: 'Situação do negócio' }).getByRole('button', { name: /Ganhos/ })).toHaveAttribute('aria-pressed', 'true');
  if (shots) await page.screenshot({ path: `${shots}/r1-ganhos-1440-dark.png` });
});

test('mobile 390 sem overflow horizontal da página', async ({ page }) => {
  await boot(page, 390, 'light');
  await page.goto('/pipelines/pipeline-1');
  await expect(page.getByRole('button', { name: 'Negócio aberto', exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (shots) await page.screenshot({ path: `${shots}/r1-abertos-390-light.png` });
});

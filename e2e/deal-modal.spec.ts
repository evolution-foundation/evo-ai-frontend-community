import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * S2 da repaginada: kanban sem scroll horizontal dentro da coluna + negócio em modal sobre o quadro.
 * API 100% sintética (nenhum dado real); capturas em E2E_SHOTS (padrão test-results/deal-modal).
 */
const shots = process.env.E2E_SHOTS || 'test-results/deal-modal';
const ok = (data: unknown) => ({ success: true, data, meta: {}, message: '' });
const json = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

const LONG_EMAIL = 'laurianedeolindafonsecadasilvateixeira.pereira@provedor-de-email-muito-longo.com.br';
const labels = ['trafego_pago', 'convite 0911 aula reconhecimento', 'quente', 'recuperacao-de-vendas', 'indicacao', 'vip'].map((title, index) => ({ id: `tag-${index}`, name: title, title, color: ['#7c3aed', '#0ea5e9', '#ef4444', '#16a34a', '#d97706', '#db2777'][index] }));

function makeDeals() {
  const names = [LONG_EMAIL, 'Maria Vitória', 'Luana Tomaz de Sousa Sá Albuquerque de Mendonça e Vasconcelos Neto', 'Agatha da Silva França', 'Beatriz dos Santos', 'Denise Santos Girard', 'Aparecida Almeida', 'Aryane', 'Estefane de Almeida', 'Eliana', 'Maria Eduarda', 'Giovani Moura'];
  return names.map((name, index) => ({
    id: `deal-${index + 1}`,
    deal_id: `deal-${index + 1}`,
    pipeline_id: 'pipeline-1',
    pipeline_stage_id: `stage-${(index % 3) + 1}`,
    stage_id: `stage-${(index % 3) + 1}`,
    title: name,
    value: index * 1000,
    currency: 'BRL',
    notes: '',
    custom_fields: { utm_source: 'Instagram_Feed', utm_campaign: 'name:03/11/2026 [Incon] [Etapa 3] [Leads] [Schedule] [Bidcap] [Funil Respondi] [CONG] - Copia' },
    owner: { id: 'owner-1', name: 'Eduardo Nunes' },
    primary_contact: { id: `c-${index}`, name: index === 0 ? '5511999990000' : name, email: index === 0 ? LONG_EMAIL : `contato${index}@example.com`, phone_number: '+5511999990000', type: 'person', avatar_url: null },
    contacts: [{ id: `c-${index}`, name: index === 0 ? '5511999990000' : name, email: `contato${index}@example.com`, phone_number: '+5511999990000', type: 'person' }],
    conversations: index % 2 ? [{ id: `conv-${index}`, display_id: index, status: 'open', contact: { id: `c-${index}`, name }, latest_message: { content: 'AULA AO VIVO COMEÇANDO AGORA', created_at: '2026-11-09T12:00:00Z' } }] : [],
    labels: index < 4 ? labels : index < 8 ? labels.slice(0, 2) : [],
    files: [],
    history: [{ id: `h-${index}`, action: 'stage_changed', source: 'api', changes: { stage_id: { from: 'stage-1', to: 'stage-2' } }, metadata: {}, created_at: new Date().toISOString(), actor: null }],
    tasks: [],
    scheduled_actions: [],
    contact_count: 1,
    conversation_count: index % 2 ? 1 : 0,
    file_count: 0,
    is_lead: false,
    item_id: `deal-${index + 1}`,
    type: 'deal',
    entered_at: 1788091200,
    created_at: '2026-08-30T10:00:00Z',
    updated_at: '2026-08-30T10:00:00Z',
    tasks_info: { pending_count: 0, overdue_count: 0, due_soon_count: 0, completed_count: 0, total_count: 0 },
    services_info: { has_services: false, total_value: index * 1000, formatted_total: '' },
  }));
}

async function installApi(page: Page, latency = 0) {
  const deals = makeDeals();
  const stages = [
    { id: 'stage-1', name: 'Novo Lead', color: '#7c3aed' },
    { id: 'stage-2', name: 'Lead pré-qualificado', color: '#0ea5e9' },
    { id: 'stage-3', name: 'Contato não estabelecido', color: '#16a34a' },
    { id: 'stage-4', name: 'Contato estabelecido', color: '#d97706' },
    { id: 'stage-5', name: 'Processo de marcação', color: '#db2777' },
    { id: 'stage-6', name: 'Reunião agendada', color: '#0f766e' },
  ];
  const pipeline = () => ({
    id: 'pipeline-1',
    name: 'Pipeline de Vendas - Consignado',
    description: 'E2E',
    custom_fields: { attributes: ['utm_source'] },
    services_info: { total_value: 0 },
    stages: stages.map(stage => ({ ...stage, items: deals.filter(deal => deal.pipeline_stage_id === stage.id), item_count: deals.filter(deal => deal.pipeline_stage_id === stage.id).length })),
  });
  const requests: string[] = [];
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const p = url.pathname.replace(/^\/undefined/, '');
    const method = request.method();
    requests.push(`${method} ${p}`);
    if (latency && /\/deals\/deal-\d+$/.test(p)) await new Promise(resolve => setTimeout(resolve, latency));
    if (p.endsWith('/auth/validate')) return json(route, ok({ user: { id: 'user-1', name: 'Usuário E2E', email: 'e2e@example.com', account_id: 'account-1', account: { id: 'account-1', name: 'Conta E2E' }, role: 'administrator', ui_settings: {} }, token: { access_token: 'e2e-token' } }));
    if (p.endsWith('/resource_actions')) return json(route, ok({ resources: { pipelines: ['read', 'create', 'update'] }, all_permissions: [] }));
    if (p.endsWith('/permissions')) return json(route, ok({ permissions: ['pipelines.read', 'pipelines.create', 'pipelines.update'] }));
    if (p.endsWith('/user_tours')) return json(route, ok([{ tour_key: 'onboarding:welcome', status: 'completed' }]));
    if (p.includes('/unread_count')) return json(route, ok({ count: 0 }));
    if (p.endsWith('/users')) return json(route, ok([{ id: 'owner-1', name: 'Eduardo Nunes' }, { id: 'owner-2', name: 'Ana Souza' }]));
    if (p.endsWith('/labels')) return json(route, ok(labels.map(label => ({ id: label.id, title: label.title, color: label.color }))));
    if (p.endsWith('/available_contacts') || p.endsWith('/available_conversations')) return json(route, ok([]));
    if (/\/pipeline_items\/deal-\d+\/tasks$/.test(p)) {
      return json(route, { success: true, data: [{ id: 't1', title: 'Finalizando informações', task_type: 'follow_up', status: 'completed', due_date: '2026-11-05T15:15:00Z', completed_at: '2026-11-06T16:48:00Z', overdue: false }, { id: 't2', title: 'Marcando horário', task_type: 'call', status: 'pending', due_date: '2026-12-05T15:15:00Z', overdue: false }], meta: { pagination: { page: 1, per_page: 25, total: 2, total_pages: 1 } } });
    }
    const dealMatch = p.match(/\/deals\/(deal-\d+)$/);
    if (dealMatch && method === 'GET') return json(route, ok(deals.find(deal => deal.id === dealMatch[1])));
    if (dealMatch && method === 'PATCH') {
      const deal = deals.find(entry => entry.id === dealMatch[1])!;
      const changes = (request.postDataJSON() as { deal: Record<string, unknown> }).deal;
      Object.assign(deal, changes);
      if (changes.pipeline_stage_id) deal.stage_id = String(changes.pipeline_stage_id);
      return json(route, ok(deal));
    }
    if (p.endsWith('/pipelines/pipeline-1') && method === 'GET') return json(route, ok(pipeline()));
    if (p.endsWith('/pipelines') && method === 'GET') return json(route, ok([pipeline()]));
    return json(route, ok(p.endsWith('/account') ? { id: 'account-1', locale: 'pt_BR' } : []));
  });
  return { deals, requests };
}

async function boot(page: Page, width: number, theme: 'light' | 'dark', latency = 0) {
  await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript(selectedTheme => {
    localStorage.setItem('access_token', 'e2e-token');
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('i18nextLng', 'pt-BR');
  }, theme);
  return installApi(page, latency);
}

async function shot(page: Page, name: string) {
  fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ animations: 'disabled', path: path.join(shots, `${name}.png`) });
}

for (const theme of ['light', 'dark'] as const) {
  test(`kanban: nenhuma coluna rola na horizontal (${theme})`, async ({ page }) => {
    test.setTimeout(60_000);
    await boot(page, 1440, theme);
    await page.goto('/pipelines/pipeline-1');
    await expect(page.getByRole('region', { name: 'Novo Lead' })).toBeVisible();
    const report = await page.locator('.kanban-dropzone').evaluateAll(zones => zones.map(zone => ({ scrollWidth: zone.scrollWidth, clientWidth: zone.clientWidth, overflowX: getComputedStyle(zone).overflowX })));
    expect(report.length).toBe(6);
    for (const zone of report) {
      expect(zone.scrollWidth).toBeLessThanOrEqual(zone.clientWidth);
      expect(zone.overflowX).toBe('hidden');
    }
    const cards = await page.locator('.deal-card-shell').evaluateAll(nodes => nodes.map(node => node.scrollWidth <= node.clientWidth + 1));
    expect(cards.every(Boolean)).toBe(true);
    await shot(page, `kanban-1440-${theme}`);
  });

  test(`modal: abrir, abas, fechar, voltar e deep link (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await boot(page, 1440, theme);
    await page.goto('/pipelines/pipeline-1');
    const board = page.locator('.kanban-scroll');
    await expect(page.getByRole('region', { name: 'Lead pré-qualificado' })).toBeVisible();
    // posição do quadro preservada ao abrir e fechar
    await board.evaluate(node => node.scrollTo({ left: 120, behavior: 'instant' }));
    await page.waitForTimeout(200);
    expect(await board.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true); // há scroll lateral só no quadro
    const before = await board.evaluate(node => node.scrollLeft);
    const card = page.locator('[data-deal-id="deal-2"]');
    await card.getByRole('button', { name: 'Maria Vitória', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/pipelines\/pipeline-1\?deal=deal-2&tab=activities/);
    await expect(dialog.getByRole('heading', { name: /Maria Vitória/ })).toBeVisible();
    await expect(dialog.getByRole('list', { name: 'Etapas do pipeline' })).toBeVisible();
    await shot(page, `modal-atividades-1440-${theme}`);

    const tabs = dialog.getByRole('navigation', { name: 'Seções do negócio' });
    for (const [tab, marker, file] of [['Contatos', 'Campos de contato', 'contato'], ['Negócio', 'Campos de negócio', 'negocio'], ['Conversas', 'Sessões de conversa', 'conversas'], ['Arquivos', 'Arquivos do negócio', 'arquivos'], ['Histórico', 'Histórico do negócio', 'historico']] as const) {
      await tabs.getByRole('button', { name: tab, exact: true }).click();
      await expect(dialog.getByLabel(marker).first()).toBeVisible();
      await shot(page, `modal-${file}-1440-${theme}`);
    }
    await expect(page).toHaveURL(/tab=history/);

    // edição inline reflete no cartão sem recarregar
    await tabs.getByRole('button', { name: 'Negócio', exact: true }).click();
    await dialog.getByRole('button', { name: 'Título', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Título' }).fill('Maria Vitória Editada');
    await dialog.getByRole('textbox', { name: 'Título' }).press('Enter');
    await expect(page.locator('[data-deal-id="deal-2"] .deal-title')).toHaveText('Maria Vitória Editada'); // o quadro (aria-hidden sob o modal) já refletiu a edição
    // Esc fecha (histórico foi empilhado na abertura → volta a ?deal removido) e preserva o scroll
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(/deal=/);
    expect(Math.abs((await board.evaluate(node => node.scrollLeft)) - before)).toBeLessThan(2);
    await expect(card.getByRole('button', { name: 'Maria Vitória Editada', exact: true })).toBeFocused();

    // voltar/avançar do navegador
    await card.getByRole('button', { name: 'Maria Vitória Editada', exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.goBack();
    await expect(dialog).toBeHidden();
    await page.goForward();
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Fechar negócio' }).click();
    await expect(dialog).toBeHidden();

    // deep links: novo e legado
    await page.goto('/pipelines/pipeline-1?deal=deal-3&tab=deal');
    await expect(page.getByRole('dialog').getByText('Campos de negócio')).toBeVisible();
    await expect(page.locator('.kanban-column').first()).toBeVisible(); // o quadro segue ao fundo
    await page.goto('/pipelines/pipeline-1/deals/deal-4?tab=contacts');
    await expect(page).toHaveURL(/\/pipelines\/pipeline-1\?deal=deal-4&tab=contacts/);
    await expect(page.getByRole('dialog').getByText('Campos de contato')).toBeVisible();
  });
}

test('modal: botões e menus do cartão não abrem o modal; arrastar não abre', async ({ page }) => {
  await boot(page, 1440, 'light');
  await page.goto('/pipelines/pipeline-1');
  const card = page.locator('[data-deal-id="deal-1"]');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: /Mover cart/ }).click();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).not.toHaveURL(/deal=/);
  // clique no corpo do cartão abre
  await card.locator('.deal-field').first().click({ position: { x: 4, y: 4 } });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/deal=deal-1/);
});

test('modal no celular (390) vira tela cheia sem overflow', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, 390, 'light');
  await page.goto('/pipelines/pipeline-1');
  await expect(page.getByRole('region', { name: 'Novo Lead' })).toBeVisible();
  await page.locator('[data-deal-id="deal-2"]').getByRole('button', { name: 'Maria Vitória', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(388);
  expect(box!.height).toBeGreaterThanOrEqual(840);
  await expect(dialog.getByRole('list', { name: 'Etapas do pipeline' })).toBeVisible();
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(await overflow()).toBe(false);
  await shot(page, 'modal-atividades-390-light');
  await dialog.getByRole('navigation', { name: 'Seções do negócio' }).getByRole('button', { name: 'Negócio', exact: true }).click();
  await expect(dialog.getByText('Campos de negócio')).toBeVisible();
  expect(await overflow()).toBe(false);
  await shot(page, 'modal-negocio-390-light');
});

test('velocidade: casca imediata com dados do cartão e conteúdo cacheado pelo prefetch', async ({ page }) => {
  test.setTimeout(60_000);
  const { requests } = await boot(page, 1440, 'light', 400); // negócio completo demora 400 ms
  await page.goto('/pipelines/pipeline-1');
  const card = page.locator('[data-deal-id="deal-5"]');
  await expect(card).toBeVisible();
  await page.waitForTimeout(1600); // o quadro aquece o código do modal quando fica ocioso (1,2 s)
  // sem hover: o modal abre já com título do cartão enquanto a rede responde.
  // Medido dentro da página (clique → cabeçalho do modal pintado), sem o polling do Playwright.
  await page.evaluate(() => {
    const w = window as unknown as { __t: { click?: number; shell?: number } };
    w.__t = {};
    document.addEventListener('click', () => { w.__t.click = performance.now(); }, { capture: true, once: true });
    new MutationObserver((_, observer) => {
      if (document.querySelector('[role="dialog"] .deal-modal-title')) { requestAnimationFrame(() => { w.__t.shell = performance.now(); }); observer.disconnect(); }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await card.getByRole('button', { name: 'Beatriz dos Santos', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: /Beatriz dos Santos/ })).toBeVisible();
  const shell = Math.round(await page.evaluate(() => { const t = (window as unknown as { __t: { click: number; shell: number } }).__t; return t.shell - t.click; }));
  await expect(page.getByRole('list', { name: 'Etapas do pipeline' })).toBeVisible();
  await page.keyboard.press('Escape');
  // com hover: prefetch ao passar o mouse → conteúdo completo logo após o clique
  const other = page.locator('[data-deal-id="deal-6"]');
  await other.hover();
  await page.waitForTimeout(900);
  const t1 = Date.now();
  await other.getByRole('button', { name: 'Denise Santos Girard', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Etapas do pipeline' })).toBeVisible();
  const full = Date.now() - t1;
  console.log(`[timing] casca (clique→cabeçalho pintado)=${shell}ms; conteúdo completo com prefetch (clique→etapas)=${full}ms; latência simulada do negócio=400ms`);
  const strict = !!process.env.E2E_PROD; // build de produção; o dev server (Vite) é mais lento
  expect(shell).toBeLessThan(strict ? 100 : 1500);
  expect(full).toBeLessThan(strict ? 600 : 1500);
  expect(requests.filter(entry => entry.endsWith('/deals/deal-6')).length).toBeLessThanOrEqual(2);
});


// ── S5: repaginada geral ──
for (const theme of ['light', 'dark'] as const) {
  test(`repaginada: ordenar, densidade, tag filtra, anterior/próximo (${theme})`, async ({ page }) => {
    await boot(page, 1440, theme);
    await page.goto('/pipelines/pipeline-1');
    await expect(page.getByRole('navigation', { name: 'Caminho' })).toContainText('Todos os pipelines');
    await shot(page, `s5-kanban-1440-${theme}`);

    // ordenar por maior valor: primeiro cartão da coluna 1 é o de maior valor
    await page.getByRole('button', { name: 'Ordenar negócios' }).click();
    await page.getByRole('menuitem', { name: 'Maior valor' }).click();
    await expect(page).toHaveURL(/sort=value_desc/);
    const firstTitle = page.locator('[data-stage-id="stage-1"] .deal-title').first();
    await expect(firstTitle).toBeVisible();
    const titles = await page.locator('[data-stage-id="stage-1"] .deal-title').allTextContents();
    expect(titles.length).toBeGreaterThan(1);

    // densidade compacta persiste
    await page.getByRole('button', { name: 'Compacto' }).click();
    await expect(page.locator('.kanban-scroll')).toHaveAttribute('data-density', 'compact');
    await shot(page, `s5-kanban-compacto-1440-${theme}`);
    await page.reload();
    await expect(page.locator('.kanban-scroll')).toHaveAttribute('data-density', 'compact');
    await page.getByRole('button', { name: 'Confortável' }).click();

    // clicar na tag filtra; de novo remove
    const tag = page.locator('.deal-label.is-filter', { hasText: 'trafego_pago' }).first();
    await tag.click();
    await expect(page).toHaveURL(/label=trafego_pago/);
    await expect(page.locator('.deal-card-shell')).toHaveCount(8);
    await expect(page.locator('.kanban-results-count')).toContainText('8 de 12 negócios');
    await expect(page.locator('.deal-card-shell').first()).toBeVisible();
    await page.locator('.deal-label.is-filter', { hasText: 'trafego_pago' }).first().click();
    await expect(page).not.toHaveURL(/label=/);

    // modal: anterior/próximo
    await page.goto('/pipelines/pipeline-1');
    await page.locator('[data-stage-id="stage-1"] .deal-title').first().click();
    const pager = page.getByRole('group', { name: 'Navegar entre negócios da etapa' });
    await expect(pager).toContainText('1 de');
    await expect(pager.getByRole('button', { name: 'Negócio anterior' })).toBeDisabled();
    await shot(page, `s5-modal-1440-${theme}`);
    await pager.getByRole('button', { name: 'Próximo negócio' }).click();
    await expect(pager).toContainText('2 de');
    await page.keyboard.press('Alt+ArrowLeft');
    await expect(pager).toContainText('1 de');
  });
}

test('repaginada: mobile 390 sem overflow horizontal', async ({ page }) => {
  await boot(page, 390, 'light');
  await page.goto('/pipelines/pipeline-1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await shot(page, 's5-kanban-390-light');
  await page.locator('.deal-title').first().click();
  await expect(page.getByRole('group', { name: 'Navegar entre negócios da etapa' })).toBeVisible();
  await shot(page, 's5-modal-390-light');
});

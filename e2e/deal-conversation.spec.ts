import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * S4 da repaginada: ação de conversa no cartão/modal (abrir/iniciar/desabilitado), painel lateral com a
 * conversa e modo espião, e configuração dos números de WhatsApp por pipeline. API 100% sintética:
 * nenhuma chamada real e nenhuma mensagem enviada (o POST de mensagem é interceptado).
 */
const shots = process.env.E2E_SHOTS || 'test-results/deal-conversation';
const ok = (data: unknown) => ({ success: true, data, meta: {}, message: '' });
const json = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

const inboxes = [
  { id: 'inbox-1', name: 'Comercial 1', phone_number: '+5511900000001', provider: 'evolution', connected: true, connection: 'open' },
  { id: 'inbox-2', name: 'Comercial 2', phone_number: '+5511900000002', provider: 'evolution', connected: true, connection: 'open' },
  { id: 'inbox-3', name: 'Suporte (caiu)', phone_number: '+5511900000003', provider: 'evolution', connected: false, connection: 'close' },
];

const initialSummaries = (): Record<string, Record<string, unknown>> => ({
  'deal-1': { has_active: true, conversation_id: 'conv-1', display_id: 41, inbox_id: 'inbox-1', status: 'open', can_start: false, reason: null, allowed_inbox_count: 2 },
  'deal-2': { has_active: false, can_start: true, reason: null, allowed_inbox_count: 2 },
  'deal-3': { has_active: false, can_start: false, reason: 'no_inbox_configured', allowed_inbox_count: 0 },
  'deal-4': { has_active: false, can_start: false, reason: 'contact_without_phone', allowed_inbox_count: 2 },
});

function makeDeals(summaries: Record<string, Record<string, unknown>>) {
  const names = ['Maria Vitória', 'João Pereira', 'Luana Tomaz', 'Agatha França'];
  return names.map((name, index) => ({
    id: `deal-${index + 1}`, deal_id: `deal-${index + 1}`, pipeline_id: 'pipeline-1', pipeline_stage_id: 'stage-1', stage_id: 'stage-1',
    title: name, value: 1000 * (index + 1), currency: 'BRL', notes: '', custom_fields: {}, owner: { id: 'owner-1', name: 'Eduardo Nunes' }, company: null,
    primary_contact: { id: `c-${index}`, name, email: `c${index}@example.com`, phone_number: index === 3 ? null : '+5511999990000', type: 'person', avatar_url: null },
    contacts: [{ id: `c-${index}`, name, email: `c${index}@example.com`, phone_number: '+5511999990000', type: 'person' }],
    conversations: index === 0 ? [{ id: 'conv-1', display_id: 41, status: 'open', contact: { id: 'c-0', name }, latest_message: { content: 'AULA AO VIVO COMEÇANDO AGORA', created_at: '2026-11-09T12:00:00Z' } }] : [],
    conversation_summary: summaries[`deal-${index + 1}`],
    labels: [], files: [], history: [], tasks: [], scheduled_actions: [], contact_count: 1, conversation_count: index === 0 ? 1 : 0, file_count: 0, is_lead: false,
    item_id: `deal-${index + 1}`, type: 'deal', entered_at: 1788091200, created_at: '2026-08-30T10:00:00Z', updated_at: '2026-08-30T10:00:00Z',
    tasks_info: { pending_count: 0, overdue_count: 0, due_soon_count: 0, completed_count: 0, total_count: 0 }, services_info: { has_services: false, total_value: 0, formatted_total: '' },
  }));
}

const message = (id: string, content: string, type: 'incoming' | 'outgoing', minutes: number) => ({
  id, content, content_attributes: {}, content_type: 'text', conversation_id: 'conv-1', created_at: 1788091200 + minutes * 60, external_source_ids: {},
  message_type: type, private: false, sender: { id: type === 'incoming' ? 'c-0' : 'owner-1', name: type === 'incoming' ? 'Maria Vitória' : 'Eduardo Nunes', type: type === 'incoming' ? 'contact' : 'user' },
  sender_type: type === 'incoming' ? 'contact' : 'user', source_id: null, status: 'read', attachments: [],
});

async function installApi(page: Page, opts: { canUpdate?: boolean; allowed?: string[]; defaultInbox?: string | null } = {}) {
  const summaries = initialSummaries();
  const deals = makeDeals(summaries);
  const state = { allowed: opts.allowed ?? ['inbox-1', 'inbox-2'], defaultInbox: opts.defaultInbox === undefined ? 'inbox-1' : opts.defaultInbox };
  const calls: string[] = [];
  const bodies: Record<string, unknown> = {};
  const permissions = ['pipelines.read', 'conversations.read', 'conversations.update', ...(opts.canUpdate === false ? [] : ['pipelines.create', 'pipelines.update'])];
  const inboxPayload = () => ({ pipeline_id: 'pipeline-1', configured: state.allowed.length > 0, default_inbox_id: state.defaultInbox, allowed: inboxes.filter(i => state.allowed.includes(i.id)).map(i => ({ ...i, is_default: i.id === state.defaultInbox })), eligible: inboxes.map(i => ({ ...i, allowed: state.allowed.includes(i.id) })) });
  const stages = [{ id: 'stage-1', name: 'Novo Lead', color: '#7c3aed' }, { id: 'stage-2', name: 'Qualificado', color: '#0ea5e9' }];
  const pipeline = () => ({ id: 'pipeline-1', name: 'Pipeline de Vendas', description: 'E2E', custom_fields: { attributes: [] }, services_info: { total_value: 0 }, pipeline_type: 'sales', visibility: 'public', is_active: true, stages: stages.map(s => ({ ...s, items: s.id === 'stage-1' ? deals : [], item_count: s.id === 'stage-1' ? deals.length : 0 })) });
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const p = new URL(request.url()).pathname.replace(/^\/undefined/, '');
    const method = request.method();
    calls.push(`${method} ${p}`);
    if (p.endsWith('/auth/validate')) return json(route, ok({ user: { id: 'user-1', name: 'Usuário E2E', email: 'e2e@example.com', account_id: 'account-1', account: { id: 'account-1', name: 'Conta E2E' }, role: 'administrator', ui_settings: {} }, token: { access_token: 'e2e-token' } }));
    if (p.endsWith('/resource_actions')) return json(route, ok({ resources: { pipelines: opts.canUpdate === false ? ['read'] : ['read', 'create', 'update'], conversations: ['read', 'update'] }, all_permissions: [] }));
    if (p.endsWith('/permissions')) return json(route, ok({ permissions }));
    if (p.endsWith('/user_tours')) return json(route, ok([{ tour_key: 'onboarding:welcome', status: 'completed' }]));
    if (p.includes('/unread_count')) return json(route, ok({ count: 0 }));
    if (p.endsWith('/users')) return json(route, ok([{ id: 'owner-1', name: 'Eduardo Nunes' }]));
    if (p.endsWith('/labels')) return json(route, ok([]));
    if (p.endsWith('/available_contacts') || p.endsWith('/available_conversations')) return json(route, ok([]));
    if (/\/pipeline_items\/deal-\d+\/tasks$/.test(p)) return json(route, { success: true, data: [], meta: { pagination: { page: 1, per_page: 25, total: 0, total_pages: 1 } } });
    let m = p.match(/\/deals\/(deal-\d+)\/conversation_status$/);
    if (m) {
      const summary = summaries[m[1]];
      const allowed = inboxes.filter(i => state.allowed.includes(i.id)).map(i => ({ ...i, is_default: i.id === state.defaultInbox }));
      return json(route, ok({ deal_id: m[1], pipeline_id: 'pipeline-1', has_active: summary.has_active, conversation: summary.has_active ? { id: 'conv-1', display_id: 41, status: 'open', path: '/conversations/conv-1' } : null, can_start: summary.can_start, reason: summary.reason, contact: { id: 'c-1', name: 'João Pereira', phone_number: '+5511999990000' }, allowed_inboxes: summary.reason === 'no_inbox_configured' ? [] : allowed, default_inbox_id: state.defaultInbox }));
    }
    m = p.match(/\/deals\/(deal-\d+)\/conversation$/);
    if (m && method === 'POST') {
      bodies.startConversation = request.postDataJSON();
      summaries[m[1]] = { has_active: true, conversation_id: 'conv-1', display_id: 77, inbox_id: 'inbox-1', status: 'open', can_start: false, reason: null, allowed_inbox_count: 2 };
      return json(route, ok({ deal_id: m[1], pipeline_id: 'pipeline-1', has_active: true, conversation: { id: 'conv-1', display_id: 77, status: 'open', path: '/conversations/conv-1' }, can_start: false, reason: null, allowed_inboxes: [], default_inbox_id: null, created: true, conversation_id: 'conv-1' }), 201);
    }
    if (/\/pipelines\/pipeline-1\/whatsapp_inboxes$/.test(p)) {
      if (method === 'PUT') {
        const body = request.postDataJSON() as { inbox_ids: string[]; default_inbox_id?: string };
        bodies.saveInboxes = body;
        state.allowed = body.inbox_ids;
        state.defaultInbox = body.default_inbox_id ?? (body.inbox_ids[0] || null);
      }
      return json(route, ok(inboxPayload()));
    }
    if (/\/conversations\/conv-1\/messages$/.test(p)) {
      if (method === 'POST') { bodies.sendMessage = request.postDataJSON(); return json(route, ok(message('m9', (request.postDataJSON() as { content: string }).content, 'outgoing', 30)), 201); }
      return json(route, ok([message('m1', 'Oi! Vi o convite da aula ao vivo.', 'incoming', 0), message('m2', 'Olá, Maria! Que bom ter você aqui. Posso te ajudar?', 'outgoing', 5), message('m3', 'Quero entender como funciona o consignado.', 'incoming', 12)]));
    }
    if (/\/conversations\/conv-1\/update_last_seen$/.test(p)) { calls.push('MARK_READ'); return json(route, ok({})); }
    if (/\/conversations\/conv-1$/.test(p)) return json(route, ok({ id: 'conv-1', display_id: 41, status: 'open', can_reply: true, inbox_id: 'inbox-1', inbox: { id: 'inbox-1', channel_type: 'Channel::Whatsapp' }, messages: [], meta: { sender: { id: 'c-0', name: 'Maria Vitória' } } }));
    m = p.match(/\/deals\/(deal-\d+)$/);
    if (m && method === 'GET') return json(route, ok({ ...deals.find(d => d.id === m![1]), conversation_summary: summaries[m![1]] }));
    if (p.endsWith('/pipelines/pipeline-1') && method === 'GET') return json(route, ok(pipeline()));
    if (p.endsWith('/pipelines/pipeline-1') && method === 'PATCH') return json(route, ok(pipeline()));
    if (p.endsWith('/pipelines') && method === 'GET') return json(route, ok([pipeline()]));
    return json(route, ok(p.endsWith('/account') ? { id: 'account-1', locale: 'pt_BR' } : []));
  });
  return { calls, bodies, state };
}

async function boot(page: Page, width: number, theme: 'light' | 'dark', opts: Parameters<typeof installApi>[1] = {}) {
  await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript(selectedTheme => {
    localStorage.setItem('access_token', 'e2e-token');
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('i18nextLng', 'pt-BR');
  }, theme);
  return installApi(page, opts);
}
async function shot(page: Page, name: string) {
  fs.mkdirSync(shots, { recursive: true });
  await page.screenshot({ animations: 'disabled', path: path.join(shots, `${name}.png`) });
}

for (const theme of ['light', 'dark'] as const) {
  test(`cartão: abrir conversa em painel lateral sem sair do kanban (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    const api = await boot(page, 1440, theme);
    await page.goto('/pipelines/pipeline-1');
    const card = (id: string) => page.locator(`[data-deal-id="${id}"]`);
    await expect(card('deal-1')).toBeVisible();
    // estados do botão
    await expect(card('deal-1').getByTestId('deal-conversation-action')).toHaveAttribute('data-state', 'open');
    await expect(card('deal-2').getByTestId('deal-conversation-action')).toHaveAttribute('data-state', 'start');
    await expect(card('deal-3').getByTestId('deal-conversation-action')).toHaveAttribute('aria-disabled', 'true');
    await expect(card('deal-3').getByTestId('deal-conversation-action')).toHaveAttribute('title', /não tem número de WhatsApp autorizado/);
    await expect(card('deal-4').getByTestId('deal-conversation-action')).toHaveAttribute('title', /telefone válido/);
    await shot(page, `cartao-acoes-1440-${theme}`);

    await card('deal-1').getByTestId('deal-conversation-action').click();
    const drawer = page.locator('.deal-conversation-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Oi! Vi o convite da aula ao vivo.')).toBeVisible();
    await expect(page).not.toHaveURL(/deal=/); // o usuário continua no quadro
    // aberto sem modo espião: marca como lida
    await expect.poll(() => api.calls.includes('MARK_READ')).toBe(true);
    await shot(page, `painel-conversa-1440-${theme}`);
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(page.locator('.kanban-column').first()).toBeVisible();
  });

  test(`cartão: iniciar conversa escolhendo o número (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    const api = await boot(page, 1440, theme);
    await page.goto('/pipelines/pipeline-1');
    await page.locator('[data-deal-id="deal-2"]').getByTestId('deal-conversation-action').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Escolha o número de WhatsApp')).toBeVisible();
    await expect(dialog.getByLabel(/Comercial 1/)).toBeChecked(); // padrão pré-selecionado
    await dialog.getByLabel(/Comercial 2/).check();
    await shot(page, `iniciar-conversa-1440-${theme}`);
    await dialog.getByRole('button', { name: 'Iniciar conversa' }).click();
    await expect.poll(() => api.bodies.startConversation).toEqual({ inbox_id: 'inbox-2' });
    await expect(page.locator('.deal-conversation-drawer')).toBeVisible();
    await expect(page.locator('[data-deal-id="deal-2"]').getByTestId('deal-conversation-action')).toHaveAttribute('data-state', 'open');
  });

  test(`cartão: sem número autorizado → explica e leva a "Configurar números" (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    const api = await boot(page, 1440, theme);
    await page.goto('/pipelines/pipeline-1');
    await page.locator('[data-deal-id="deal-3"]').getByTestId('deal-conversation-action').click({ force: true });
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/não tem número de WhatsApp autorizado/)).toBeVisible();
    await shot(page, `sem-numero-1440-${theme}`);
    await dialog.getByRole('button', { name: 'Configurar números' }).click();
    const settings = page.getByTestId('whatsapp-inboxes-settings');
    await expect(settings).toBeVisible();
    await expect(settings.getByText('Suporte (caiu)')).toBeVisible();
    await expect(settings.getByText('Desconectado')).toBeVisible();
    await settings.getByRole('switch', { name: 'Autorizar Comercial 2' }).check();
    await settings.getByRole('radio', { name: 'Definir Comercial 2 como padrão' }).check();
    await settings.getByRole('button', { name: 'Salvar números' }).click();
    await expect.poll(() => api.bodies.saveInboxes).toEqual({ inbox_ids: ['inbox-1', 'inbox-2'], default_inbox_id: 'inbox-2' });
    await shot(page, `numeros-pipeline-1440-${theme}`);
  });

  test(`modal do negócio: botão no cabeçalho e conversa embutida com modo espião (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    const api = await boot(page, 1440, theme);
    await page.goto('/pipelines/pipeline-1?deal=deal-1&tab=conversations');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('deal-conversation-action').first()).toHaveAttribute('data-state', 'open');
    await expect(dialog.getByText('Selecione uma conversa')).toBeVisible();
    await dialog.getByRole('button', { name: /#41/ }).first().click();
    await expect(dialog.getByTestId('embedded-conversation').getByText('Oi! Vi o convite da aula ao vivo.')).toBeVisible();
    await expect.poll(() => api.calls.includes('MARK_READ')).toBe(true); // modo espião desligado
    api.calls.length = 0;
    await dialog.getByRole('button', { name: 'Ativar modo espião' }).click();
    await dialog.getByRole('button', { name: /#41/ }).first().click();
    await page.waitForTimeout(300);
    expect(api.calls.includes('MARK_READ')).toBe(false);
    await shot(page, `modal-conversas-embutida-1440-${theme}`);
    // enviar texto (POST interceptado)
    await dialog.getByLabel('Mensagem').fill('Posso te ligar hoje?');
    await dialog.getByLabel('Mensagem').press('Enter');
    await expect.poll(() => (api.bodies.sendMessage as { content?: string } | undefined)?.content).toBe('Posso te ligar hoje?');
    await expect(dialog.getByText('Posso te ligar hoje?')).toBeVisible();
  });
}

test('RBAC: sem pipelines.update não edita números nem vê "Configurar números"', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, 1440, 'light', { canUpdate: false, allowed: [] });
  await page.goto('/pipelines/pipeline-1');
  await page.locator('[data-deal-id="deal-3"]').getByTestId('deal-conversation-action').click({ force: true });
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Peça a quem administra/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Configurar números' })).toHaveCount(0);
});

test('mobile 390: painel de conversa em tela cheia, sem overflow', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, 390, 'light');
  await page.goto('/pipelines/pipeline-1');
  await page.locator('[data-deal-id="deal-1"]').getByTestId('deal-conversation-action').click();
  const drawer = page.locator('.deal-conversation-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Oi! Vi o convite da aula ao vivo.')).toBeVisible();
  const box = await drawer.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(389);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await shot(page, 'painel-conversa-390-light');
  await page.keyboard.press('Escape');
  await page.goto('/pipelines/pipeline-1?deal=deal-2&tab=activities');
  await expect(page.getByRole('dialog').getByTestId('deal-conversation-action').first()).toBeVisible();
  await shot(page, 'modal-cabecalho-390-light');
});

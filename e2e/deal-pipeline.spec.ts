import { expect, test, type Page, type Route } from '@playwright/test';

type Theme = 'light' | 'dark';

const scenarios: Array<{ width: number; theme: Theme }> = [
  { width: 1280, theme: 'light' },
  { width: 1280, theme: 'dark' },
  { width: 1440, theme: 'light' },
  { width: 1440, theme: 'dark' },
  { width: 1920, theme: 'light' },
  { width: 1920, theme: 'dark' },
];

const ok = (data: unknown) => ({ success: true, data, meta: {}, message: '' });

async function json(route: Route, data: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
}

async function installApi(page: Page) {
  const primaryContact = {
    id: 'contact-1',
    name: 'Marina Costa',
    email: 'marina@example.com',
    phone_number: '+55 11 99999-0000',
    type: 'contact',
    avatar_url: null,
    labels: [{ id: 'contact-tag', title: 'Tag exclusiva do contato', color: '#ef4444' }],
    custom_attributes: {},
  };
  const company = {
    id: 'company-1',
    name: 'Acme Ltda.',
    email: null,
    phone_number: null,
    type: 'company',
    custom_attributes: {},
  };
  const conversation = {
    id: 'conversation-1',
    uuid: 'conversation-1',
    display_id: 42,
    status: 'open',
    contact: primaryContact,
    inbox: { id: 'inbox-1', name: 'WhatsApp' },
    latest_message: { content: 'Podemos avançar com a proposta?', created_at: '2026-08-30T12:00:00Z' },
    last_non_activity_message: {
      content: '<b>Podemos avançar</b> com a proposta?',
      processed_message_content: '<b>Podemos avançar</b> com a proposta?',
      created_at: '2026-08-30T12:00:00Z',
      message_type: 0,
      sender: { name: 'Marina Costa' },
    },
  };
  const history: Array<Record<string, unknown>> = [];
  let created = false;
  let stageId = 'stage-1';
  let file: Record<string, unknown> | null = null;
  let deal = {
    id: 'deal-1',
    deal_id: 'deal-1',
    pipeline_id: 'pipeline-1',
    pipeline_stage_id: stageId,
    stage_id: stageId,
    title: 'Expansão anual',
    value: 12500,
    currency: 'BRL',
    notes: '',
    custom_fields: { utm_source: '' },
    owner: null,
    company: null as typeof company | null,
    primary_contact: null as typeof primaryContact | null,
    contacts: [] as Array<typeof primaryContact>,
    conversations: [] as Array<typeof conversation>,
    labels: [] as Array<{ id: string; name: string; title: string; color: string }>,
    files: [] as Array<Record<string, unknown>>,
    history,
    tasks: [],
    scheduled_actions: [],
    contact_count: 0,
    conversation_count: 0,
    file_count: 0,
    is_lead: false,
    item_id: 'deal-1',
    type: 'deal',
    entered_at: 1788091200,
    created_at: '2026-08-30T10:00:00Z',
    updated_at: '2026-08-30T10:00:00Z',
    tasks_info: {
      pending_count: 0,
      overdue_count: 0,
      due_soon_count: 0,
      completed_count: 0,
      total_count: 0,
    },
  };

  const addHistory = (action: string, changes: Record<string, unknown> = {}) => {
    history.unshift({
      id: `history-${history.length + 1}`,
      action,
      source: 'playwright',
      actor: { id: 'user-1', name: 'Usuário E2E' },
      changes,
      created_at: new Date().toISOString(),
    });
  };

  const dealItem = () => ({
    ...deal,
    pipeline_stage_id: stageId,
    stage_id: stageId,
    contact: deal.primary_contact,
    conversation: deal.conversations[0] || null,
    last_message: deal.conversations[0]?.latest_message || null,
    labels: deal.labels,
    services_info: { has_services: false, total_value: deal.value, formatted_total: '' },
  });

  const pipeline = () => ({
    id: 'pipeline-1',
    name: 'Pipeline Comercial',
    description: 'Pipeline E2E',
    custom_fields: { attributes: ['utm_source'] },
    services_info: { total_value: created ? deal.value : 0 },
    stages: [
      {
        id: 'stage-1',
        name: 'Novo lead',
        color: '#7c3aed',
        item_count: created && stageId === 'stage-1' ? 1 : 0,
        items: created && stageId === 'stage-1' ? [dealItem()] : [],
      },
      {
        id: 'stage-2',
        name: 'Proposta',
        color: '#0ea5e9',
        item_count: created && stageId === 'stage-2' ? 1 : 0,
        items: created && stageId === 'stage-2' ? [dealItem()] : [],
      },
    ],
  });

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/undefined/, '');
    const method = request.method();

    if (path.endsWith('/auth/validate')) {
      return json(
        route,
        ok({
          user: {
            id: 'user-1',
            name: 'Usuário E2E',
            email: 'e2e@example.com',
            account_id: 'account-1',
            account: { id: 'account-1', name: 'Conta E2E' },
            role: 'administrator',
            ui_settings: {},
          },
          token: { access_token: 'e2e-token' },
        }),
      );
    }
    if (path.endsWith('/resource_actions')) {
      return json(
        route,
        ok({
          resources: { pipelines: ['read', 'create', 'update'] },
          all_permissions: [
            { key: 'pipelines.read', display_name: 'Ler pipelines' },
            { key: 'pipelines.create', display_name: 'Criar pipelines' },
            { key: 'pipelines.update', display_name: 'Editar pipelines' },
          ],
        }),
      );
    }
    if (path.endsWith('/permissions')) {
      return json(route, ok({ permissions: ['pipelines.read', 'pipelines.create', 'pipelines.update'] }));
    }
    if (path.endsWith('/user_tours')) {
      return json(route, ok([{ tour_key: 'onboarding:welcome', status: 'completed' }]));
    }
    if (path.includes('/unread_count')) return json(route, ok({ count: 0 }));
    if (path.endsWith('/users')) return json(route, ok([{ id: 'owner-1', name: 'Ana Souza' }]));
    if (path.endsWith('/labels')) {
      return json(route, ok([{ id: 'deal-tag', title: 'Expansão', color: '#7c3aed' }]));
    }
    if (path.endsWith('/pipelines/pipeline-1/pipeline_items/available_contacts')) {
      return json(route, ok([primaryContact, company]));
    }
    if (path.endsWith('/pipelines/pipeline-1/pipeline_items/available_conversations')) {
      return json(route, ok([conversation]));
    }
    if (path.endsWith('/pipelines/pipeline-1/deals') && method === 'POST') {
      const payload = request.postDataJSON() as { deal: Partial<typeof deal> };
      created = true;
      stageId = String(payload.deal.pipeline_stage_id || 'stage-1');
      deal = { ...deal, ...payload.deal, pipeline_stage_id: stageId, stage_id: stageId } as typeof deal;
      addHistory('deal_created', { title: { from: null, to: deal.title } });
      return json(route, ok(deal));
    }
    if (path.endsWith('/pipelines/pipeline-1/pipeline_items/deal-1/move_to_stage') && method === 'PATCH') {
      const payload = request.postDataJSON() as { new_stage_id: string };
      const previous = stageId;
      stageId = payload.new_stage_id;
      deal = { ...deal, pipeline_stage_id: stageId, stage_id: stageId };
      addHistory('stage_changed', { stage_id: { from: previous, to: stageId } });
      return json(route, ok({ success: true }));
    }
    if (path.endsWith('/pipelines/pipeline-1') && method === 'GET') return json(route, ok(pipeline()));
    if (path.endsWith('/pipelines') && method === 'GET') return json(route, ok([pipeline()]));
    if (path.endsWith('/deals/deal-1') && method === 'GET') return json(route, ok(deal));
    if (path.endsWith('/deals/deal-1') && method === 'PATCH') {
      const payload = request.postDataJSON() as { deal: Record<string, unknown> };
      const changes = payload.deal;
      if ('company_id' in changes) deal.company = changes.company_id ? company : null;
      if (Array.isArray(changes.labels)) {
        deal.labels = changes.labels.includes('deal-tag')
          ? [{ id: 'deal-tag', name: 'Expansão', title: 'Expansão', color: '#7c3aed' }]
          : [];
      }
      deal = {
        ...deal,
        ...changes,
        company: deal.company,
        labels: deal.labels,
        pipeline_stage_id: String(changes.pipeline_stage_id || deal.pipeline_stage_id),
        stage_id: String(changes.pipeline_stage_id || deal.stage_id),
      } as typeof deal;
      stageId = deal.stage_id;
      addHistory('deal_updated', changes);
      return json(route, ok(deal));
    }
    if (path.endsWith('/deals/deal-1/contacts') && method === 'POST') {
      deal.contacts = [primaryContact];
      deal.primary_contact = primaryContact;
      deal.contact_count = 1;
      addHistory('contact_linked', { contact_id: primaryContact.id });
      return json(route, ok(deal));
    }
    if (path.endsWith('/deals/deal-1/conversations') && method === 'POST') {
      deal.conversations = [conversation];
      deal.conversation_count = 1;
      if (!deal.contacts.length) {
        deal.contacts = [primaryContact];
        deal.primary_contact = primaryContact;
        deal.contact_count = 1;
      }
      addHistory('conversation_linked', { conversation_id: conversation.id });
      return json(route, ok(deal));
    }
    if (path.endsWith('/deals/deal-1/files') && method === 'POST') {
      file = {
        id: 'file-1',
        name: 'proposta.txt',
        byte_size: 18,
        content_type: 'text/plain',
        url: 'data:text/plain,proposta',
      };
      deal.files = [file];
      deal.file_count = 1;
      addHistory('files_attached', { file_ids: ['file-1'] });
      return json(route, ok([file]));
    }
    if (path.endsWith('/deals/deal-1/files/file-1') && method === 'DELETE') {
      file = null;
      deal.files = [];
      deal.file_count = 0;
      addHistory('file_removed', { file_id: 'file-1' });
      return json(route, ok({ success: true }));
    }

    return json(route, ok(path.endsWith('/account') ? { id: 'account-1', locale: 'pt_BR' } : []));
  });

  return { getDeal: () => deal, getFile: () => file };
}

for (const { width, theme } of scenarios) {
  test(`fluxo comercial completo em ${width}px / ${theme}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(selectedTheme => {
      localStorage.setItem('access_token', 'e2e-token');
      localStorage.setItem('theme', selectedTheme);
      localStorage.setItem('i18nextLng', 'pt-BR');
    }, theme);
    const state = await installApi(page);

    await page.goto('/pipelines/pipeline-1');
    await expect(page.getByRole('button', { name: 'Prefiro explorar sozinho' })).toBeHidden();
    await expect(page.getByText('Pipeline Comercial').first()).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/authenticated-panel-density/);
    expect(await page.locator('body').evaluate(element => getComputedStyle(element).zoom)).toBe('0.9');
    const shellWidth = await page
      .locator('.authenticated-shell')
      .evaluate(element => Number.parseFloat(getComputedStyle(element).width));
    expect(shellWidth).toBeCloseTo(width / 0.9, 1);
    const stageWidths = await page.locator('section.kanban-column[data-stage-id]').evaluateAll(elements =>
      elements.map(element => getComputedStyle(element).width),
    );
    expect(stageWidths).toEqual(['304px', '304px']);

    await page.getByRole('button', { name: 'Adicionar negócio' }).first().click();
    await page.getByLabel('Título do negócio').fill('Expansão anual');
    await page.getByLabel('Valor (BRL)').fill('12500');
    await page.getByRole('button', { name: 'Adicionar Item', exact: true }).last().click();
    await expect(page.getByText('Expansão anual')).toBeVisible();

    await page.getByRole('button', { name: /Mover cart/ }).click();
    await page.getByRole('menuitem', { name: 'Proposta' }).click();
    await expect(page.getByText('Expansão anual')).toBeVisible();

    // O negócio abre como modal sobre o quadro (URL ?deal=&tab=), sem sair do kanban.
    await page.getByRole('button', { name: 'Expansão anual', exact: true }).click();
    await expect(page).toHaveURL(/\/pipelines\/pipeline-1\?deal=deal-1&tab=activities/);
    const modal = page.getByRole('dialog');
    const dealTabs = modal.getByRole('navigation', { name: 'Seções do negócio' });

    await dealTabs.getByRole('button', { name: 'Contato', exact: true }).click();
    await modal.getByLabel('Selecionar contato').selectOption('contact-1');
    await modal.getByRole('button', { name: 'Associar como principal' }).click();
    await expect(modal.getByText('Contato principal', { exact: true })).toBeVisible();

    await dealTabs.getByRole('button', { name: 'Empresa', exact: true }).click();
    await modal.getByLabel('Selecionar empresa').selectOption('company-1');
    await modal.getByRole('button', { name: 'Associar empresa' }).click();
    await expect(modal.getByText('Acme Ltda.').first()).toBeVisible();

    // edição inline: cada campo salva ao confirmar (Enter/sair do campo)
    await dealTabs.getByRole('button', { name: 'Negócio', exact: true }).click();
    const edit = async (label: string, value: string) => {
      await modal.getByRole('button', { name: label, exact: true }).click();
      const input = modal.getByRole('textbox', { name: label }).or(modal.getByRole('spinbutton', { name: label }));
      await input.fill(value);
      await input.press(label === 'Anotações' ? 'Control+Enter' : 'Enter'); // texto longo: Ctrl+Enter (ou sair do campo)
    };
    await edit('Título', 'Expansão enterprise');
    await edit('Valor', '18000');
    await modal.getByRole('button', { name: 'Campos do pipeline' }).click();
    await edit('utm_source', 'playwright');
    await modal.getByRole('button', { name: 'Informações gerais' }).click();
    await edit('Anotações', 'Próximo passo: enviar contrato.');
    await modal.getByRole('button', { name: 'Adicionar tag' }).click();
    await modal.getByRole('button', { name: 'Expansão', exact: true }).click();
    await page.keyboard.press('Escape'); // fecha só o menu de tags; o modal continua aberto
    await expect(modal.getByRole('group', { name: 'Tags disponíveis' })).toHaveCount(0);
    await expect(modal.getByRole('heading', { name: /Expansão enterprise/ })).toBeVisible();
    await expect.poll(() => state.getDeal().notes).toBe('Próximo passo: enviar contrato.');
    await expect.poll(() => state.getDeal().labels.map(label => label.title)).toEqual(['Expansão']);

    await dealTabs.getByRole('button', { name: 'Conversas', exact: true }).click();
    await expect(page).toHaveURL(/tab=conversations/);
    await modal.getByLabel('Selecionar conversa').selectOption('conversation-1');
    await modal.getByRole('button', { name: 'Associar', exact: true }).click();
    await expect(modal.getByText('#42 · Marina Costa')).toBeVisible();

    await dealTabs.getByRole('button', { name: 'Arquivos', exact: true }).click();
    await modal.locator('input[type="file"]').setInputFiles({
      name: 'proposta.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('proposta enterprise'),
    });
    await expect(modal.getByText('proposta.txt')).toBeVisible();
    expect(state.getFile()).not.toBeNull();
    await modal.getByRole('button', { name: 'Remover proposta.txt' }).click();
    await expect(modal.getByText('proposta.txt')).toHaveCount(0);
    expect(state.getFile()).toBeNull();

    await dealTabs.getByRole('button', { name: 'Histórico', exact: true }).click();
    for (const label of ['Negócio criado', 'Mudou de etapa', 'Contato associado', 'Conversa associada', 'Arquivos anexados', 'Arquivo removido'])
      await expect(modal.getByText(label, { exact: true }).first()).toBeVisible();

    await modal.getByRole('button', { name: 'Fechar negócio' }).click();
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/pipelines\/pipeline-1$/);
    await expect(page.getByRole('button', { name: 'Expansão enterprise', exact: true })).toBeVisible();
    await expect(page.getByText('Expansão', { exact: true })).toBeVisible();
    await expect(page.getByText('Tag exclusiva do contato')).toHaveCount(0);
    expect(state.getDeal().labels.map(label => label.title)).toEqual(['Expansão']);
    expect(state.getDeal().primary_contact?.labels?.[0]?.title).toBe('Tag exclusiva do contato');
  });
}

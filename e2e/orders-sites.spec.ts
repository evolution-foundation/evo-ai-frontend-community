import { test, expect, Page, APIRequestContext } from '@playwright/test';

// E2E temporario: valida a pagina Ordens (crash fix + geracao de OS) e o
// gerenciamento do submenu Sites (+ adicionar, editar/excluir via botao direito).

const CRM = 'http://localhost:3010';

test.setTimeout(120_000);

async function login(page: Page, token: string) {
  await page.addInitScript((t) => localStorage.setItem('access_token', t), token);
}

async function gotoAuthed(page: Page, path: string) {
  // Pre-warm: evita que o primeiro validate lento do evo-auth derrube a sessão
  await page.request.post('http://localhost:3011/api/v1/auth/validate', {
    headers: { Authorization: `Bearer ${process.env.E2E_TOKEN}` },
    failOnStatusCode: false,
  }).catch(() => null);
  for (let i = 0; i < 5; i++) {
    await page.goto(path, { waitUntil: 'networkidle' });
    if (!page.url().includes('/login')) return;
    await page.waitForTimeout(4000);
  }
}

// Marca tours como vistos para o overlay react-joyride nao bloquear cliques
async function dismissTours(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  for (const key of ['onboarding:preference', 'onboarding:welcome', 'dashboard']) {
    await request.post(`${CRM}/api/v1/user_tours`, {
      headers,
      data: { tour: { tour_key: key, status: 'skipped' } },
    }).catch(() => null);
  }
}

test('orders page loads, creates OS with document preview', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  const token = process.env.E2E_TOKEN!;
  await dismissTours(page.request, token);
  await login(page, token);
  await gotoAuthed(page, '/orders');

  await expect(page.getByText('Ordens de Serviço').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Registrar OS' })).toBeVisible();
  expect(errors).toEqual([]);

  // Preenche e submete uma nova OS
  await page.fill('#os-nome', 'Cliente Teste OS');
  await page.fill('#os-aparelho', 'iPhone 13');
  await expect(page.getByText('Alterações não salvas')).toBeVisible();
  // Sem salvar o cliente: deve perguntar antes de registrar
  await page.getByRole('button', { name: 'Cadastrar Ordem de Serviço' }).click();
  await expect(page.getByRole('heading', { name: 'Salvar dados do cliente?' })).toBeVisible();
  await page.getByRole('button', { name: 'Não salvar' }).click();

  // Modal de documento gerado
  await expect(page.getByText('Ordem de Serviço Registrada!')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#printable-os-preview')).toBeVisible();
  await expect(page.locator('#printable-os-preview')).toContainText('Cliente Teste OS');
  await expect(page.getByRole('button', { name: /Baixar PDF/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Imprimir/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /WhatsApp/ })).toBeVisible();

  await page.getByRole('button', { name: 'Fechar' }).click();

  // Consultar: ordem aparece na tabela
  await page.getByRole('button', { name: 'Consultar OS' }).click();
  await expect(page.getByText('Cliente Teste OS').first()).toBeVisible();

  // Cleanup via API: busca pelo cliente e apaga pelo id
  const headers = { Authorization: `Bearer ${token}` };
  const list = await page.request.get(`${CRM}/api/v1/work_orders?q=Cliente%20Teste%20OS`, { headers });
  const body = await list.json();
  const ids: string[] = (body?.data ?? []).map((o: { id: string }) => o.id);
  for (const id of ids) {
    const del = await page.request.delete(`${CRM}/api/v1/work_orders/${id}`, { headers });
    console.log('cleanup status:', del.status(), 'id:', id);
  }
});

test('sites submenu: add, visit, edit and delete custom link', async ({ page }) => {
  const token = process.env.E2E_TOKEN!;
  await dismissTours(page.request, token);
  await login(page, token);
  await gotoAuthed(page, '/orders');
  await expect(page.locator('nav').first()).toBeVisible({ timeout: 20_000 });

  // Abre o submenu Sites
  await page.locator('nav').first().getByText('Sites', { exact: true }).click();
  await expect(page.getByLabel('Adicionar site')).toBeVisible();

  // Adiciona um site
  await page.getByLabel('Adicionar site').click();
  await expect(page.getByRole('heading', { name: 'Adicionar site' })).toBeVisible();
  await page.fill('#site-name', 'Site Teste');
  await page.fill('#site-url', 'exemplo-teste.com.br');
  await page.getByRole('button', { name: 'Salvar' }).click();

  // Item aparece no submenu
  const submenuItem = page.locator('a[href="/sites/site-teste"]');
  await expect(submenuItem).toHaveCount(1);

  // Visita o link — pagina dinamica com iframe
  await submenuItem.click();
  await expect(page.getByRole('heading', { name: 'Site Teste' })).toBeVisible();
  await expect(page.locator('iframe[title="Site Teste"]')).toHaveAttribute('src', 'https://exemplo-teste.com.br');

  // Volta ao menu e edita via botao direito
  await gotoAuthed(page, '/dashboard');
  await page.locator('nav').first().getByText('Sites', { exact: true }).click();
  await submenuItem.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await page.fill('#site-name', 'Site Teste Editado');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator('a[href="/sites/site-teste"]')).toContainText('Site Teste Editado');

  // Exclui via botao direito
  await page.locator('a[href="/sites/site-teste"]').click({ button: 'right' });
  page.once('dialog', (d) => d.accept());
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await expect(page.locator('a[href="/sites/site-teste"]')).toHaveCount(0);

  // azuliapp continua la
  await expect(page.locator('a[href="/sites/azuliapp"]')).toHaveCount(1);
});

test('organizacao: menu, formulario e persistencia dos dados da empresa', async ({ page }) => {
  const token = process.env.E2E_TOKEN!;
  await dismissTours(page.request, token);
  await login(page, token);
  await gotoAuthed(page, '/orders');
  await expect(page.locator('nav').first()).toBeVisible({ timeout: 20_000 });

  // Menu Organizacao com submenu Dados da Empresa
  await page.locator('nav').first().getByText('Organização', { exact: true }).click();
  const submenu = page.locator('a[href="/organizacao/dados-empresa"]');
  await expect(submenu).toHaveCount(1);

  // Pagina de dados da empresa
  await submenu.click();
  await expect(page.getByRole('heading', { name: 'Dados da Empresa' })).toBeVisible();

  // Preenche campos principais + paleta
  await page.fill('#org-nome-curto', 'Azuli Teste');
  await page.fill('#org-nome-completo', 'Azuli Teste Tecnologia Ltda');
  await page.fill('#org-cnpj', '12.345.678/0001-90');
  await page.fill('#org-missao', 'Nossa missão de teste');
  await page.fill('#org-contato-geral', '(11) 90000-0000');
  await page.fill('#org-instagram', '@azuliteste');
  await page.getByRole('button', { name: 'Adicionar Cor' }).click();
  await page.getByPlaceholder('Nome (ex: Primária)').fill('Primária');
  await page.fill('#org-hashtags', '#teste #azuli');

  await page.getByRole('button', { name: /Salvar/ }).click();
  await expect(page.getByText('Dados da organização salvos!')).toBeVisible();

  // Recarrega e valida persistencia
  await gotoAuthed(page, '/organizacao/dados-empresa');
  await expect(page.getByRole('heading', { name: 'Dados da Empresa' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#org-nome-curto')).toHaveValue('Azuli Teste');
  await expect(page.locator('#org-cnpj')).toHaveValue('12.345.678/0001-90');
  await expect(page.getByPlaceholder('Nome (ex: Primária)')).toHaveValue('Primária');

  // Limpa o localStorage do teste
  await page.evaluate(() => {
    localStorage.removeItem('organization-profile');
    localStorage.removeItem('organization-profile-colors');
  });
});

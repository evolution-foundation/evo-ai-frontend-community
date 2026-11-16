import { test, expect, type Page } from '@playwright/test';
import { installVetorialAPI } from './vetorial-api';
import fs from 'node:fs';
import path from 'node:path';
const output = process.env.N5_CAPTURES || 'test-results/n5';
async function setup(page: Page, theme: string, enabled = true, update = true) {
  await page.addInitScript(({ theme }) => {
    localStorage.setItem('access_token', 'synthetic-local');
    localStorage.setItem('theme', theme);
    localStorage.setItem('i18nextLng', 'pt-BR');
  }, { theme });
  await installVetorialAPI(page);
  const user = { id: '00000000-0000-4000-8000-000000000055', name: 'Pessoa sintética N5', email: 'synthetic@example.invalid', availability: 'offline', confirmed: true, role: { name: 'Atendimento', key: 'agent' }, permissions: [], created_at: '2026-11-16T12:00:00Z', invitation_status: 'pending', invitation_sent_at: '2026-11-16T12:00:00Z', invitation_delivery_status: 'sent', invitation_request_id: 'previous', can_resend_invite: true, next_resend_at: null as string | null };
  const state = { posts: 0, status: 202, code: '', created: [] as Record<string, unknown>[], user };
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    const reply = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (p.endsWith('/permissions')) return reply({ success: true, data: { permissions: ['users.manage', 'users.read', 'users.create', 'users.bulk_operations', ...(update ? ['users.update'] : [])] } });
    if (p.endsWith('/invitation_capabilities')) return reply({ success: true, data: { user_invitations_enabled: enabled } });
    if (p.endsWith('/resend_invite')) {
      state.posts++;
      await new Promise(resolve => setTimeout(resolve, 200));
      if (state.status !== 202) return reply({ success: false, error: { code: state.code, message: 'PRIVATE SMTP DETAIL', details: { next_resend_at: '2026-11-17T12:00:00Z' } } }, state.status);
      state.user.invitation_delivery_status = 'queued'; state.user.invitation_request_id = 'request-new'; state.user.can_resend_invite = false;
      return reply({ success: true, data: { user_id: user.id, request_id: 'request-new', next_resend_at: '2026-11-17T12:00:00Z', delivery_status: 'queued' } }, 202);
    }
    if (p.endsWith('/users')) {
      if (route.request().method() === 'POST') {
        state.created.push(route.request().postDataJSON());
        return reply({ success: true, data: { user } }, 201);
      }
      return reply({ success: true, data: [state.user], meta: { pagination: { page: 1, page_size: 20, total: 1, total_pages: 1, has_next_page: false, has_previous_page: false } } });
    }
    if (p.endsWith('/roles')) return reply({ success: true, data: [] });
    return route.fallback();
  });
  return state;
}
for (const theme of ['light', 'dark']) {
  test(`invitation card/table, confirmation, single request and failure ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const state = await setup(page, theme);
    await page.goto('/settings/users');
    await expect(page.getByText('Convite pendente', { exact: true })).toBeVisible();
    await expect(page.getByText(/Último envio:/)).toBeVisible();
    await page.getByRole('button', { name: 'Reenviar convite', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('O link anterior deixará de funcionar.');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(state.posts).toBe(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ animations: 'disabled', path: path.join(output, `n5-cartao-${theme}.png`), fullPage: true });
    // The view toggles predate this feature and contain only icons.
    await page.locator('button').filter({ has: page.locator('svg.lucide-list') }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await page.getByRole('button', { name: 'Reenviar convite', exact: true }).click();
    await page.screenshot({ animations: 'disabled', path: path.join(output, `n5-confirmacao-${theme}.png`), fullPage: true });
    await page.getByRole('dialog').getByRole('button', { name: 'Reenviar convite', exact: true }).dblclick();
    await expect.poll(() => state.posts).toBe(1);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Reenvio solicitado.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reenviar convite', exact: true })).toBeDisabled();
    state.user.invitation_delivery_status = 'failed';
    await expect(page.getByText(/O serviço de e-mail está indisponível/).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ animations: 'disabled', path: path.join(output, `n5-tabela-falha-${theme}.png`), fullPage: true });
    expect(state.posts).toBe(1);
  });
}
test('capability off and missing update permission hide resend; off requires password', async ({ page }) => {
  await setup(page, 'light', false);
  await page.goto('/settings/users');
  await expect(page.getByText('Pessoa sintética N5', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reenviar convite', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Convidar em Massa' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Novo Atendente', exact: true }).click();
  await expect(page.getByText('Deixe em branco para enviar um convite por e-mail.')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
});
test('missing users.update hides resend even when capability is true', async ({ page }) => {
  await setup(page, 'light', true, false);
  await page.goto('/settings/users');
  await expect(page.getByText('Pessoa sintética N5', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reenviar convite', exact: true })).toHaveCount(0);
});
for (const [status, code, message] of [[429, 'INVITE_RATE_LIMITED', /Aguarde até/], [409, 'INVITE_NOT_ELIGIBLE', /já definiu a senha/], [503, 'INVITE_QUEUE_UNAVAILABLE', /serviço de e-mail está indisponível/]] as const) {
  test(`resend sanitizes ${status}`, async ({ page }) => {
    const state = await setup(page, 'light'); state.status = status; state.code = code;
    await page.goto('/settings/users');
    await page.getByRole('button', { name: 'Reenviar convite', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reenviar convite', exact: true }).click();
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByText('PRIVATE SMTP DETAIL')).toHaveCount(0);
    expect(state.posts).toBe(1);
  });
}
test('mobile invitation is visible and keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, 'dark'); await page.goto('/settings/users');
  const resend = page.getByRole('button', { name: 'Reenviar convite', exact: true });
  await expect(resend).toBeVisible(); await resend.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ animations: 'disabled', path: path.join(output, 'n5-mobile-dark.png'), fullPage: true });
});
for (const theme of ['light', 'dark']) {
  test(`reset invitation strips query and blocks remote resources ${theme}`, async ({ page }) => {
    const external: string[] = [];
    await page.addInitScript(theme => { localStorage.setItem('theme', theme); localStorage.setItem('i18nextLng', 'pt-BR'); }, theme);
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) { external.push(url.origin); return route.abort(); }
      return route.continue();
    });
    await page.goto('/auth/reset-password?reset_password_token=synthetic-not-valid&purpose=invite');
    await expect(page.getByRole('heading', { name: 'Defina sua senha' })).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/reset-password$/);
    await expect(page.getByRole('button', { name: 'Salvar senha' })).toBeVisible();
    await page.screenshot({ animations: 'disabled', path: path.join(output, `n5-definir-senha-${theme}.png`), fullPage: true });
    expect(external).toEqual([]);
  });
}

test('create omits blank password; explicit password has complexity validation', async ({ page }) => {
  const state = await setup(page, 'light');
  await page.goto('/settings/users');
  await page.getByRole('button', { name: 'Novo Atendente', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.locator('#name').fill('Pessoa sintética');
  await modal.locator('#email').fill('synthetic@example.invalid');
  await expect(page.getByText('Deixe em branco para enviar um convite por e-mail.')).toBeVisible();
  await modal.locator('#password').fill('weakpass');
  await modal.locator('#confirmPassword').fill('weakpass');
  await modal.getByRole('button', { name: 'Criar Atendente', exact: true }).click();
  await expect(page.getByText(/Use de 8 a 128 caracteres/)).toBeVisible();
  expect(state.created).toHaveLength(0);
  await modal.locator('#password').fill(''); await modal.locator('#confirmPassword').fill('');
  await modal.getByRole('button', { name: 'Criar Atendente', exact: true }).click();
  await expect.poll(() => state.created.length).toBe(1);
  expect(state.created[0]).not.toHaveProperty('password');
  expect(state.created[0]).not.toHaveProperty('confirmPassword');
});

test('partial bulk shows requested results and refreshes without closing report', async ({ page }) => {
  await setup(page, 'light');
  let bulkPosts = 0;
  await page.route('**/api/v1/users/bulk_create', route => {
    bulkPosts++;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { count: 1, invited_users: [{ email: 'one@example.invalid', name: 'Sintético' }], failed_invitations: [{ email: 'two@example.invalid', code: 'USER_NOT_CREATED', error: 'Não foi possível criar este usuário.' }] } }) });
  });
  await page.goto('/settings/users');
  await page.getByRole('button', { name: 'Convidar em Massa' }).click();
  await page.locator('#emails').fill(Array.from({ length: 51 }, (_, i) => `test${i}@example.invalid`).join('\n'));
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar Convites', exact: true }).click();
  await expect(page.getByText('Informe no máximo 50 endereços.')).toBeVisible();
  expect(bulkPosts).toBe(0);
  await page.locator('#emails').fill('one@example.invalid\ntwo@example.invalid');
  await page.getByRole('dialog').getByRole('button', { name: 'Enviar Convites', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Convites solicitados (1)', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Não foi possível criar este usuário.', { exact: false })).toBeVisible();
  expect(bulkPosts).toBe(1);
});

test('reset retains token only for POST and uses sanitized invalid invitation message', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'pt-BR'));
  let payload: Record<string, unknown> = {};
  await page.route('**/api/v1/auth/reset_password', route => {
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'PRIVATE DETAIL' } }) });
  });
  await page.goto('/auth/reset-password?reset_password_token=synthetic-not-valid&purpose=invite');
  await page.locator('#password').fill('Strong#123');
  await page.locator('#password_confirmation').fill('Strong#123');
  await page.getByRole('button', { name: 'Salvar senha', exact: true }).click();
  await expect(page.getByText('Este link é inválido ou expirou. Solicite um novo convite ao administrador.').first()).toBeVisible();
  expect(payload.reset_password_token).toBe('synthetic-not-valid');
  await expect(page).toHaveURL(/\/auth\/reset-password$/);
  await expect(page.getByText('PRIVATE DETAIL')).toHaveCount(0);
  await page.goto('/auth/reset-password?reset_password_token=synthetic-normal');
  await expect(page.getByRole('heading', { name: 'Redefinir Senha', exact: true })).toBeVisible();
});

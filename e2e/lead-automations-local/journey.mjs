/* global process */
import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
if (!process.env.L6_CRM_DIR || !process.env.L6_CAPTURE_DIR)
  throw new Error('Set L6_CRM_DIR and L6_CAPTURE_DIR. Use a fresh synthetic test database.');
if (process.env.POSTGRES_DATABASE !== 'evo_l_ui_test')
  throw new Error('POSTGRES_DATABASE must be evo_l_ui_test; never use the RSpec database.');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.goto('http://127.0.0.1:5176/e2e/lead-automations-local/index.html');
if (!process.env.L6_CAPTURE_ONLY) {
  await page.getByText('Nenhuma regra criada.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Criar regra' }).click();
  await page.getByLabel('Nome da regra').fill('Novos leads · Ensaio local L6');
  await page.getByLabel('Anúncio de WhatsApp (CTWA)').check();
  await page.getByLabel('Caixa de WhatsApp').selectOption({ label: 'Caixa sintética L6' });
  await page.getByLabel('Domínio de origem', { exact: true }).check();
  await page.getByLabel('Domínio (sem').fill('co.example.com');
  await page.getByLabel('Pipeline').selectOption({ label: 'Pipeline sintética L6' });
  await page.getByLabel('Etapa inicial').selectOption({ label: 'Novo lead' });
  await page.getByRole('button', { name: 'Salvar regra' }).click();
  await page.getByText('Regra salva.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ativar', exact: true }).click();
  await page.getByText('Ativa', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Testar regra', exact: true }).click();
  await page.getByRole('button', { name: 'Testar regra', exact: true }).click();
  await page.getByText('Criaria negócio', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Voltar à lista', exact: true }).click();
  await page.getByRole('button', { name: 'Últimas execuções', exact: true }).click();
  await page.getByText('Nenhuma execução registrada para este filtro.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Voltar à lista', exact: true }).click();
  await page.getByRole('button', { name: 'Integração do site', exact: true }).click();
  const responsePromise = page.waitForResponse(
    r => r.url().endsWith('/rotate_token') && r.request().method() === 'POST',
  );
  page.on('dialog', d => d.accept());
  await page.getByRole('button', { name: /(Gerar|Renovar) token/ }).click();
  const data = (await (await responsePromise).json()).data;
  await page.getByRole('button', { name: 'Ocultar token', exact: true }).click();
  const eventId = randomUUID();
  const request = {
    data: {
      event_id: eventId,
      page_url: 'https://co.example.com/form',
      contact: { name: 'Contato fictício L6', phone_number: '+15550000607' },
    },
    headers: {
      Authorization: `Bearer ${data.token}`,
      Origin: 'https://co.example.com',
      'Idempotency-Key': eventId,
    },
  };
  const res = await page.request.post(
    `http://127.0.0.1:3016/public/lead_automation_rules/${data.id}/leads`,
    request,
  );
  expect(res.status()).toBe(202);
  const env = {
    ...process.env,
    RAILS_ENV: 'test',
    POSTGRES_HOST: '127.0.0.1',
    POSTGRES_PORT: '55439',
    POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || 'evo_l_ui_test',
    POSTGRES_USERNAME: 'postgres',
    REDIS_URL: 'redis://127.0.0.1:56389',
    SECRET_KEY_BASE: 'synthetic-l1-local-only',
    L6_EVENT_ID: eventId,
  };
  const result = execFileSync(
    'bundle',
    ['exec', 'rails', 'runner', fileURLToPath(new URL('./process.rb', import.meta.url))],
    { cwd: process.env.L6_CRM_DIR, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  console.log(result.trim());
  const replay = await page.request.post(
    `http://127.0.0.1:3016/public/lead_automation_rules/${data.id}/leads`,
    request,
  );
  expect(replay.status()).toBe(202);
  execFileSync(
    'bundle',
    ['exec', 'rails', 'runner', fileURLToPath(new URL('./process.rb', import.meta.url))],
    { cwd: process.env.L6_CRM_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  await page.getByRole('button', { name: 'Voltar à lista', exact: true }).click();
  await page.getByRole('button', { name: 'Últimas execuções', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir negócio', exact: true }).waitFor();
} else {
  await page.getByRole('button', { name: 'Últimas execuções', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir negócio', exact: true }).waitFor();
}
const output = process.env.L6_CAPTURE_DIR;
for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1200 });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      theme => document.documentElement.classList.toggle('dark', theme === 'dark'),
      theme,
    );
    await page.screenshot({ path: `${output}/L6-log-${theme}-${width}.png` });
    await page.getByRole('button', { name: 'Voltar à lista', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Novos leads · Ensaio local L6', exact: true })
      .waitFor();
    await page.screenshot({ path: `${output}/L6-lista-${theme}-${width}.png` });
    await page.getByRole('button', { name: 'Editar regra', exact: true }).click();
    await expect(page.getByLabel('Etapa inicial')).toBeEnabled();
    await expect(page.getByLabel('Etapa inicial')).not.toHaveValue('');
    await page.screenshot({ path: `${output}/L6-edicao-${theme}-${width}.png` });
    if (width === 390) {
      await page
        .getByRole('button', { name: 'Salvar regra', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/L6-edicao-rodape-${theme}-${width}.png` });
    }
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Testar regra', exact: true }).click();
    await page.getByRole('button', { name: 'Testar regra', exact: true }).click();
    await page.getByText('Criaria negócio', { exact: true }).waitFor();
    await page
      .locator('.la-notice[role=status]')
      .evaluate(el => el.scrollIntoView({ block: 'end' }));
    await page.screenshot({ path: `${output}/L6-teste-${theme}-${width}.png` });
    await page.getByRole('button', { name: 'Voltar à lista', exact: true }).click();
    await page.getByRole('button', { name: 'Últimas execuções', exact: true }).click();
    await page.getByRole('link', { name: 'Abrir negócio', exact: true }).waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
}
console.log('LOCAL_INTAKE_202_REPLAY_202_UI_LOG_CREATED_RESPONSIVE_OK');
await browser.close();

import { beforeEach, expect, it, vi } from 'vitest';
import api from '@/services/core/api';
import { leadAutomations as service, type Rule } from './service';
vi.mock('@/services/core/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());
it('normalizes rules with only domain enabled', async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: {
      data: [{ id: 'r', conditions: { domain: { enabled: true, host: 'co.example.com' } } }],
      meta: {},
    },
  });
  const result = await service.list();
  expect(result.data[0].conditions.ctwa).toEqual({
    enabled: false,
    inbox_id: '',
    instance_name: '',
  });
});
it('sends revision in update, activation, delete and rotation bodies', async () => {
  const rule = { id: 'r', revision: 7, active: false } as Rule;
  vi.mocked(api.patch).mockResolvedValue({ data: { data: rule } });
  vi.mocked(api.post).mockResolvedValue({ data: { data: rule } });
  await service.save(rule, rule);
  expect(api.patch).toHaveBeenCalledWith(
    '/lead_automation_rules/r',
    expect.objectContaining({ revision: 7 }),
  );
  await service.activation(rule);
  expect(api.patch).toHaveBeenCalledWith('/lead_automation_rules/r/activation', {
    active: true,
    revision: 7,
  });
  await service.remove(rule);
  expect(api.delete).toHaveBeenCalledWith('/lead_automation_rules/r', { data: { revision: 7 } });
  await service.token(rule);
  expect(api.post).toHaveBeenCalledWith('/lead_automation_rules/r/rotate_token', { revision: 7 });
});
it('forces inactive creation and unwraps dry-run result', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { data: { dry_run: true } } });
  await service.save({ active: true } as Rule);
  expect(api.post).toHaveBeenCalledWith('/lead_automation_rules', { active: false });
  const event = { source: 'none', occurred_at: '', contact_created_at: '' };
  expect(await service.test('r', event)).toEqual({ dry_run: true });
  expect(api.post).toHaveBeenLastCalledWith('/lead_automation_rules/r/test', { event });
});

import { describe, it, expect, vi } from 'vitest';
import api, { validFlowUrl } from './apiEvoFlow';
const config = vi.hoisted(() => ({ evoFlowPublicUrl: null as string | null }));
vi.mock('@/contexts/GlobalConfigContext', () => ({ fetchGlobalConfig: async () => config }));
describe('Flow transport', () => {
  it('uses the runtime public service for configured journeys', async () => {
    config.evoFlowPublicUrl = 'https://flow.example.test/';
    const adapter = vi.fn(async (request) => ({ data: [], status: 200, statusText: 'OK', headers: {}, config: request }));
    await api.get('/journeys', { adapter });
    expect(adapter.mock.calls[0][0].baseURL).toBe('https://flow.example.test/api/v1');
  });
  it('never sends a request without a public service', async () => {
    config.evoFlowPublicUrl = null;
    const adapter = vi.fn();
    await expect(api.get('/journeys', { adapter })).rejects.toThrow('Jornadas indisponíveis');
    expect(adapter).not.toHaveBeenCalled();
  });
  it.each(['PLACEHOLDER', 'undefined', '/flow', 'ftp://flow.test', 'https://u:p@flow.test', 'https://flow.test?token=x', 'https://flow.test#x'])(
    'rejects invalid or sensitive URL %s', value => expect(validFlowUrl(value)).toBeUndefined(),
  );
});

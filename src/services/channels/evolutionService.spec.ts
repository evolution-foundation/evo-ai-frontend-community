import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/core/api';
import EvolutionService from './evolutionService';

vi.mock('@/services/core/api', () => ({ default: { post: vi.fn() } }));

describe('EvolutionService.verifyConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } });
  });

  it.each(['test', 'create'] as const)('forwards %s mode to the backend', async mode => {
    await EvolutionService.verifyConnection({
      apiUrl: 'https://evolution.example.com', adminToken: 'synthetic-token',
      instanceName: 'shimon', phoneNumber: '+333', mode,
    });
    expect(api.post).toHaveBeenCalledWith('/evolution/authorization', {
      authorization: expect.objectContaining({ mode, instance_name: 'shimon' }),
    });
  });
});

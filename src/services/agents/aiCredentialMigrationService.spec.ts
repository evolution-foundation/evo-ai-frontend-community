import { beforeEach, describe, expect, it, vi } from 'vitest';

// The CRM Ruby client (:3000), not the core: Ai::MigrationState lives in Rails.
const mockApi = { get: vi.fn() };
vi.mock('@/services/core/api', () => ({
  default: { get: (...args: unknown[]) => mockApi.get(...args) },
}));

import { getAiCredentialMigrationState } from './aiCredentialMigrationService';

describe('getAiCredentialMigrationState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the two booleans out of the CRM envelope', async () => {
    mockApi.get.mockResolvedValue({
      data: { success: true, data: { migrated: false, legacy_fallback_active: true } },
    });

    await expect(getAiCredentialMigrationState()).resolves.toEqual({
      migrated: false,
      legacy_fallback_active: true,
    });
    expect(mockApi.get).toHaveBeenCalledWith('/ai_credentials/migration_state');
  });

  it('propagates a failure so the caller decides how to degrade', async () => {
    mockApi.get.mockRejectedValue(new Error('404'));

    await expect(getAiCredentialMigrationState()).rejects.toThrow('404');
  });
});

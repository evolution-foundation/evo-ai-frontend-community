import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { setupService } from '@/services/setup/setupService';
import {
  GlobalConfigProvider,
  useGlobalConfig,
  clearGlobalConfigCache,
  clearSetupCache,
  GlobalConfig,
} from './GlobalConfigContext';

// Mock setupService
vi.mock('@/services/setup/setupService', () => ({
  setupService: {
    getStatus: vi.fn().mockResolvedValue({ status: 'active' }),
  },
}));

// Mock Clarity
vi.mock('@/utils/clarityUtils', () => ({
  initClarity: vi.fn(),
}));

const mockApi = {
  get: vi.fn(),
};

vi.mock('@/services/core', () => ({
  api: {
    get: (...args: unknown[]) => mockApi.get(...args),
  },
}));

function ConfigDisplay() {
  const config = useGlobalConfig();
  return <pre data-testid="config">{JSON.stringify(config)}</pre>;
}

describe('GlobalConfigContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGlobalConfigCache();
    clearSetupCache();
  });

  it('provides all expected fields from the API response', async () => {
    const fullConfig: GlobalConfig = {
      fbAppId: 'fb-123',
      fbApiVersion: 'v17.0',
      wpAppId: 'wp-456',
      wpApiVersion: 'v23.0',
      wpWhatsappConfigId: 'wp-config-789',
      instagramAppId: 'ig-101',
      googleOAuthClientId: 'google-202',
      azureAppId: 'azure-303',
      hasEvolutionConfig: true,
      hasEvolutionGoConfig: false,
      openaiConfigured: true,
      enableAccountSignup: true,
      recaptchaSiteKey: '6Lc_test_key',
      clarityProjectId: 'clarity_test_id',
    };

    mockApi.get.mockResolvedValueOnce({ data: fullConfig });

    render(
      <GlobalConfigProvider>
        <ConfigDisplay />
      </GlobalConfigProvider>,
    );

    await waitFor(() => {
      const configEl = screen.getByTestId('config');
      const parsed = JSON.parse(configEl.textContent || '{}');

      // Verify all expected fields are present
      expect(parsed.fbAppId).toBe('fb-123');
      expect(parsed.hasEvolutionConfig).toBe(true);
      expect(parsed.hasEvolutionGoConfig).toBe(false);
      expect(parsed.openaiConfigured).toBe(true);
      expect(parsed.enableAccountSignup).toBe(true);
      expect(parsed.recaptchaSiteKey).toBe('6Lc_test_key');
      expect(parsed.clarityProjectId).toBe('clarity_test_id');
    });
  });

  it('provides setupRequired and setupLoading fields', async () => {
    mockApi.get.mockResolvedValueOnce({ data: {} });

    render(
      <GlobalConfigProvider>
        <ConfigDisplay />
      </GlobalConfigProvider>,
    );

    await waitFor(() => {
      const configEl = screen.getByTestId('config');
      const parsed = JSON.parse(configEl.textContent || '{}');

      expect(parsed).toHaveProperty('setupRequired');
      expect(parsed).toHaveProperty('setupLoading');
    });
  });

  // EVO-971: when the /setup/status call fails (e.g. auth-service still warming
  // up on first `docker compose up`), the frontend must default to showing the
  // setup wizard rather than stranding the user on /login with no way to
  // bootstrap. Bootstrap itself rejects double-init, so this is safe.
  it('defaults setupRequired=true when /setup/status fails', async () => {
    vi.mocked(setupService.getStatus).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    mockApi.get.mockResolvedValueOnce({ data: {} });

    render(
      <GlobalConfigProvider>
        <ConfigDisplay />
      </GlobalConfigProvider>,
    );

    await waitFor(() => {
      const configEl = screen.getByTestId('config');
      const parsed = JSON.parse(configEl.textContent || '{}');
      expect(parsed.setupRequired).toBe(true);
      expect(parsed.setupLoading).toBe(false);
    });
  });
});

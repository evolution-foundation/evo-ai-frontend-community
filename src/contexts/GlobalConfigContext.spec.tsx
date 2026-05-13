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

  // EVO-1046: a transient /setup/status failure (network hiccup, auth-service
  // restart) must NOT push a logged-in user to the bootstrap wizard. Fresh
  // installs are already handled by the auth-service /setup/status reporting
  // `inactive` when User.exists? is false (commit 2c7e6b8, EVO-971), so the
  // fail-open path is no longer needed and was actively harmful (operators
  // could re-run bootstrap by accident on a healthy install).
  it('defaults setupRequired=false when /setup/status fails (no fail-open to wizard)', async () => {
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
      expect(parsed.setupRequired).toBe(false);
      expect(parsed.setupLoading).toBe(false);
    });
  });
});

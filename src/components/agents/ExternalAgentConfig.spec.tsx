import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExternalAgentConfig, { type ExternalAgentConfigData } from './ExternalAgentConfig';

// EVO-2250 story 2.3 (front): the external agent points at a vault credential
// by credential_id, and the inline secret keeps travelling as the fallback.

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const getIntegration = vi.fn();
const upsertIntegration = vi.fn();

vi.mock('@/services/agents/integrationService', () => ({
  default: {
    getIntegration: (...args: unknown[]) => getIntegration(...args),
    upsertIntegration: (...args: unknown[]) => upsertIntegration(...args),
  },
}));

const listIntegrationCredentials = vi.fn();
const getIntegrationVaultMigrationState = vi.fn();

vi.mock('@/services/agents', () => ({
  listIntegrationCredentials: (...args: unknown[]) => listIntegrationCredentials(...args),
  getIntegrationVaultMigrationState: (...args: unknown[]) =>
    getIntegrationVaultMigrationState(...args),
}));

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  listIntegrationCredentials.mockResolvedValue([]);
  getIntegrationVaultMigrationState.mockResolvedValue({ retired: {} });
  getIntegration.mockResolvedValue({ config: {} });
  upsertIntegration.mockResolvedValue({});
});

function renderConfig(data: ExternalAgentConfigData, onChange = vi.fn()) {
  const onValidationChange = vi.fn();
  const utils = render(
    <ExternalAgentConfig
      mode="edit"
      agentId="agent-1"
      data={data}
      onChange={onChange}
      onValidationChange={onValidationChange}
    />,
  );
  return { ...utils, onChange, onValidationChange };
}

describe('ExternalAgentConfig — vault credential selector (2.3 AC7)', () => {
  it('renders the selector for providers with a credential', async () => {
    renderConfig({ provider: 'dify', dify_apiUrl: 'https://api.dify.ai/v1', dify_apiKey: 'app-x' });

    await waitFor(() =>
      expect(document.getElementById('external-agent-credential')).not.toBeNull(),
    );
  });

  it('never offers the selector for typebot, which has no credential (AC6, negative proof)', async () => {
    renderConfig({ provider: 'typebot', typebot_url: 'https://t.io', typebot_typebot: 'bot' });

    await screen.findByText('edit.configuration.sections.externalIntegration.providerConfig.title');
    expect(document.getElementById('external-agent-credential')).toBeNull();
    // No vault fetch either: the hook stays disabled for typebot.
    expect(listIntegrationCredentials).not.toHaveBeenCalled();
  });

  it('saves credential_id ALONGSIDE the inline key (fallback preserved, negative proof)', async () => {
    const user = userEvent.setup();
    renderConfig({
      provider: 'dify',
      credential_id: 'cred-dify',
      dify_apiUrl: 'https://api.dify.ai/v1',
      dify_apiKey: 'app-inline',
      dify_botType: 'chatBot',
    });

    await user.click(await screen.findByText('edit.configuration.sections.externalIntegration.providerConfig.save'));

    await waitFor(() => expect(upsertIntegration).toHaveBeenCalled());
    const [, payload] = upsertIntegration.mock.calls[0];
    expect(payload.config.credential_id).toBe('cred-dify');
    // The wholesale upsert replaces config: dropping the inline key here would
    // erase the stored fallback (the 1.6 data-loss path).
    expect(payload.config.apiKey).toBe('app-inline');
  });

  it('omits credential_id from the payload when none is chosen', async () => {
    const user = userEvent.setup();
    renderConfig({
      provider: 'dify',
      dify_apiUrl: 'https://api.dify.ai/v1',
      dify_apiKey: 'app-inline',
    });

    await user.click(await screen.findByText('edit.configuration.sections.externalIntegration.providerConfig.save'));

    await waitFor(() => expect(upsertIntegration).toHaveBeenCalled());
    const [, payload] = upsertIntegration.mock.calls[0];
    expect(payload.config).not.toHaveProperty('credential_id');
  });

  it('accepts a vault reference in place of the inline key on validation', async () => {
    const { onValidationChange } = renderConfig({
      provider: 'dify',
      credential_id: 'cred-dify',
      dify_apiUrl: 'https://api.dify.ai/v1',
      dify_apiKey: '',
    });

    await waitFor(() => expect(onValidationChange).toHaveBeenCalled());
    const lastCall = onValidationChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(true);
  });

  it('still requires a secret when neither inline nor vault is set (negative proof)', async () => {
    const { onValidationChange } = renderConfig({
      provider: 'dify',
      dify_apiUrl: 'https://api.dify.ai/v1',
      dify_apiKey: '',
    });

    await waitFor(() => expect(onValidationChange).toHaveBeenCalled());
    const lastCall = onValidationChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(false);
  });

  // EVO-2250 story 2.7 (gap closed): the inline key of the external agent
  // retires behind the external_agents consumer of the migration guard.
  describe('inline key retirement (2.7)', () => {
    beforeEach(() => {
      getIntegrationVaultMigrationState.mockResolvedValue({
        retired: { external_agents: true },
      });
    });

    it('locks the inline key input and shows the vault hint when retired', async () => {
      renderConfig({
        provider: 'dify',
        dify_apiUrl: 'https://api.dify.ai/v1',
        credential_id: 'cred-dify',
      });

      await waitFor(() =>
        expect(document.getElementById('dify_apiKey')).toHaveProperty('disabled', true),
      );
      expect(screen.getByText('retirement.externalKeyLocked')).toBeInTheDocument();
      // The address field is NOT a secret and stays editable.
      expect(document.getElementById('dify_apiUrl')).toHaveProperty('disabled', false);
    });

    it('keeps an existing inline key travelling in the payload after retirement (negative proof)', async () => {
      const user = userEvent.setup();
      renderConfig({
        provider: 'dify',
        dify_apiUrl: 'https://api.dify.ai/v1',
        dify_apiKey: 'app-preservada',
        credential_id: 'cred-dify',
      });

      await user.click(
        await screen.findByText('edit.configuration.sections.externalIntegration.providerConfig.save'),
      );

      await waitFor(() => expect(upsertIntegration).toHaveBeenCalled());
      const [, payload] = upsertIntegration.mock.calls[0];
      // This fails if retirement ever drops the inline value from the payload:
      // the upsert replaces config wholesale and the fallback would be erased.
      expect(payload.config.apiKey).toBe('app-preservada');
      expect(payload.config.credential_id).toBe('cred-dify');
    });

    it('OMITS a blank key instead of sending it present-empty (negative proof of the erase path)', async () => {
      const user = userEvent.setup();
      getIntegration.mockResolvedValue({
        // The sanitized GET: the saved key never comes back.
        config: { apiUrl: 'https://api.dify.ai/v1', credential_id: 'cred-dify' },
      });
      renderConfig({
        provider: 'dify',
        dify_apiUrl: 'https://api.dify.ai/v1',
        dify_apiKey: '',
        credential_id: 'cred-dify',
      });

      await user.click(
        await screen.findByText('edit.configuration.sections.externalIntegration.providerConfig.save'),
      );

      await waitFor(() => expect(upsertIntegration).toHaveBeenCalled());
      const [, payload] = upsertIntegration.mock.calls[0];
      // A PRESENT blank wins over the stored secret in the backend merge, so
      // it must never travel: absence is what means "keep the stored value".
      expect(payload.config).not.toHaveProperty('apiKey');
    });

    it('keeps everything editable while the guard says not migrated (AC3)', async () => {
      getIntegrationVaultMigrationState.mockResolvedValue({ retired: {} });
      renderConfig({
        provider: 'dify',
        dify_apiUrl: 'https://api.dify.ai/v1',
        dify_apiKey: 'app-x',
      });

      await waitFor(() => expect(getIntegrationVaultMigrationState).toHaveBeenCalled());
      expect(document.getElementById('dify_apiKey')).toHaveProperty('disabled', false);
      expect(screen.queryByText('retirement.externalKeyLocked')).not.toBeInTheDocument();
    });

    it('keeps everything editable when the guard itself fails (fails closed)', async () => {
      getIntegrationVaultMigrationState.mockRejectedValue(new Error('503'));
      renderConfig({
        provider: 'dify',
        dify_apiUrl: 'https://api.dify.ai/v1',
        dify_apiKey: 'app-x',
      });

      await waitFor(() => expect(getIntegrationVaultMigrationState).toHaveBeenCalled());
      expect(document.getElementById('dify_apiKey')).toHaveProperty('disabled', false);
      expect(screen.queryByText('retirement.externalKeyLocked')).not.toBeInTheDocument();
    });

    it('accepts a saved integration in place of a retyped key on validation', async () => {
      getIntegration.mockResolvedValue({
        config: { apiUrl: 'https://api.dify.ai/v1' },
      });
      const { onValidationChange } = renderConfig({
        provider: 'dify',
        dify_apiUrl: 'https://api.dify.ai/v1',
        dify_apiKey: '',
      });

      await waitFor(() => expect(getIntegration).toHaveBeenCalled());
      await waitFor(() => {
        const lastCall = onValidationChange.mock.calls.at(-1);
        expect(lastCall?.[0]).toBe(true);
      });
    });
  });

  it('loads the stored credential_id when editing', async () => {
    getIntegration.mockResolvedValue({
      config: { apiUrl: 'https://api.dify.ai/v1', apiKey: 'app-x', credential_id: 'cred-dify' },
    });
    const onChange = vi.fn();
    renderConfig({ provider: 'dify' }, onChange);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0].credential_id).toBe('cred-dify');
  });
});

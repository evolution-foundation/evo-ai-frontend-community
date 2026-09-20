import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KnowledgeNexusConfigDialog from './KnowledgeNexusConfigDialog';

// EVO-2250 story 2.7: the inline API key field retires behind the migration
// guard, and the save payload keeps meaning "the stored key is untouched".

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const listIntegrationCredentials = vi.fn();
const getIntegrationVaultMigrationState = vi.fn();

vi.mock('@/services/agents', () => ({
  listIntegrationCredentials: (...args: unknown[]) => listIntegrationCredentials(...args),
  getIntegrationVaultMigrationState: (...args: unknown[]) =>
    getIntegrationVaultMigrationState(...args),
}));

vi.mock('@/services/agents/agentIntegrationsService', () => ({
  agentIntegrationsService: { listKnowledgeNexusSpaces: vi.fn().mockResolvedValue([]) },
  default: { listKnowledgeNexusSpaces: vi.fn().mockResolvedValue([]) },
}));

const SAVED_CONFIG = {
  connected: true,
  nexus_base_url: 'https://nexus.example.com',
  space_id: '00000000-0000-0000-0000-000000000001',
  credential_id: 'cred-nexus',
};

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
});

describe('KnowledgeNexusConfigDialog — retirement of the inline key (2.7)', () => {
  it('keeps the API key input while the guard says not migrated (AC3)', async () => {
    render(
      <KnowledgeNexusConfigDialog
        open
        onOpenChange={() => {}}
        onSave={() => {}}
        initialConfig={SAVED_CONFIG}
      />,
    );

    await waitFor(() => expect(getIntegrationVaultMigrationState).toHaveBeenCalled());
    expect(document.getElementById('nexus_api_key')).not.toBeNull();
    expect(screen.queryByText('retirement.nexusKeyLocked')).not.toBeInTheDocument();
  });

  it('retires the input when the guard says migrated, without touching the stored key', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    getIntegrationVaultMigrationState.mockResolvedValue({ retired: { knowledge_nexus: true } });
    render(
      <KnowledgeNexusConfigDialog
        open
        onOpenChange={() => {}}
        onSave={onSave}
        initialConfig={SAVED_CONFIG}
      />,
    );

    expect(await screen.findByText('retirement.nexusKeyLocked')).toBeInTheDocument();
    expect(document.getElementById('nexus_api_key')).toBeNull();

    await user.click(screen.getByText('edit.integrations.knowledgeNexus.apply'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    // Negative proof of the data-loss path: the payload must NOT carry an
    // empty nexus_api_key (that would overwrite the stored secret on backends
    // that replace the object wholesale) — absence means "keep it".
    expect(payload).not.toHaveProperty('nexus_api_key');
    expect(payload.credential_id).toBe('cred-nexus');
    expect(payload.nexus_base_url).toBe('https://nexus.example.com');
  });
});

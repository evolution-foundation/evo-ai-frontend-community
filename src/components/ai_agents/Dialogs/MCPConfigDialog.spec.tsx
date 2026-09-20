import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MCPConfigDialog from './MCPConfigDialog';
import type { MCPServer } from '@/types/ai';

// EVO-2250 story 2.4 AC7: the WRITE end of "an official MCP server takes a
// secret env var from the vault". The processor's resolution is inert without
// it — a field nobody persists is a field nobody resolves, which is the defect
// class that failed this card's review.

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const listIntegrationCredentials = vi.fn();

vi.mock('@/services/agents', () => ({
  listIntegrationCredentials: (...args: unknown[]) => listIntegrationCredentials(...args),
}));

const GITHUB_SERVER = {
  id: 'srv-github',
  name: 'GitHub',
  description: 'GitHub MCP',
  config_type: 'studio',
  config_json: {},
  environments: { GITHUB_PERSONAL_ACCESS_TOKEN: 'required' },
  tools: [],
} as unknown as MCPServer;

const VAULT_CREDENTIAL = {
  id: 'cred-github',
  name: 'Token do GitHub',
  provider: 'github',
  kind: 'static' as const,
  scope: 'account' as const,
  is_active: true,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
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
  listIntegrationCredentials.mockResolvedValue([VAULT_CREDENTIAL]);
});

const renderDialog = (onSave = vi.fn(), initialConfig = null as never) =>
  ({
    onSave,
    ...render(
      <MCPConfigDialog
        open
        onOpenChange={() => {}}
        onSave={onSave}
        availableServers={[GITHUB_SERVER]}
        initialConfig={initialConfig}
      />,
    ),
  });

describe('MCPConfigDialog — vault reference per env var (2.4 AC7)', () => {
  // Editing an existing entry is the state that renders the env fields: in
  // create mode the dialog starts on server selection, with no variables yet.
  it('offers a vault selector next to every required env var', async () => {
    const initial = {
      id: 'srv-github',
      name: 'GitHub',
      type: 'studio',
      environments: { GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp-inline' },
      tools: [],
    } as never;
    renderDialog(vi.fn(), initial);

    await waitFor(() =>
      expect(document.getElementById('env-cred-GITHUB_PERSONAL_ACCESS_TOKEN')).not.toBeNull(),
    );
    // The inline field stays: it is the fallback until story 2.7.
    expect(document.getElementById('env-GITHUB_PERSONAL_ACCESS_TOKEN')).not.toBeNull();
  });

  it('loads a stored reference when editing (negative proof of the drop)', async () => {
    const initial = {
      id: 'srv-github',
      name: 'GitHub',
      type: 'studio',
      environments: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
      credential_refs: { GITHUB_PERSONAL_ACCESS_TOKEN: 'cred-github' },
      tools: [],
    } as never;
    const { onSave } = renderDialog(vi.fn(), initial);
    const user = userEvent.setup();

    await screen.findByText('dialogs.mcpConfig.requiredConfig');
    await user.click(screen.getByText('dialogs.mcpConfig.save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    // A dialog that dropped the field on load would save it away: the API
    // replaces the entry, so the stored reference would be lost on any edit.
    expect(onSave.mock.calls[0][0].credential_refs).toEqual({
      GITHUB_PERSONAL_ACCESS_TOKEN: 'cred-github',
    });
  });

  it('sends an empty map when no variable references the vault', async () => {
    const initial = {
      id: 'srv-github',
      name: 'GitHub',
      type: 'studio',
      environments: { GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp-inline' },
      tools: [],
    } as never;
    const { onSave } = renderDialog(vi.fn(), initial);
    const user = userEvent.setup();

    await screen.findByText('dialogs.mcpConfig.requiredConfig');
    await user.click(screen.getByText('dialogs.mcpConfig.save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.credential_refs).toEqual({});
    // The inline value keeps travelling: it is the fallback the runtime uses.
    expect(payload.environments.GITHUB_PERSONAL_ACCESS_TOKEN).toBe('ghp-inline');
  });
});

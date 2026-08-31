import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntegrationCredentials from './IntegrationCredentials';
import { parseOwnerTimestamp } from './ownerTimestamp';
import { maskKey } from '@/constants/aiProviders';
import type { IntegrationCredential } from '@/types/agents';

// EVO-2250 story 2.1: the vault page reads the new registry only, never
// returns the value to the browser, gates every action on
// ai_integration_credentials.* and only creates `static` credentials.
let granted: string[] = [];

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => granted.includes(`${resource}.${action}`),
    isReady: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const listIntegrationCredentials = vi.fn();
const createIntegrationCredential = vi.fn();
const updateIntegrationCredential = vi.fn();
const deleteIntegrationCredential = vi.fn();
const listCustomTools = vi.fn();
const listCustomMcpServers = vi.fn();
const listAgentBots = vi.fn();

vi.mock('@/services/agents', () => ({
  listIntegrationCredentials: (...args: unknown[]) => listIntegrationCredentials(...args),
  createIntegrationCredential: (...args: unknown[]) => createIntegrationCredential(...args),
  updateIntegrationCredential: (...args: unknown[]) => updateIntegrationCredential(...args),
  deleteIntegrationCredential: (...args: unknown[]) => deleteIntegrationCredential(...args),
  listCustomTools: (...args: unknown[]) => listCustomTools(...args),
  listCustomMcpServers: (...args: unknown[]) => listCustomMcpServers(...args),
}));

vi.mock('@/services/channels/agentBotsService', () => ({
  default: {
    getAll: (...args: unknown[]) => listAgentBots(...args),
  },
}));

const deleteIntegration = vi.fn();

vi.mock('@/services/agents/agentIntegrationsService', () => ({
  default: {
    deleteIntegration: (...args: unknown[]) => deleteIntegration(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const DIFY_CREDENTIAL: IntegrationCredential = {
  id: 'cred-dify',
  name: 'Dify producao',
  provider: 'dify',
  kind: 'static',
  value_hint: '4f2a',
  value_format: 'scalar',
  scope: 'account',
  is_active: true,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

const ELEVENLABS_CREDENTIAL: IntegrationCredential = {
  id: 'cred-elevenlabs',
  name: 'ElevenLabs',
  provider: 'elevenlabs',
  kind: 'static',
  value_hint: '91bc',
  value_format: 'scalar',
  scope: 'account',
  is_active: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

const INSTALLATION_CREDENTIAL: IntegrationCredential = {
  id: 'cred-installation',
  name: 'n8n da casa',
  provider: 'n8n',
  kind: 'static',
  value_hint: 'aa11',
  value_format: 'composite',
  scope: 'installation',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
};

const OAUTH_CREDENTIAL: IntegrationCredential = {
  id: 'cred-oauth-github',
  name: 'GitHub',
  provider: 'github',
  kind: 'oauth',
  scope: 'account',
  owner_store: 'agent_integration',
  owner_ref: 'integration-1',
  connection_status: 'connected',
  connection_expires_at: '2026-08-15T00:00:00Z',
  agent_id: 'agent-1',
  agent_name: 'Atendente',
  is_active: true,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

const OAUTH_EXPIRED: IntegrationCredential = {
  ...OAUTH_CREDENTIAL,
  id: 'cred-oauth-stripe',
  provider: 'stripe',
  agent_id: 'agent-2',
  agent_name: 'Cobrança',
  connection_status: 'expired',
};

const ALL_PERMISSIONS = [
  'ai_integration_credentials.read',
  'ai_integration_credentials.create',
  'ai_integration_credentials.update',
  'ai_integration_credentials.delete',
];

const findAccountRow = () => screen.findByRole('cell', { name: 'Dify producao' });

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  granted = [...ALL_PERMISSIONS];
  listIntegrationCredentials.mockResolvedValue([DIFY_CREDENTIAL, ELEVENLABS_CREDENTIAL]);
  listCustomTools.mockResolvedValue([]);
  listCustomMcpServers.mockResolvedValue([]);
  listAgentBots.mockResolvedValue([]);
});

describe('IntegrationCredentials — listing (AC1, AC3)', () => {
  it('renders each credential with a masked hint, never the value itself', async () => {
    render(<IntegrationCredentials />);

    expect(await findAccountRow()).toBeInTheDocument();
    expect(screen.getByText(maskKey('4f2a'))).toBeInTheDocument();
    expect(screen.getByText(maskKey('91bc'))).toBeInTheDocument();
    // The new registry is the only source consulted.
    expect(listIntegrationCredentials).toHaveBeenCalledTimes(1);
  });

  it('shows provider, kind and state per credential', async () => {
    render(<IntegrationCredentials />);

    await findAccountRow();
    expect(screen.getByText('dify')).toBeInTheDocument();
    expect(screen.getAllByText('kind.static').length).toBe(2);
    expect(screen.getByText('status.active')).toBeInTheDocument();
    expect(screen.getByText('status.inactive')).toBeInTheDocument();
  });
});

describe('IntegrationCredentials — permission gates (AC7)', () => {
  it('refuses to render the list without ai_integration_credentials.read', async () => {
    granted = [];
    render(<IntegrationCredentials />);

    expect(await screen.findByText('messages.permissionDenied.read')).toBeInTheDocument();
    expect(listIntegrationCredentials).not.toHaveBeenCalled();
  });

  it('hides the create action without ai_integration_credentials.create', async () => {
    granted = ['ai_integration_credentials.read'];
    render(<IntegrationCredentials />);

    await findAccountRow();
    expect(screen.queryByText('actions.add')).not.toBeInTheDocument();
  });

  it('hides edit and delete without the matching grants', async () => {
    granted = ['ai_integration_credentials.read'];
    render(<IntegrationCredentials />);

    await findAccountRow();
    expect(screen.queryByLabelText('actions.edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('actions.delete')).not.toBeInTheDocument();
  });

  it('shows edit and delete when granted (positive control)', async () => {
    render(<IntegrationCredentials />);

    await findAccountRow();
    expect(screen.getAllByLabelText('actions.edit').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('actions.delete').length).toBeGreaterThan(0);
  });
});

describe('IntegrationCredentials — creating only static (AC2, AC4)', () => {
  it('sends kind static and never offers an oauth choice', async () => {
    const user = userEvent.setup();
    createIntegrationCredential.mockResolvedValue(DIFY_CREDENTIAL);
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.add'));

    // The form has no kind selector at all: oauth is opened by story 2.5.
    expect(screen.queryByText('kind.oauth')).not.toBeInTheDocument();

    await user.type(await screen.findByLabelText('form.labels.name'), 'Nova');
    await user.type(screen.getByLabelText('form.labels.provider'), 'dify');
    await user.type(screen.getByLabelText('form.labels.value'), 'app-secret-0001');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(createIntegrationCredential).toHaveBeenCalled());
    const [payload] = createIntegrationCredential.mock.calls[0];
    expect(payload.kind).toBe('static');
    expect(payload.value).toBe('app-secret-0001');
  });

  it('blocks the save when name, provider or value is missing', async () => {
    const user = userEvent.setup();
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.add'));
    await user.type(await screen.findByLabelText('form.labels.name'), 'Sem valor');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(createIntegrationCredential).not.toHaveBeenCalled());
  });
});

describe('IntegrationCredentials — editing without resending the value (AC3)', () => {
  it('omits value when the field is left empty', async () => {
    const user = userEvent.setup();
    updateIntegrationCredential.mockResolvedValue(DIFY_CREDENTIAL);
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.edit')[0]);
    await user.click(await screen.findByText('actions.save'));

    await waitFor(() => expect(updateIntegrationCredential).toHaveBeenCalled());
    const [, payload] = updateIntegrationCredential.mock.calls[0];
    expect(payload).not.toHaveProperty('value');
    expect(payload.name).toBe('Dify producao');
  });

  it('sends the value when a new one is typed', async () => {
    const user = userEvent.setup();
    updateIntegrationCredential.mockResolvedValue(DIFY_CREDENTIAL);
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.edit')[0]);
    await user.type(await screen.findByLabelText('form.labels.value'), 'rotated-0001');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(updateIntegrationCredential).toHaveBeenCalled());
    const [, payload] = updateIntegrationCredential.mock.calls[0];
    expect(payload.value).toBe('rotated-0001');
  });
});

// EVO-2250 story 2.5 (front): OAuth connections render by reference. Status
// and expiry come straight from the listing response; there is no secret in
// the vault for these rows and therefore no value to see or edit.
describe('IntegrationCredentials — OAuth connections section (2.5 AC1, AC2, AC7)', () => {
  const oauthSection = () => screen.getByLabelText('sections.oauth');

  beforeEach(() => {
    granted = [...ALL_PERMISSIONS, 'ai_agents.update'];
    listIntegrationCredentials.mockResolvedValue([
      DIFY_CREDENTIAL,
      OAUTH_CREDENTIAL,
      OAUTH_EXPIRED,
    ]);
  });

  it('keeps oauth rows out of the static tables and inside the connections section', async () => {
    render(<IntegrationCredentials />);

    await findAccountRow();
    const section = oauthSection();
    expect(within(section).getByText('github')).toBeInTheDocument();
    expect(within(section).getByText('Atendente')).toBeInTheDocument();
    // The static (account) table never lists the oauth reference.
    const accountSection = screen.getByLabelText('sections.account');
    expect(within(accountSection).queryByText('github')).not.toBeInTheDocument();
  });

  it('renders the state exactly as the response reports it, per row (AC7)', async () => {
    render(<IntegrationCredentials />);

    await findAccountRow();
    const section = oauthSection();
    expect(within(section).getByText('oauthSection.status.connected')).toBeInTheDocument();
    expect(within(section).getByText('oauthSection.status.expired')).toBeInTheDocument();
    expect(within(section).getByText('oauthSection.noSecretHint')).toBeInTheDocument();
  });

  it('never offers value editing or a masked value on an oauth row (negative proof, AC2)', async () => {
    render(<IntegrationCredentials />);

    await findAccountRow();
    const section = oauthSection();
    // A row rendered through the static table would expose these controls:
    // this test fails if oauth rows ever share that rendering path.
    expect(within(section).queryByLabelText('actions.edit')).not.toBeInTheDocument();
    expect(within(section).queryByLabelText('actions.delete')).not.toBeInTheDocument();
    expect(within(section).queryByText(maskKey('4f2a'))).not.toBeInTheDocument();
    // And the page-wide edit controls count only the static account row.
    expect(screen.getAllByLabelText('actions.edit')).toHaveLength(1);
  });

  it('disconnect delegates to the agent-integration flow and warns about no revoke (AC5)', async () => {
    const user = userEvent.setup();
    deleteIntegration.mockResolvedValue(undefined);
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(within(oauthSection()).getAllByLabelText('oauthSection.actions.disconnect')[0]);

    // The dialog is explicit: local removal only, nothing revoked remotely.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'oauthSection.disconnectDialog.noRevokeWarning',
    );
    await user.click(screen.getByText('oauthSection.disconnectDialog.confirm'));

    await waitFor(() => expect(deleteIntegration).toHaveBeenCalledWith('agent-1', 'github'));
    // The vault endpoint is never used for a connection: the row is a reference.
    expect(deleteIntegrationCredential).not.toHaveBeenCalled();
  });

  it('hides the disconnect action without ai_agents.update', async () => {
    granted = [...ALL_PERMISSIONS];
    render(<IntegrationCredentials />);

    await findAccountRow();
    expect(
      within(oauthSection()).queryByLabelText('oauthSection.actions.disconnect'),
    ).not.toBeInTheDocument();
  });

  it('shows the empty hint when there is no connection', async () => {
    listIntegrationCredentials.mockResolvedValue([DIFY_CREDENTIAL]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    expect(within(oauthSection()).getByText('oauthSection.empty')).toBeInTheDocument();
  });
});

// EVO-2250 story 2.2: the installation link of the chain. Writing at that
// level is gated on installation_configs.manage, NOT on the update grant of
// the resource — the negative proofs below fail if the component ever swaps
// canManageInstallation for canUpdate.
describe('IntegrationCredentials — installation scope (2.2 AC8)', () => {
  const findInstallationRow = () => screen.findByRole('cell', { name: 'n8n da casa' });

  beforeEach(() => {
    listIntegrationCredentials.mockResolvedValue([DIFY_CREDENTIAL, INSTALLATION_CREDENTIAL]);
  });

  it('renders installation credentials read-only WITH the full resource grants (negative proof)', async () => {
    // Every ai_integration_credentials.* grant, including update, but no
    // installation_configs.manage: a gate wired to canUpdate would expose the
    // installation edit controls here and fail these assertions.
    granted = [...ALL_PERMISSIONS];
    render(<IntegrationCredentials />);

    await findInstallationRow();
    expect(screen.getByText('inheritedReadOnly')).toBeInTheDocument();
    // Exactly one edit control: the account row's. The installation row has none.
    expect(screen.getAllByLabelText('actions.edit')).toHaveLength(1);
    expect(screen.getAllByLabelText('actions.delete')).toHaveLength(1);
  });

  it('hides the installation add button without installation_configs.manage (negative proof)', async () => {
    granted = [...ALL_PERMISSIONS];
    render(<IntegrationCredentials />);

    await findInstallationRow();
    // Only the page-level (account) add button renders.
    expect(screen.getAllByText('actions.add')).toHaveLength(1);
  });

  it('exposes write controls on the installation row when granted (positive control)', async () => {
    granted = [...ALL_PERMISSIONS, 'installation_configs.manage'];
    render(<IntegrationCredentials />);

    await findInstallationRow();
    expect(screen.queryByText('inheritedReadOnly')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('actions.edit')).toHaveLength(2);
    // The section header carries its own add button.
    expect(screen.getAllByText('actions.add')).toHaveLength(2);
  });

  it('sends the scope when updating an installation credential', async () => {
    const user = userEvent.setup();
    granted = [...ALL_PERMISSIONS, 'installation_configs.manage'];
    updateIntegrationCredential.mockResolvedValue(INSTALLATION_CREDENTIAL);
    render(<IntegrationCredentials />);

    await findInstallationRow();
    await user.click(screen.getAllByLabelText('actions.edit')[1]);
    await user.click(await screen.findByText('actions.save'));

    await waitFor(() => expect(updateIntegrationCredential).toHaveBeenCalled());
    const [id, payload] = updateIntegrationCredential.mock.calls[0];
    expect(id).toBe('cred-installation');
    expect(payload.scope).toBe('installation');
  });

  it('shows the empty hint when the installation has nothing', async () => {
    listIntegrationCredentials.mockResolvedValue([DIFY_CREDENTIAL]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    expect(screen.getByText('installationEmpty')).toBeInTheDocument();
  });
});

// The panel answers "which credential is in effect". Born empty in 2.2; the
// 2.4 consumers (tools, MCPs, bots) fill it from their own listings.
describe('IntegrationCredentials — in-use panel (2.2 AC9, 2.4 AC10)', () => {
  it('renders the panel above the lists with the empty explanation', async () => {
    render(<IntegrationCredentials />);

    await findAccountRow();
    const panel = screen.getByLabelText('inUse.title');
    expect(panel).toHaveTextContent('inUse.empty');
  });

  it('lists tools, MCPs and bots that reference the vault, with the credential name (2.4 AC10)', async () => {
    listCustomTools.mockResolvedValue([
      {
        id: 'tool-1',
        name: 'CRM lookup',
        credential_refs: { Authorization: 'cred-dify' },
      },
      { id: 'tool-2', name: 'Sem cofre', credential_refs: {} },
    ]);
    listCustomMcpServers.mockResolvedValue([
      { id: 'mcp-1', name: 'Notion MCP', credential_refs: { 'X-API-Key': 'cred-elevenlabs' } },
    ]);
    listAgentBots.mockResolvedValue([
      { id: 'bot-1', name: 'Bot vendas', credential_id: 'cred-dify' },
      { id: 'bot-2', name: 'Bot webhook' },
    ]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    const panel = screen.getByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('CRM lookup'));
    // The reference resolves to the credential NAME, not the raw id.
    expect(panel).toHaveTextContent('Dify producao');
    expect(panel).toHaveTextContent('Notion MCP');
    expect(panel).toHaveTextContent('ElevenLabs');
    expect(panel).toHaveTextContent('Bot vendas');
    // Consumers without a vault reference stay out (negative proof: a panel
    // listing every consumer would drag webhook bots and plain tools in).
    expect(panel).not.toHaveTextContent('Sem cofre');
    expect(panel).not.toHaveTextContent('Bot webhook');
    expect(panel).not.toHaveTextContent('inUse.empty');
  });

  it('keeps the vault page alive when a consumer listing fails (advisory)', async () => {
    listCustomTools.mockRejectedValue(new Error('403'));
    render(<IntegrationCredentials />);

    expect(await findAccountRow()).toBeInTheDocument();
    expect(screen.getByLabelText('inUse.title')).toHaveTextContent('inUse.empty');
  });

  // AC10 complete: the backend aggregates the consumers of each credential
  // into referenced_by, covering external agents too — which the client-side
  // join never could (per-agent fetches).
  it('prefers the server-side referenced_by and skips the client-side join (negative proof)', async () => {
    listIntegrationCredentials.mockResolvedValue([
      { ...DIFY_CREDENTIAL, referenced_by: ['Agente Dify', 'Tool CRM lookup'] },
      { ...ELEVENLABS_CREDENTIAL, referenced_by: [] },
    ]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    const panel = screen.getByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('Agente Dify, Tool CRM lookup'));
    expect(panel).toHaveTextContent('Dify producao');
    // A credential nobody references stays out of the panel.
    expect(panel).not.toHaveTextContent('ElevenLabs');
    // With the server answering, the client-side join must stay OFF: double
    // sourcing would duplicate rows and reintroduce the per-consumer fetches.
    expect(listCustomTools).not.toHaveBeenCalled();
    expect(listCustomMcpServers).not.toHaveBeenCalled();
    expect(listAgentBots).not.toHaveBeenCalled();
  });

  it('falls back to the client-side join when no row carries referenced_by (older backend)', async () => {
    listCustomTools.mockResolvedValue([
      { id: 'tool-1', name: 'CRM lookup', credential_refs: { Authorization: 'cred-dify' } },
    ]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    const panel = screen.getByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('CRM lookup'));
    expect(listCustomTools).toHaveBeenCalled();
  });
});

// The owner store writes naive UTC timestamps; parsing them as local time
// shifts the expiry by the viewer's offset.
describe('parseOwnerTimestamp — naive timestamps are UTC', () => {
  it('reads a naive timestamp as UTC, identical to its zoned form', () => {
    expect(parseOwnerTimestamp('2026-08-15T00:00:00').getTime()).toBe(
      new Date('2026-08-15T00:00:00Z').getTime(),
    );
  });

  it('passes zoned values through untouched', () => {
    expect(parseOwnerTimestamp('2026-08-15T00:00:00Z').getTime()).toBe(
      new Date('2026-08-15T00:00:00Z').getTime(),
    );
    expect(parseOwnerTimestamp('2026-08-15T03:00:00-03:00').getTime()).toBe(
      new Date('2026-08-15T06:00:00Z').getTime(),
    );
  });
});

describe('IntegrationCredentials — deleting (AC6)', () => {
  it('warns about consumers referencing the credential before confirming', async () => {
    const user = userEvent.setup();
    listIntegrationCredentials.mockResolvedValue([
      { ...DIFY_CREDENTIAL, referenced_by: ['Agente Dify', 'Bot vendas'] },
    ]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.delete')[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('deleteDialog.inUseWarning');
    expect(deleteIntegrationCredential).not.toHaveBeenCalled();
  });

  it('deletes only after confirmation', async () => {
    const user = userEvent.setup();
    deleteIntegrationCredential.mockResolvedValue({ message: 'ok' });
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.delete')[0]);
    await user.click(await screen.findByText('deleteDialog.confirm'));

    await waitFor(() => expect(deleteIntegrationCredential).toHaveBeenCalledWith('cred-dify'));
  });
});

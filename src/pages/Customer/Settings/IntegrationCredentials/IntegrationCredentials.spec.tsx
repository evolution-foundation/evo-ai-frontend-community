import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntegrationCredentials from './IntegrationCredentials';
import { parseOwnerTimestamp } from './ownerTimestamp';
import { maskKey } from '@/constants/aiProviders';
import type { IntegrationCredential } from '@/types/agents';
import { toast } from 'sonner';

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

// Keys render as themselves unless a test picks a locale, which resolves them
// against the real catalog.
let locale: string | null = null;

const catalogs = import.meta.glob<Record<string, unknown>>(
  '../../../../i18n/locales/*/integrationCredentials.json',
  { eager: true, import: 'default' },
);

const translate = (key: string, options: Record<string, unknown> = {}) => {
  if (!locale) return key;
  const catalog = Object.entries(catalogs).find(([path]) =>
    path.includes(`/locales/${locale}/`),
  )?.[1];
  const template = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      catalog,
    );
  if (typeof template !== 'string') return key;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name) => String(options[name]));
};

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: translate, currentLanguage: 'en' }),
}));

const listIntegrationCredentials = vi.fn();
const createIntegrationCredential = vi.fn();
const updateIntegrationCredential = vi.fn();
const deleteIntegrationCredential = vi.fn();
const listCustomTools = vi.fn();
const listCustomMcpServers = vi.fn();
const listAgentBots = vi.fn();

// deleteConflictConsumers is NOT stubbed: it is the contract reader under test,
// so the 409 cases below exercise the real payload check.
vi.mock('@/services/agents', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/agents/integrationCredentialService')
  >('@/services/agents/integrationCredentialService');

  return {
    deleteConflictConsumers: actual.deleteConflictConsumers,
    deleteConflictHolders: actual.deleteConflictHolders,
    parseHolders: actual.parseHolders,
    listIntegrationCredentials: (...args: unknown[]) => listIntegrationCredentials(...args),
    createIntegrationCredential: (...args: unknown[]) => createIntegrationCredential(...args),
    updateIntegrationCredential: (...args: unknown[]) => updateIntegrationCredential(...args),
    deleteIntegrationCredential: (...args: unknown[]) => deleteIntegrationCredential(...args),
    listCustomTools: (...args: unknown[]) => listCustomTools(...args),
    listCustomMcpServers: (...args: unknown[]) => listCustomMcpServers(...args),
  };
});

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

// Deactivated by the listing sync: the backend decorates it without an agent.
const OAUTH_ORPHANED: IntegrationCredential = {
  ...OAUTH_CREDENTIAL,
  id: 'cred-oauth-slack',
  provider: 'slack',
  agent_id: undefined,
  agent_name: undefined,
  connection_status: 'expired',
  is_active: false,
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
  locale = null;
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
    // The page-level button is the account one: without this the row could
    // silently land at another scope.
    expect(payload.scope).toBe('account');
  });

  // handleSave used to run every save through the update gate, so a create-only
  // grant was refused a credential the server would have accepted.
  it('creates at account scope without ai_integration_credentials.update', async () => {
    const user = userEvent.setup();
    granted = ['ai_integration_credentials.read', 'ai_integration_credentials.create'];
    createIntegrationCredential.mockResolvedValue(DIFY_CREDENTIAL);
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.add'));

    await user.type(await screen.findByLabelText('form.labels.name'), 'Nova');
    await user.type(screen.getByLabelText('form.labels.provider'), 'dify');
    await user.type(screen.getByLabelText('form.labels.value'), 'create-only-0001');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(createIntegrationCredential).toHaveBeenCalled());
    expect(createIntegrationCredential.mock.calls[0][0]).toMatchObject({ scope: 'account' });
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

  it('offers delete, not disconnect, on an oauth row whose connection is gone', async () => {
    const user = userEvent.setup();
    deleteIntegrationCredential.mockResolvedValue({ message: 'ok' });
    listIntegrationCredentials.mockResolvedValue([
      DIFY_CREDENTIAL,
      OAUTH_CREDENTIAL,
      OAUTH_ORPHANED,
    ]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    const section = oauthSection();
    expect(within(section).getByText('oauthSection.status.disconnected')).toBeInTheDocument();
    expect(within(section).getAllByLabelText('actions.delete')).toHaveLength(1);
    expect(within(section).getAllByLabelText('oauthSection.actions.disconnect')).toHaveLength(1);

    await user.click(within(section).getByLabelText('actions.delete'));
    await user.click(await screen.findByText('deleteDialog.confirm'));

    await waitFor(() =>
      expect(deleteIntegrationCredential).toHaveBeenCalledWith('cred-oauth-slack'),
    );
    expect(deleteIntegration).not.toHaveBeenCalled();
  });

  it('keeps disconnect and no delete on a live connection whose token expired (negative proof)', async () => {
    listIntegrationCredentials.mockResolvedValue([DIFY_CREDENTIAL, OAUTH_EXPIRED]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    const section = oauthSection();
    // Token expiry is the backend's word; only a deactivated row is orphaned.
    expect(within(section).getByText('oauthSection.status.expired')).toBeInTheDocument();
    expect(within(section).queryByText('oauthSection.status.disconnected')).not.toBeInTheDocument();
    expect(within(section).getByLabelText('oauthSection.actions.disconnect')).toBeInTheDocument();
    expect(within(section).queryByLabelText('actions.delete')).not.toBeInTheDocument();
  });

  it('hides the orphaned row delete without ai_integration_credentials.delete', async () => {
    granted = ALL_PERMISSIONS.filter(
      permission => permission !== 'ai_integration_credentials.delete',
    );
    listIntegrationCredentials.mockResolvedValue([DIFY_CREDENTIAL, OAUTH_ORPHANED]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    const section = oauthSection();
    expect(within(section).getByText('oauthSection.status.disconnected')).toBeInTheDocument();
    expect(within(section).queryByLabelText('actions.delete')).not.toBeInTheDocument();
    expect(
      within(section).queryByLabelText('oauthSection.actions.disconnect'),
    ).not.toBeInTheDocument();
  });
});

// EVO-2250 story 2.2: the installation link of the chain. Writing at that
// level needs installation_configs.manage ON TOP of the resource grant for the
// verb in play — never one instead of the other. The negative proofs below fail
// if the component ever swaps one for the other, in either direction.
describe('IntegrationCredentials — installation scope (2.2 AC8)', () => {
  const findInstallationRow = () => screen.findByRole('cell', { name: 'n8n da casa' });

  // Scoped to the section instead of indexed into getAllByText: the account's
  // add button lives in the page header, so an index follows any layout change
  // to the wrong button.
  const installationSection = () => screen.getByLabelText('sections.installation');
  const addInstallationButton = () => within(installationSection()).getByText('actions.add');

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

  // The whole point of the section: the CREATE carries scope 'installation',
  // or the row lands on the account and the Evo default stays empty. Updating
  // an existing row cannot prove this — it inherits the scope it already had.
  it('lets an installation admin CREATE at that level, carrying the scope', async () => {
    const user = userEvent.setup();
    granted = [...ALL_PERMISSIONS, 'installation_configs.manage'];
    createIntegrationCredential.mockResolvedValue(INSTALLATION_CREDENTIAL);
    render(<IntegrationCredentials />);

    await findInstallationRow();
    await user.click(addInstallationButton());

    await user.type(await screen.findByLabelText('form.labels.name'), 'Nova da casa');
    await user.type(screen.getByLabelText('form.labels.provider'), 'n8n');
    await user.type(screen.getByLabelText('form.labels.value'), 'house-secret-0002');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(createIntegrationCredential).toHaveBeenCalled());
    expect(createIntegrationCredential.mock.calls[0][0]).toMatchObject({
      name: 'Nova da casa',
      provider: 'n8n',
      value: 'house-secret-0002',
      kind: 'static',
      scope: 'installation',
    });
  });

  // The scope privilege is ON TOP of ai_integration_credentials.create, not
  // instead of it: offering the button to someone the server will refuse is a
  // dead end.
  it('hides the installation add button without ai_integration_credentials.create', async () => {
    granted = [
      ...ALL_PERMISSIONS.filter(
        permission => permission !== 'ai_integration_credentials.create',
      ),
      'installation_configs.manage',
    ];
    render(<IntegrationCredentials />);

    await findInstallationRow();
    expect(within(installationSection()).queryByText('actions.add')).not.toBeInTheDocument();
  });

  // The same rule on the update axis: the PUT route demands
  // ai_integration_credentials.update whatever the scope, so
  // installation_configs.manage alone must not light up the edit controls.
  it('keeps the installation row read-only without ai_integration_credentials.update', async () => {
    granted = [
      ...ALL_PERMISSIONS.filter(
        permission => permission !== 'ai_integration_credentials.update',
      ),
      'installation_configs.manage',
    ];
    render(<IntegrationCredentials />);

    await findInstallationRow();
    expect(screen.queryAllByLabelText('actions.edit')).toHaveLength(0);
    expect(screen.getByText('inheritedReadOnly')).toBeInTheDocument();
  });

  // Delete does not travel through update: dropping the update grant must not
  // take the trash icon with it, on either row.
  it('keeps the delete control without ai_integration_credentials.update', async () => {
    granted = [
      ...ALL_PERMISSIONS.filter(
        permission => permission !== 'ai_integration_credentials.update',
      ),
      'installation_configs.manage',
    ];
    render(<IntegrationCredentials />);

    await findInstallationRow();
    expect(screen.getAllByLabelText('actions.delete')).toHaveLength(2);
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

// The core refuses the delete with 409 while a consumer still points at the
// credential, and names each holder in `details.consumers` (CRM-191, PR #29).
describe('IntegrationCredentials — the 409 names who holds the credential (CRM-207)', () => {
  const conflictError = (
    consumers: unknown,
    { status = 409, code = 'CONFLICT' }: { status?: number; code?: string } = {},
  ) => ({
    response: {
      status,
      data: {
        success: false,
        error: {
          code,
          message: 'integration credential is still in use by 2 consumer(s)',
          details: { consumers },
        },
      },
    },
  });

  const confirmDelete = async () => {
    const user = userEvent.setup();
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.delete')[0]);
    await user.click(await screen.findByText('deleteDialog.confirm'));

    return user;
  };

  it('lists every consumer as its own item and drops the generic toast', async () => {
    deleteIntegrationCredential.mockRejectedValue(
      conflictError(['Bot de canal (whatsapp)', 'Ferramenta Busca [Authorization]']),
    );
    await confirmDelete();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('deleteDialog.conflict.title')).toBeInTheDocument();
    expect(within(alert).getByText('deleteDialog.conflict.help')).toBeInTheDocument();

    const items = within(alert).getAllByRole('listitem').map(item => item.textContent);
    expect(items).toEqual(['Bot de canal (whatsapp)', 'Ferramenta Busca [Authorization]']);

    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByText('deleteDialog.confirm')).toBeInTheDocument();
  });

  it('replaces the pre-flight warning, which is a tolerant snapshot of the listing', async () => {
    listIntegrationCredentials.mockResolvedValue([
      { ...DIFY_CREDENTIAL, referenced_by: ['Agente Dify'] },
    ]);
    deleteIntegrationCredential.mockRejectedValue(conflictError(['Bot de canal (whatsapp)']));
    await confirmDelete();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('deleteDialog.conflict.title')).toBeInTheDocument();
    expect(screen.queryByText('deleteDialog.inUseWarning')).not.toBeInTheDocument();
  });

  it('names the holders even when the listing reported none', async () => {
    deleteIntegrationCredential.mockRejectedValue(conflictError(['Integração github']));
    await confirmDelete();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'Integração github',
    ]);
    expect(screen.queryByText('deleteDialog.inUseWarning')).not.toBeInTheDocument();
  });

  it.each([
    ['a 500', { response: { status: 500, data: { error: { code: 'INTERNAL_ERROR' } } } }],
    ['a 409 with no details', { response: { status: 409, data: { error: { code: 'CONFLICT' } } } }],
    ['an empty consumer list', conflictError([])],
    ['a consumer list that is not strings', conflictError([{ name: 'Bot' }])],
    ['a 400 carrying a same-named field', conflictError(['Bot'], { status: 400 })],
    [
      'a 409 that is not this conflict',
      conflictError(['Bot'], { code: 'RESOURCE_ALREADY_EXISTS' }),
    ],
  ])('falls back to the generic message for %s', async (_label, error) => {
    deleteIntegrationCredential.mockRejectedValue(error);
    await confirmDelete();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.deleteError'));
    expect(screen.queryByText('deleteDialog.conflict.title')).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('clears the previous holders when the delete is retried', async () => {
    deleteIntegrationCredential.mockRejectedValueOnce(conflictError(['Bot de canal (whatsapp)']));
    const user = await confirmDelete();

    await screen.findByText('deleteDialog.conflict.title');

    deleteIntegrationCredential.mockResolvedValueOnce({ message: 'ok' });
    await user.click(screen.getByText('deleteDialog.confirm'));

    await waitFor(() =>
      expect(screen.queryByText('deleteDialog.conflict.title')).not.toBeInTheDocument(),
    );
    expect(toast.success).toHaveBeenCalledWith('messages.deleteSuccess');
  });

  it('does not keep the old holders on screen when the retry fails for another reason', async () => {
    deleteIntegrationCredential.mockRejectedValueOnce(conflictError(['Bot de canal (whatsapp)']));
    const user = await confirmDelete();

    await screen.findByText('deleteDialog.conflict.title');

    deleteIntegrationCredential.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await user.click(screen.getByText('deleteDialog.confirm'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.deleteError'));
    expect(screen.queryByText('deleteDialog.conflict.title')).not.toBeInTheDocument();
    expect(screen.queryByText('Bot de canal (whatsapp)')).not.toBeInTheDocument();
  });

  // Cancel closes the dialog by flipping the open prop, which does not run
  // onOpenChange — so opening another credential is a distinct entry point.
  it('does not carry the holders over to another credential', async () => {
    deleteIntegrationCredential.mockRejectedValueOnce(conflictError(['Bot de canal (whatsapp)']));
    const user = await confirmDelete();

    await screen.findByText('deleteDialog.conflict.title');
    await user.click(screen.getByText('deleteDialog.cancel'));

    await user.click(screen.getAllByLabelText('actions.delete')[1]);

    expect(await screen.findByText('deleteDialog.confirm')).toBeInTheDocument();
    expect(screen.queryByText('deleteDialog.conflict.title')).not.toBeInTheDocument();
    expect(screen.queryByText('Bot de canal (whatsapp)')).not.toBeInTheDocument();
  });
});

describe('IntegrationCredentials — holders are labelled in the interface language', () => {
  const HOLDERS = [
    { kind: 'agent', name: 'Cobrança', key: 'api_key' },
    { kind: 'channel_bot', name: 'whatsapp' },
    { kind: 'integration', name: 'github' },
    { kind: 'mcp', name: 'Zendesk', key: 'token' },
    { kind: 'tool', name: 'Busca', key: 'Authorization' },
  ];
  const LABELS = [
    'Agente Cobrança [api_key]',
    'Bot de canal (whatsapp)',
    'Integração github',
    'MCP Zendesk [token]',
    'Ferramenta Busca [Authorization]',
  ];

  const conflictWith = (details: Record<string, unknown>) => ({
    response: {
      status: 409,
      data: {
        success: false,
        error: { code: 'CONFLICT', message: 'integration credential is still in use', details },
      },
    },
  });

  const openDelete = async () => {
    const user = userEvent.setup();
    render(<IntegrationCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText(translate('actions.delete'))[0]);

    return user;
  };

  const conflictItems = async () => {
    const alert = await screen.findByRole('alert');
    await within(alert).findAllByRole('listitem');
    return within(alert)
      .getAllByRole('listitem')
      .map(item => item.textContent);
  };

  const inUsePanel = () => screen.getByLabelText(translate('inUse.title'));

  const TRANSLATED: [string, string[]][] = [
    [
      'en',
      [
        'Agent Cobrança [api_key]',
        'Channel bot (whatsapp)',
        'Integration github',
        'MCP server Zendesk [token]',
        'Tool Busca [Authorization]',
      ],
    ],
    [
      'es',
      [
        'Agente Cobrança [api_key]',
        'Bot de canal (whatsapp)',
        'Integración github',
        'Servidor MCP Zendesk [token]',
        'Herramienta Busca [Authorization]',
      ],
    ],
    [
      'fr',
      [
        'Agent Cobrança [api_key]',
        'Bot de canal (whatsapp)',
        'Intégration github',
        'Serveur MCP Zendesk [token]',
        'Outil Busca [Authorization]',
      ],
    ],
    [
      'it',
      [
        'Agente Cobrança [api_key]',
        'Bot di canale (whatsapp)',
        'Integrazione github',
        'Server MCP Zendesk [token]',
        'Strumento Busca [Authorization]',
      ],
    ],
  ];

  it.each(TRANSLATED)(
    'lists the in-use panel consumers item by item in %s',
    async (language, expected) => {
      locale = language;
      listIntegrationCredentials.mockResolvedValue([
        { ...DIFY_CREDENTIAL, referenced_by: LABELS, holders: HOLDERS },
      ]);
      render(<IntegrationCredentials />);

      await findAccountRow();
      const panel = inUsePanel();
      await waitFor(() => expect(within(panel).getByText(expected.join(', '))).toBeInTheDocument());
      expect(panel).not.toHaveTextContent('Ferramenta');
    },
  );

  it('gives a consumer the same label in the panel and in the delete dialog in pt-BR', async () => {
    locale = 'pt-BR';
    listIntegrationCredentials.mockResolvedValue([
      {
        ...DIFY_CREDENTIAL,
        referenced_by: ['MCP Zendesk [token]'],
        holders: [{ kind: 'mcp', name: 'Zendesk', key: 'token' }],
      },
    ]);
    await openDelete();

    expect(within(inUsePanel()).getByText('Servidor MCP Zendesk [token]')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor MCP Zendesk [token].');
  });

  it.each([
    ['a server that sends no holders', undefined],
    ['a holder that cannot be labelled', [{ kind: 'webhook', name: 'Busca' }]],
    ['an empty holder list', []],
  ])('keeps the referenced_by strings in the panel for %s', async (_label, holders) => {
    locale = 'en';
    listIntegrationCredentials.mockResolvedValue([
      {
        ...DIFY_CREDENTIAL,
        referenced_by: ['Ferramenta Busca [Authorization]', 'Bot de canal (whatsapp)'],
        holders,
      },
    ]);
    render(<IntegrationCredentials />);

    await findAccountRow();
    const panel = inUsePanel();
    await waitFor(() =>
      expect(
        within(panel).getByText('Ferramenta Busca [Authorization], Bot de canal (whatsapp)'),
      ).toBeInTheDocument(),
    );
    expect(panel).not.toHaveTextContent(translate('inUse.empty'));
  });

  it.each(TRANSLATED)('lists the 409 holders item by item in %s', async (language, expected) => {
    locale = language;
    deleteIntegrationCredential.mockRejectedValue(
      conflictWith({ consumers: LABELS, holders: HOLDERS }),
    );
    const user = await openDelete();
    await user.click(await screen.findByText(translate('deleteDialog.confirm')));

    expect(await conflictItems()).toEqual(expected);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('labels the pre-flight warning from the listing holders', async () => {
    locale = 'en';
    listIntegrationCredentials.mockResolvedValue([
      {
        ...DIFY_CREDENTIAL,
        referenced_by: ['Ferramenta Busca [Authorization]'],
        holders: [{ kind: 'tool', name: 'Busca', key: 'Authorization' }],
      },
    ]);
    await openDelete();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('referenced by 1 consumer(s): Tool Busca [Authorization].');
    expect(alert).not.toHaveTextContent('Ferramenta');
  });

  it('keeps the pre-flight strings from a server that sends no holders', async () => {
    locale = 'en';
    listIntegrationCredentials.mockResolvedValue([
      { ...DIFY_CREDENTIAL, referenced_by: ['Ferramenta Busca [Authorization]'] },
    ]);
    await openDelete();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'referenced by 1 consumer(s): Ferramenta Busca [Authorization].',
    );
  });

  it('keeps the 409 strings from a server that sends no holders', async () => {
    deleteIntegrationCredential.mockRejectedValue(conflictWith({ consumers: LABELS }));
    const user = await openDelete();
    await user.click(await screen.findByText(translate('deleteDialog.confirm')));

    expect(await conflictItems()).toEqual(LABELS);
  });

  it('falls back to the strings when a holder cannot be labelled', async () => {
    deleteIntegrationCredential.mockRejectedValue(
      conflictWith({
        consumers: ['Bot de canal (whatsapp)', 'Ferramenta Busca [Authorization]'],
        holders: [
          { kind: 'channel_bot', name: 'whatsapp' },
          { kind: 'webhook', name: 'Busca' },
        ],
      }),
    );
    const user = await openDelete();
    await user.click(await screen.findByText(translate('deleteDialog.confirm')));

    expect(await conflictItems()).toEqual([
      'Bot de canal (whatsapp)',
      'Ferramenta Busca [Authorization]',
    ]);
  });

  it.each([
    ['an empty holder list', { holders: [] }],
    ['holders that cannot be labelled', { holders: [{ kind: 'tool', name: '' }] }],
  ])('shows the generic message, never an empty list, for %s', async (_label, details) => {
    deleteIntegrationCredential.mockRejectedValue(conflictWith(details));
    const user = await openDelete();
    await user.click(await screen.findByText(translate('deleteDialog.confirm')));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.deleteError'));
    expect(screen.queryByText('deleteDialog.conflict.title')).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  describe('at volume, in every interface language', () => {
    const KINDS = ['tool', 'channel_bot', 'agent', 'integration', 'mcp'] as const;
    // Names a label could trip on: brackets and a comma, parentheses, markup,
    // quotes, characters outside Latin and outside the BMP.
    const NAMES = [
      'Cobrança',
      'Busca [v2], interna',
      'Zendesk (sandbox)',
      '<b>Suporte</b> & Co',
      'Aspas "duplas"',
      '日本語',
      'Atendimento 🚀',
    ];
    const KEYS = ['Authorization', 'X-Api-Key', 'chave [v2]', 'Ç, ñ'];

    const VOLUME = Array.from({ length: 60 }, (_, i) => {
      const kind = KINDS[i % KINDS.length];
      const name = `${NAMES[i % NAMES.length]} ${i}`;
      const keyed = kind === 'tool' || kind === 'mcp' || kind === 'agent';
      return keyed ? { kind, name, key: KEYS[i % KEYS.length] } : { kind, name };
    });

    type Kind = (typeof KINDS)[number];

    // Written out rather than read from the catalogs, so a wrong translation
    // fails here instead of agreeing with itself.
    const PREFIXES: Record<string, Record<Kind, (name: string) => string>> = {
      'pt-BR': {
        integration: n => `Integração ${n}`,
        tool: n => `Ferramenta ${n}`,
        mcp: n => `Servidor MCP ${n}`,
        agent: n => `Agente ${n}`,
        channel_bot: n => `Bot de canal (${n})`,
      },
      pt: {
        integration: n => `Integração ${n}`,
        tool: n => `Ferramenta ${n}`,
        mcp: n => `Servidor MCP ${n}`,
        agent: n => `Agente ${n}`,
        channel_bot: n => `Bot de canal (${n})`,
      },
      en: {
        integration: n => `Integration ${n}`,
        tool: n => `Tool ${n}`,
        mcp: n => `MCP server ${n}`,
        agent: n => `Agent ${n}`,
        channel_bot: n => `Channel bot (${n})`,
      },
      es: {
        integration: n => `Integración ${n}`,
        tool: n => `Herramienta ${n}`,
        mcp: n => `Servidor MCP ${n}`,
        agent: n => `Agente ${n}`,
        channel_bot: n => `Bot de canal (${n})`,
      },
      fr: {
        integration: n => `Intégration ${n}`,
        tool: n => `Outil ${n}`,
        mcp: n => `Serveur MCP ${n}`,
        agent: n => `Agent ${n}`,
        channel_bot: n => `Bot de canal (${n})`,
      },
      it: {
        integration: n => `Integrazione ${n}`,
        tool: n => `Strumento ${n}`,
        mcp: n => `Server MCP ${n}`,
        agent: n => `Agente ${n}`,
        channel_bot: n => `Bot di canale (${n})`,
      },
    };

    const labelsIn = (language: string) =>
      VOLUME.map(holder => {
        const label = PREFIXES[language][holder.kind](holder.name);
        return 'key' in holder ? `${label} [${holder.key}]` : label;
      });

    // What the core sends in `details.consumers` for the same holders.
    const CORE_STRINGS = VOLUME.map(holder => {
      switch (holder.kind) {
        case 'integration':
          return `Integração ${holder.name}`;
        case 'channel_bot':
          return `Bot de canal (${holder.name})`;
        case 'tool':
          return `Ferramenta ${holder.name} [${'key' in holder ? holder.key : ''}]`;
        case 'mcp':
          return `MCP ${holder.name} [${'key' in holder ? holder.key : ''}]`;
        default:
          return `Agente ${holder.name} [${'key' in holder ? holder.key : ''}]`;
      }
    });

    const LANGUAGES = Object.keys(PREFIXES);

    it.each(LANGUAGES)(
      'lists all 60 holders of a 409 item by item, in order, in %s',
      async language => {
        locale = language;
        deleteIntegrationCredential.mockRejectedValue(
          conflictWith({ consumers: CORE_STRINGS, holders: VOLUME }),
        );
        const user = await openDelete();
        await user.click(await screen.findByText(translate('deleteDialog.confirm')));

        expect(await conflictItems()).toEqual(labelsIn(language));
        expect(toast.error).not.toHaveBeenCalled();
      },
    );

    it.each(LANGUAGES)('names all 60 holders in the pre-flight warning in %s', async language => {
      locale = language;
      listIntegrationCredentials.mockResolvedValue([
        { ...DIFY_CREDENTIAL, referenced_by: CORE_STRINGS, holders: VOLUME },
      ]);
      await openDelete();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(`${labelsIn(language).join(', ')}.`, {
        normalizeWhitespace: false,
      });
      expect(alert.textContent).toContain('60');
      if (!language.startsWith('pt')) {
        expect(alert).not.toHaveTextContent('Ferramenta ');
      }
    });

    it.each(LANGUAGES)('names all 60 holders in the in-use panel in %s', async language => {
      locale = language;
      listIntegrationCredentials.mockResolvedValue([
        { ...DIFY_CREDENTIAL, referenced_by: CORE_STRINGS, holders: VOLUME },
      ]);
      render(<IntegrationCredentials />);

      await findAccountRow();
      const panel = inUsePanel();
      await waitFor(() =>
        expect(within(panel).getByText(labelsIn(language).join(', '))).toBeInTheDocument(),
      );
    });

    it('falls back to all 60 listing strings in the panel when one holder in the middle cannot be labelled', async () => {
      locale = 'en';
      const broken = VOLUME.map((holder, i) =>
        i === 30 ? { ...holder, kind: 'webhook' } : holder,
      );
      listIntegrationCredentials.mockResolvedValue([
        { ...DIFY_CREDENTIAL, referenced_by: CORE_STRINGS, holders: broken },
      ]);
      render(<IntegrationCredentials />);

      await findAccountRow();
      const panel = inUsePanel();
      await waitFor(() =>
        expect(within(panel).getByText(CORE_STRINGS.join(', '))).toBeInTheDocument(),
      );
    });

    it('falls back to all 60 strings when one holder in the middle cannot be labelled', async () => {
      locale = 'en';
      const broken = VOLUME.map((holder, i) =>
        i === 30 ? { ...holder, kind: 'webhook' } : holder,
      );
      deleteIntegrationCredential.mockRejectedValue(
        conflictWith({ consumers: CORE_STRINGS, holders: broken }),
      );
      const user = await openDelete();
      await user.click(await screen.findByText(translate('deleteDialog.confirm')));

      expect(await conflictItems()).toEqual(CORE_STRINGS);
    });

    it('falls back to the listing strings when one holder in the middle cannot be labelled', async () => {
      locale = 'en';
      const broken = VOLUME.map((holder, i) => (i === 30 ? { ...holder, name: ' ' } : holder));
      listIntegrationCredentials.mockResolvedValue([
        { ...DIFY_CREDENTIAL, referenced_by: CORE_STRINGS, holders: broken },
      ]);
      await openDelete();

      expect(await screen.findByRole('alert')).toHaveTextContent(`${CORE_STRINGS.join(', ')}.`, {
        normalizeWhitespace: false,
      });
    });
  });
});

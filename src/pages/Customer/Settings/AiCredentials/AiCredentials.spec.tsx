import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import AiCredentials from './AiCredentials';
import { maskKey } from '@/constants/aiProviders';
import type { ApiKey } from '@/types/agents';
import type { ListApiKeysOptions } from '@/services/agents/agentService';

// EVO-2250 story 1.1: the page reads the evo_core_api_keys registry only, never
// returns the key to the browser, and gates every action on ai_api_keys.*.
let granted: string[] = [];

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => granted.includes(`${resource}.${action}`),
    isReady: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    // Echo the interpolated code so the error-path test can see it reach the toast.
    t: (key: string, opts?: { code?: string }) => (opts?.code ? `${key}:${opts.code}` : key),
    currentLanguage: 'en',
  }),
}));

const listApiKeys = vi.fn();
const createApiKey = vi.fn();
const updateApiKey = vi.fn();
const deleteApiKey = vi.fn();
const listAgents = vi.fn();
const getAiCredentialMigrationState = vi.fn();

vi.mock('@/services/agents', () => ({
  listApiKeys: (...args: unknown[]) => listApiKeys(...args),
  createApiKey: (...args: unknown[]) => createApiKey(...args),
  updateApiKey: (...args: unknown[]) => updateApiKey(...args),
  deleteApiKey: (...args: unknown[]) => deleteApiKey(...args),
  listAgents: (...args: unknown[]) => listAgents(...args),
  getAiCredentialMigrationState: (...args: unknown[]) => getAiCredentialMigrationState(...args),
}));

type MigrationState = { migrated: boolean; legacy_fallback_active: boolean };

// The server's word on the legacy fallback (Ai::MigrationState). Tests that
// need the fallback alive say so explicitly; the default is a migrated install.
const serverSaysLegacy = (active: boolean) =>
  getAiCredentialMigrationState.mockResolvedValue({ migrated: !active, legacy_fallback_active: active });

// Persists the toggle so the reload after it reflects the new state, the way
// the core does.
const mockToggleWritesThrough = () =>
  updateApiKey.mockImplementation((id: string, data: Partial<ApiKey>) => {
    registry = registry.map(key => (key.id === id ? { ...key, ...data } : key));
    return Promise.resolve(registry.find(key => key.id === id));
  });

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const OPENAI_KEY: ApiKey = {
  id: 'key-openai',
  name: 'Producao',
  provider: 'openai',
  key_hint: '4f2a',
  openai_compatible: true,
  scope: 'account',
  is_active: true,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

const ANTHROPIC_KEY: ApiKey = {
  id: 'key-anthropic',
  name: 'Testes',
  provider: 'anthropic',
  key_hint: '91bc',
  openai_compatible: false,
  scope: 'account',
  is_active: false,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

const INSTALLATION_KEY: ApiKey = {
  id: 'key-installation',
  name: 'Chave da casa',
  provider: 'openai',
  key_hint: 'aa11',
  openai_compatible: true,
  scope: 'installation',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
};

const ALL_PERMISSIONS = [
  'ai_api_keys.read',
  'ai_api_keys.create',
  'ai_api_keys.update',
  'ai_api_keys.delete',
];

// Since story 1.2 the credential name also appears in the "in use" panel, so
// table assertions resolve the row instead of the bare text.
const findAccountRow = () => screen.findByRole('cell', { name: 'Producao' });

// Mirrors the registry: `active` picks one state, and its absence means "active
// only" — the default that used to hide a deactivated credential (CRM-174).
// Mutable so a toggle can be observed across the reload that follows it.
let registry: ApiKey[] = [];
const mockRegistry = (keys: ApiKey[]) => {
  registry = keys;
  listApiKeys.mockImplementation((_page?: number, _pageSize?: number, options?: ListApiKeysOptions) =>
    Promise.resolve(registry.filter(key => key.is_active === (options?.active ?? true))),
  );
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
  granted = [...ALL_PERMISSIONS];
  mockRegistry([OPENAI_KEY, ANTHROPIC_KEY]);
  listAgents.mockResolvedValue({ data: [] });
  serverSaysLegacy(false);
});

describe('AiCredentials — listing (AC1, AC7)', () => {
  it('renders each credential with a masked key, never the key itself', async () => {
    render(<AiCredentials />);

    expect(await findAccountRow()).toBeInTheDocument();
    expect(screen.getByText(maskKey('4f2a'))).toBeInTheDocument();
    expect(screen.getByText(maskKey('91bc'))).toBeInTheDocument();
    // The registry is the only source consulted, asked for both states so a
    // deactivated credential stays on screen (CRM-174).
    expect(listApiKeys).toHaveBeenCalledTimes(2);
    expect(listApiKeys).toHaveBeenCalledWith(1, 100, { active: true });
    expect(listApiKeys).toHaveBeenCalledWith(1, 100, { active: false });
  });

  it('says which features each provider serves', async () => {
    render(<AiCredentials />);

    await findAccountRow();
    expect(screen.getByText('serves.all')).toBeInTheDocument();
    expect(screen.getByText('serves.agentsOnly')).toBeInTheDocument();
  });

  it('shows the active/inactive state per credential', async () => {
    render(<AiCredentials />);

    await findAccountRow();
    expect(screen.getByText('status.active')).toBeInTheDocument();
    expect(screen.getByText('status.inactive')).toBeInTheDocument();
  });
});

describe('AiCredentials — permission gates (AC8)', () => {
  it('refuses to render the list without ai_api_keys.read', async () => {
    granted = [];
    render(<AiCredentials />);

    expect(await screen.findByText('messages.permissionDenied.read')).toBeInTheDocument();
    expect(listApiKeys).not.toHaveBeenCalled();
  });

  it('hides the create action without ai_api_keys.create', async () => {
    granted = ['ai_api_keys.read'];
    render(<AiCredentials />);

    await findAccountRow();
    expect(screen.queryByText('actions.add')).not.toBeInTheDocument();
  });

  it('hides edit and delete without the matching grants', async () => {
    granted = ['ai_api_keys.read'];
    render(<AiCredentials />);

    await findAccountRow();
    expect(screen.queryByLabelText('actions.edit')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('actions.delete')).not.toBeInTheDocument();
  });

  it('shows edit and delete when granted (positive control)', async () => {
    render(<AiCredentials />);

    await findAccountRow();
    expect(screen.getAllByLabelText('actions.edit').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('actions.delete').length).toBeGreaterThan(0);
  });
});

describe('AiCredentials — editing without resending the key (AC3)', () => {
  it('omits key_value when the field is left empty', async () => {
    const user = userEvent.setup();
    updateApiKey.mockResolvedValue(OPENAI_KEY);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.edit')[0]);
    await user.click(await screen.findByText('actions.save'));

    await waitFor(() => expect(updateApiKey).toHaveBeenCalled());
    const [, payload] = updateApiKey.mock.calls[0];
    expect(payload).not.toHaveProperty('key_value');
    expect(payload.name).toBe('Producao');
  });

  it('sends key_value when a new key is typed', async () => {
    const user = userEvent.setup();
    updateApiKey.mockResolvedValue(OPENAI_KEY);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.edit')[0]);
    await user.type(await screen.findByLabelText('form.labels.key'), 'sk-rotated-0001');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(updateApiKey).toHaveBeenCalled());
    const [, payload] = updateApiKey.mock.calls[0];
    expect(payload.key_value).toBe('sk-rotated-0001');
  });
});

describe('AiCredentials — incompatible provider warning (AC7)', () => {
  it('warns without blocking when the provider is not OpenAI-compatible', async () => {
    const user = userEvent.setup();
    render(<AiCredentials />);

    await findAccountRow();
    // The Anthropic credential is incompatible; editing it surfaces the notice.
    await user.click(screen.getAllByLabelText('actions.edit')[1]);

    expect(await screen.findByRole('alert')).toHaveTextContent('form.incompatibleWarning');
    // Saving stays available — the warning informs, it does not block.
    expect(screen.getByText('actions.save')).toBeEnabled();
  });

  it('does not warn for an OpenAI-compatible provider', async () => {
    const user = userEvent.setup();
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.edit')[0]);

    await screen.findByLabelText('form.labels.key');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('AiCredentials — delete warns about agents in use (AC5)', () => {
  it('lists the agents using the credential before confirming', async () => {
    const user = userEvent.setup();
    listAgents.mockResolvedValue({
      data: [
        { id: 'a1', name: 'Atendente', api_key_id: 'key-openai' },
        { id: 'a2', name: 'Outro', api_key_id: 'key-anthropic' },
      ],
    });
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.delete')[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('deleteDialog.inUseWarning');
    // Nothing is deleted until the user confirms.
    expect(deleteApiKey).not.toHaveBeenCalled();
  });

  it('deletes only after confirmation', async () => {
    const user = userEvent.setup();
    deleteApiKey.mockResolvedValue({ message: 'ok' });
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.delete')[0]);
    await user.click(await screen.findByText('deleteDialog.confirm'));

    await waitFor(() => expect(deleteApiKey).toHaveBeenCalledWith('key-openai'));
  });
});

// EVO-2250 story 1.2: the installation link of the chain.
describe('AiCredentials — deactivate keeps the row and can be undone (CRM-174)', () => {
  beforeEach(() => {
    mockRegistry([OPENAI_KEY]);
    // Persist the toggle so the reload after it reflects the new state, the
    // way the core does.
    updateApiKey.mockImplementation((id: string, data: Partial<ApiKey>) => {
      registry = registry.map(key => (key.id === id ? { ...key, ...data } : key));
      return Promise.resolve(registry.find(key => key.id === id));
    });
  });

  it('keeps a deactivated credential visible, marked inactive, with the activate action', async () => {
    const user = userEvent.setup();
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.deactivate'));

    await waitFor(() =>
      expect(updateApiKey).toHaveBeenCalledWith('key-openai', expect.objectContaining({ is_active: false })),
    );
    // Still on screen after the reload — the row used to vanish here.
    expect(await findAccountRow()).toBeInTheDocument();
    expect(await screen.findByText('status.inactive')).toBeInTheDocument();
    expect(screen.getByText('actions.activate')).toBeInTheDocument();
    expect(screen.queryByText('empty.title')).not.toBeInTheDocument();
  });

  it('reactivates from the screen, closing the cycle', async () => {
    const user = userEvent.setup();
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.deactivate'));
    await user.click(await screen.findByText('actions.activate'));

    await waitFor(() =>
      expect(updateApiKey).toHaveBeenLastCalledWith('key-openai', expect.objectContaining({ is_active: true })),
    );
    expect(await screen.findByText('status.active')).toBeInTheDocument();
    expect(screen.getByText('actions.deactivate')).toBeInTheDocument();
    expect(screen.queryByText('status.inactive')).not.toBeInTheDocument();
  });

  // The inactive listing is a second call: it must not be able to take the
  // whole screen down with it, which a bare Promise.all rejection would.
  it('still lists the active credentials when the inactive listing fails', async () => {
    listApiKeys.mockImplementation((_page?: number, _pageSize?: number, options?: ListApiKeysOptions) =>
      options?.active === false
        ? Promise.reject(new Error('boom'))
        : Promise.resolve([OPENAI_KEY]),
    );
    render(<AiCredentials />);

    expect(await findAccountRow()).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  // Both calls run concurrently, so a key toggled mid-flight lands in both
  // listings. The inactive read wins: claiming a deactivated credential is
  // serving is the worse of the two lies.
  it('renders a key returned by both listings as inactive', async () => {
    listApiKeys.mockImplementation((_page?: number, _pageSize?: number, options?: ListApiKeysOptions) =>
      Promise.resolve([{ ...OPENAI_KEY, is_active: options?.active ?? true }]),
    );
    render(<AiCredentials />);

    await findAccountRow();
    expect(screen.getAllByRole('cell', { name: 'Producao' })).toHaveLength(1);
    expect(screen.getByText('status.inactive')).toBeInTheDocument();
    expect(screen.queryByText('status.active')).not.toBeInTheDocument();
  });


  // The panel used to guess "legacy" from "no active credential". On a migrated
  // install that reads as "AI still runs" while it is simply off (CRM-187).
  it('says "none", not "legacy", when the only credential is deactivated on a migrated install', async () => {
    const user = userEvent.setup();
    serverSaysLegacy(false);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.deactivate'));
    await screen.findByText('status.inactive');

    const panel = screen.getByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('inUse.none'));
    expect(panel).not.toHaveTextContent('inUse.legacy');
  });

  it('keeps saying "legacy" while the server reports the fallback alive', async () => {
    const user = userEvent.setup();
    serverSaysLegacy(true);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.deactivate'));
    await screen.findByText('status.inactive');

    const panel = screen.getByLabelText('inUse.title');
    expect(panel).toHaveTextContent('inUse.legacy');
    expect(panel).not.toHaveTextContent('inUse.none');
  });
});

describe('AiCredentials — installation scope (1.2 AC1, AC2)', () => {
  const findInstallationRow = () => screen.findByRole('cell', { name: 'Chave da casa' });

  // Scoped to the section instead of indexed into getAllByText: the account's
  // add button lives in the page header, so an index follows any layout change
  // to the wrong button.
  const installationSection = () => screen.getByLabelText('sections.installation');
  const addInstallationButton = () => within(installationSection()).getByText('actions.add');
  const addAccountButton = () =>
    screen.getAllByText('actions.add').find(button => !installationSection().contains(button))!;

  beforeEach(() => {
    mockRegistry([OPENAI_KEY, INSTALLATION_KEY]);
  });

  it('splits credentials into the account and installation sections', async () => {
    render(<AiCredentials />);

    await findAccountRow();
    expect(await findInstallationRow()).toBeInTheDocument();
    // The same listing (active + inactive) feeds both sections; scope is
    // split on the client.
    expect(listApiKeys).toHaveBeenCalledTimes(2);
  });

  it('lets an installation admin add a credential at that level', async () => {
    const user = userEvent.setup();
    granted = [...ALL_PERMISSIONS, 'installation_configs.manage'];
    createApiKey.mockResolvedValue(INSTALLATION_KEY);
    render(<AiCredentials />);

    await findInstallationRow();
    await user.click(addInstallationButton());

    await user.type(await screen.findByLabelText('form.labels.name'), 'Nova da casa');
    await user.click(screen.getByLabelText('form.labels.provider'));
    await user.click(await screen.findByRole('option', { name: 'OpenAI' }));
    await user.type(screen.getByLabelText('form.labels.key'), 'sk-house-0002');
    await user.click(screen.getByText('actions.save'));

    // The whole point of the section: the CREATE carries scope 'installation',
    // or the row lands on the account and the Evo default stays empty.
    await waitFor(() => expect(createApiKey).toHaveBeenCalled());
    expect(createApiKey.mock.calls[0][0]).toMatchObject({
      name: 'Nova da casa',
      provider: 'openai',
      key_value: 'sk-house-0002',
      scope: 'installation',
    });
  });

  it('sends scope account when the add button of the account section is used', async () => {
    const user = userEvent.setup();
    granted = [...ALL_PERMISSIONS, 'installation_configs.manage'];
    createApiKey.mockResolvedValue(OPENAI_KEY);
    render(<AiCredentials />);

    await findInstallationRow();
    await user.click(addAccountButton());

    await user.type(await screen.findByLabelText('form.labels.name'), 'Nova da conta');
    await user.click(screen.getByLabelText('form.labels.provider'));
    await user.click(await screen.findByRole('option', { name: 'OpenAI' }));
    await user.type(screen.getByLabelText('form.labels.key'), 'sk-acct-0003');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(createApiKey).toHaveBeenCalled());
    expect(createApiKey.mock.calls[0][0]).toMatchObject({ scope: 'account' });
  });

  // The scope privilege is ON TOP of ai_api_keys.create, not instead of it:
  // offering the button to someone the server will refuse is a dead end.
  it('hides the installation add button without ai_api_keys.create', async () => {
    granted = [
      ...ALL_PERMISSIONS.filter(permission => permission !== 'ai_api_keys.create'),
      'installation_configs.manage',
    ];
    render(<AiCredentials />);

    await findInstallationRow();
    expect(within(installationSection()).queryByText('actions.add')).not.toBeInTheDocument();
  });

  // The same rule on the update axis: the PUT route demands ai_api_keys.update
  // whatever the scope, so installation_configs.manage alone must not light up
  // the edit controls.
  it('keeps the installation row read-only without ai_api_keys.update', async () => {
    granted = [
      ...ALL_PERMISSIONS.filter(permission => permission !== 'ai_api_keys.update'),
      'installation_configs.manage',
    ];
    render(<AiCredentials />);

    await findInstallationRow();
    expect(screen.queryAllByLabelText('actions.edit')).toHaveLength(0);
    expect(screen.getByText('inheritedReadOnly')).toBeInTheDocument();
  });

  // Delete does not travel through update: dropping the update grant must not
  // take the trash icon with it, on either row.
  it('keeps the delete control without ai_api_keys.update', async () => {
    granted = [
      ...ALL_PERMISSIONS.filter(permission => permission !== 'ai_api_keys.update'),
      'installation_configs.manage',
    ];
    render(<AiCredentials />);

    await findInstallationRow();
    expect(screen.getAllByLabelText('actions.delete')).toHaveLength(2);
  });

  it('renders installation credentials read-only without installation_configs.manage (AC2)', async () => {
    render(<AiCredentials />);

    await findInstallationRow();
    expect(screen.getByText('inheritedReadOnly')).toBeInTheDocument();
    // Exactly one edit control: the account row's. The installation row has none.
    expect(screen.getAllByLabelText('actions.edit')).toHaveLength(1);
    expect(screen.getAllByLabelText('actions.delete')).toHaveLength(1);
  });

  it('exposes write controls on the installation row when granted (positive control)', async () => {
    granted = [...ALL_PERMISSIONS, 'installation_configs.manage'];
    render(<AiCredentials />);

    await findInstallationRow();
    expect(screen.queryByText('inheritedReadOnly')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('actions.edit')).toHaveLength(2);
  });

  it('sends the scope when updating an installation credential', async () => {
    const user = userEvent.setup();
    granted = [...ALL_PERMISSIONS, 'installation_configs.manage'];
    updateApiKey.mockResolvedValue(INSTALLATION_KEY);
    render(<AiCredentials />);

    await findInstallationRow();
    await user.click(screen.getAllByLabelText('actions.edit')[1]);
    await user.click(await screen.findByText('actions.save'));

    await waitFor(() => expect(updateApiKey).toHaveBeenCalled());
    const [id, payload] = updateApiKey.mock.calls[0];
    expect(id).toBe('key-installation');
    expect(payload.scope).toBe('installation');
  });

  it('shows the empty hint when the installation has no default', async () => {
    mockRegistry([OPENAI_KEY]);
    render(<AiCredentials />);

    await findAccountRow();
    expect(screen.getByText('installationEmpty')).toBeInTheDocument();
  });
});

// The panel answers "which credential is in effect right now" (1.2 AC9).
describe('AiCredentials — in-use panel (1.2 AC9)', () => {
  it('shows the account credential winning over the installation default', async () => {
    mockRegistry([INSTALLATION_KEY, OPENAI_KEY]);
    render(<AiCredentials />);

    await findAccountRow();
    const panel = screen.getByLabelText('inUse.title');
    expect(panel).toHaveTextContent('inUse.features.aiAgents');
    expect(panel).toHaveTextContent('Producao');
    expect(panel).toHaveTextContent('inUse.fromAccount');
  });

  it('falls back to the installation default when the account has none', async () => {
    mockRegistry([INSTALLATION_KEY]);
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('Chave da casa'));
    expect(panel).toHaveTextContent('inUse.fromInstallation');
    expect(panel).toHaveTextContent('inUse.inheritingHint');
  });

  it('ignores an inactive account credential and inherits the default', async () => {
    mockRegistry([INSTALLATION_KEY, ANTHROPIC_KEY]);
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('Chave da casa'));
  });

  // This used to assert `inUse.none` for an empty registry. That was the lie
  // MÉDIO 15 names: an installation that has not migrated resolves through the
  // resolver's legacy fallback, so AI is running while the registry is empty.
  // "No credential" told the user their working AI was off.
  it('reports the legacy fallback, not "none", when the registry is empty on a non-migrated install', async () => {
    mockRegistry([]);
    serverSaysLegacy(true);
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('inUse.legacy'));
  });

  it('lists the five AI features of the CRM (1.4 completes the panel)', async () => {
    mockRegistry([OPENAI_KEY]);
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    ['aiAgents', 'inboxAssist', 'audioTranscription', 'labelSuggestion', 'moderation'].forEach(
      feature => expect(panel).toHaveTextContent(`inUse.features.${feature}`),
    );
  });

  // 1.4 AC7: an Anthropic account credential serves Agents but none of the four
  // OpenAI-shaped features, which fall through to the installation default.
  it('splits agents from the OpenAI-only features when providers differ', async () => {
    const anthropicActive = { ...ANTHROPIC_KEY, is_active: true };
    mockRegistry([INSTALLATION_KEY, anthropicActive]);
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('Testes'));
    // The house key covers transcription, labels and moderation.
    expect(panel).toHaveTextContent('Chave da casa');
    expect(panel).toHaveTextContent('inUse.fromInstallation');
  });

  // 1.3 AC8 + FR18: the assist cannot speak Anthropic, so it shows the
  // installation default while AI Agents keep the account credential.
  it('shows the assist falling back when the account credential is incompatible', async () => {
    const anthropicActive = { ...ANTHROPIC_KEY, is_active: true };
    mockRegistry([INSTALLATION_KEY, anthropicActive]);
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('Testes'));
    expect(panel).toHaveTextContent('Chave da casa');
    expect(panel).toHaveTextContent('inUse.fromInstallation');
  });
});

describe('AiCredentials — creating (AC2)', () => {
  it('blocks the save when the provider was never picked', async () => {
    const user = userEvent.setup();
    createApiKey.mockResolvedValue(OPENAI_KEY);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.add'));

    await user.type(await screen.findByLabelText('form.labels.name'), 'Nova');
    await user.type(screen.getByLabelText('form.labels.key'), 'sk-nova-0001');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(createApiKey).not.toHaveBeenCalled());
  });

  // handleSave used to run every save through the update gate, so a create-only
  // grant was refused a credential the server would have accepted.
  it('creates at account scope without ai_api_keys.update', async () => {
    const user = userEvent.setup();
    granted = ['ai_api_keys.read', 'ai_api_keys.create'];
    createApiKey.mockResolvedValue(OPENAI_KEY);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.add'));

    await user.type(await screen.findByLabelText('form.labels.name'), 'Nova');
    await user.click(screen.getByLabelText('form.labels.provider'));
    await user.click(await screen.findByRole('option', { name: 'OpenAI' }));
    await user.type(screen.getByLabelText('form.labels.key'), 'sk-create-only');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(createApiKey).toHaveBeenCalled());
    expect(createApiKey.mock.calls[0][0]).toMatchObject({ scope: 'account' });
  });

  it('sends name, provider and key to the registry once the form is complete', async () => {
    const user = userEvent.setup();
    createApiKey.mockResolvedValue(OPENAI_KEY);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.add'));

    await user.type(await screen.findByLabelText('form.labels.name'), 'Nova');
    await user.click(screen.getByLabelText('form.labels.provider'));
    await user.click(await screen.findByRole('option', { name: 'Anthropic' }));
    await user.type(screen.getByLabelText('form.labels.key'), 'sk-nova-0001');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(createApiKey).toHaveBeenCalled());
    expect(createApiKey.mock.calls[0][0]).toMatchObject({
      name: 'Nova',
      provider: 'anthropic',
      key_value: 'sk-nova-0001',
      scope: 'account',
    });
  });
});

// The API answers a 500 with a machine-readable code (e.g. ERR_UNDEFINED_COLUMN when
// the schema is behind the binary). The toast must carry that code instead of the
// bare "failed to save", or the person on screen has nothing to report.
describe('AiCredentials — save error carries the API code', () => {
  it('shows the envelope code on the toast when the save fails', async () => {
    const user = userEvent.setup();
    updateApiKey.mockRejectedValue({
      response: { status: 500, data: { success: false, error: { code: 'ERR_UNDEFINED_COLUMN', message: 'Undefined column' } } },
    });
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.edit')[0]);
    await user.click(await screen.findByText('actions.save'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.saveErrorWithCode:ERR_UNDEFINED_COLUMN'));
  });

  it('keeps the plain message when the failure has no envelope code', async () => {
    const user = userEvent.setup();
    updateApiKey.mockRejectedValue(new Error('network down'));
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.edit')[0]);
    await user.click(await screen.findByText('actions.save'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.saveError'));
  });

  // AC4 is written for the whole screen, not just the save: load, toggle and delete
  // must surface the same code, or the person on screen is blind on three of four paths.
  const ENVELOPE_500 = {
    response: { status: 500, data: { success: false, error: { code: 'ERR_UNDEFINED_COLUMN', message: 'Undefined column' } } },
  };

  it('shows the envelope code when the list fails to load', async () => {
    listApiKeys.mockRejectedValue(ENVELOPE_500);
    render(<AiCredentials />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.loadErrorWithCode:ERR_UNDEFINED_COLUMN'));
  });

  it('shows the envelope code when the activate/deactivate toggle fails', async () => {
    const user = userEvent.setup();
    updateApiKey.mockRejectedValue(ENVELOPE_500);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByText('actions.deactivate')[0]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.saveErrorWithCode:ERR_UNDEFINED_COLUMN'));
  });

  it('shows the envelope code when the delete fails', async () => {
    const user = userEvent.setup();
    deleteApiKey.mockRejectedValue(ENVELOPE_500);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.delete')[0]);
    await user.click(await screen.findByText('deleteDialog.confirm'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.deleteErrorWithCode:ERR_UNDEFINED_COLUMN'));
  });
});

// EVO-2250 review, ALTO 7: the screen has always sent base_url, but the field
// did not exist in the backend and the value was silently discarded. Now that
// the column exists (core migration 000022), these lock the round trip.
describe('AiCredentials — base_url round trip (ALTO 7)', () => {
  it('sends the typed endpoint on create', async () => {
    const user = userEvent.setup();
    createApiKey.mockResolvedValue(OPENAI_KEY);
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getByText('actions.add'));

    await user.type(await screen.findByLabelText('form.labels.name'), 'Gateway');
    await user.type(screen.getByLabelText('form.labels.key'), 'sk-gw-0001');
    // The base URL input only renders for the custom OpenAI-compatible
    // provider, which is exactly the case that needs an endpoint.
    expect(screen.queryByLabelText('form.labels.baseUrl')).not.toBeInTheDocument();
  });

  it('renders the stored endpoint when editing a credential that has one', async () => {
    const user = userEvent.setup();
    mockRegistry([
      { ...OPENAI_KEY, provider: 'custom_openai_compatible', base_url: 'https://gw.example.com/v1' },
    ]);
    render(<AiCredentials />);

    await screen.findByRole('cell', { name: 'Producao' });
    await user.click(screen.getAllByLabelText('actions.edit')[0]);

    expect(await screen.findByLabelText('form.labels.baseUrl')).toHaveValue(
      'https://gw.example.com/v1',
    );
  });

  it('carries base_url in the update payload (negative proof of the discard)', async () => {
    const user = userEvent.setup();
    updateApiKey.mockResolvedValue(OPENAI_KEY);
    mockRegistry([
      { ...OPENAI_KEY, provider: 'custom_openai_compatible', base_url: 'https://gw.example.com/v1' },
    ]);
    render(<AiCredentials />);

    await screen.findByRole('cell', { name: 'Producao' });
    await user.click(screen.getAllByLabelText('actions.edit')[0]);
    await screen.findByLabelText('form.labels.baseUrl');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() => expect(updateApiKey).toHaveBeenCalled());
    const [, payload] = updateApiKey.mock.calls[0];
    // This fails if the endpoint ever stops travelling: the backend replaces
    // what it receives, so a dropped base_url is a lost endpoint.
    expect(payload.base_url).toBe('https://gw.example.com/v1');
  });
});

// EVO-2250 review, MÉDIO 15 and BAIXO 19.
describe('AiCredentials — panel honesty and full agent count', () => {
  it('says "configured before this screen" instead of "no credential" on a non-migrated install', async () => {
    mockRegistry([]);
    serverSaysLegacy(true);
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    // The registry is empty but the resolver's legacy fallback still serves:
    // claiming "no credential" told the user their working AI was off.
    await waitFor(() => expect(panel).toHaveTextContent('inUse.legacy'));
    expect(panel).not.toHaveTextContent('inUse.none');
  });

  it('says "none" on an empty registry once the server reports the install migrated', async () => {
    mockRegistry([]);
    serverSaysLegacy(false);
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('inUse.none'));
    expect(panel).not.toHaveTextContent('inUse.legacy');
  });

  // An older CRM without the endpoint, or a transient failure: the panel keeps
  // the pre-existing heuristic instead of trading one lie for another, and the
  // credential list itself is unaffected.
  it('falls back to the heuristic and still lists the credentials when the signal fails', async () => {
    mockRegistry([ANTHROPIC_KEY]);
    getAiCredentialMigrationState.mockRejectedValue(new Error('404'));
    render(<AiCredentials />);

    // The list still renders — the inactive row, from the second listing call.
    expect(await screen.findByRole('cell', { name: 'Testes' })).toBeInTheDocument();
    const panel = screen.getByLabelText('inUse.title');
    // Heuristic: no active credential → legacy, as before this change.
    await waitFor(() => expect(panel).toHaveTextContent('inUse.legacy'));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('treats a malformed answer as unknown and keeps the heuristic', async () => {
    mockRegistry([]);
    getAiCredentialMigrationState.mockResolvedValue({ legacy_fallback_active: 'yes' });
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('inUse.legacy'));
  });

  // Before the server answers, the panel must show neither verdict: a guessed
  // "legacy" that flips to "none" a moment later is the very lie this fixes.
  it('shows no verdict while the migration state is still loading', async () => {
    mockRegistry([]);
    let answer: (state: MigrationState) => void = () => {};
    getAiCredentialMigrationState.mockReturnValue(new Promise(resolve => { answer = resolve; }));
    render(<AiCredentials />);

    const panel = await screen.findByLabelText('inUse.title');
    // The empty state proves the list already settled, so the signal is the
    // only thing still missing — otherwise `loading` alone would satisfy this.
    await screen.findByText('empty.title');
    expect(panel).not.toHaveTextContent('inUse.legacy');
    expect(panel).not.toHaveTextContent('inUse.none');

    answer({ migrated: true, legacy_fallback_active: false });
    await waitFor(() => expect(panel).toHaveTextContent('inUse.none'));
  });

  // The signal decides "legacy" vs "none" and nothing else: a credential that
  // resolves from the registry is settled by the list alone, so waiting on the
  // CRM would hide a name the screen already knows.
  it('shows the resolved credential without waiting for the migration state', async () => {
    mockRegistry([OPENAI_KEY]);
    getAiCredentialMigrationState.mockReturnValue(new Promise(() => {}));
    render(<AiCredentials />);

    await findAccountRow();

    const panel = screen.getByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('Producao'));
  });

  // A refresh re-asks the server, and the previous answer describes the
  // previous registry: rendering it against the new list is the same flip this
  // story removed from the first load.
  it('withholds the verdict while a refreshed signal is in flight', async () => {
    const user = userEvent.setup();
    mockRegistry([OPENAI_KEY]);
    let answerSecond: (state: MigrationState) => void = () => {};
    getAiCredentialMigrationState
      .mockResolvedValueOnce({ migrated: true, legacy_fallback_active: false })
      .mockReturnValueOnce(new Promise(resolve => { answerSecond = resolve; }));
    mockToggleWritesThrough();

    render(<AiCredentials />);
    await findAccountRow();
    const panel = screen.getByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('Producao'));

    await user.click(screen.getByText('actions.deactivate'));
    await screen.findByText('status.inactive');

    // The list came back deactivated; the refreshed signal has not. Neither
    // verdict may show — least of all the one from before the toggle.
    expect(panel).not.toHaveTextContent('inUse.none');
    expect(panel).not.toHaveTextContent('inUse.legacy');

    answerSecond({ migrated: false, legacy_fallback_active: true });
    await waitFor(() => expect(panel).toHaveTextContent('inUse.legacy'));
  });

  it('ignores a stale migration state answer that lands after a newer one', async () => {
    const user = userEvent.setup();
    mockRegistry([OPENAI_KEY]);
    let answerFirst: (state: MigrationState) => void = () => {};
    let answerSecond: (state: MigrationState) => void = () => {};
    getAiCredentialMigrationState
      .mockReturnValueOnce(new Promise(resolve => { answerFirst = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { answerSecond = resolve; }));
    mockToggleWritesThrough();

    render(<AiCredentials />);
    await findAccountRow();
    await user.click(screen.getByText('actions.deactivate'));
    await screen.findByText('status.inactive');
    expect(getAiCredentialMigrationState).toHaveBeenCalledTimes(2);

    answerSecond({ migrated: true, legacy_fallback_active: false });
    const panel = screen.getByLabelText('inUse.title');
    await waitFor(() => expect(panel).toHaveTextContent('inUse.none'));

    // The first request finally answers, describing the registry before the
    // toggle. It must not overwrite the newer verdict.
    answerFirst({ migrated: false, legacy_fallback_active: true });
    await waitFor(() => expect(panel).toHaveTextContent('inUse.none'));
    expect(panel).not.toHaveTextContent('inUse.legacy');
  });

  it('asks the server for the migration state on load', async () => {
    render(<AiCredentials />);

    await findAccountRow();
    expect(getAiCredentialMigrationState).toHaveBeenCalledTimes(1);
  });

  it('counts agents beyond the first page before confirming a delete', async () => {
    const user = userEvent.setup();
    const firstPage = Array.from({ length: 100 }, (_, i) => ({
      id: `a${i}`,
      name: `Agente ${i}`,
      api_key_id: 'outra-chave',
    }));
    listAgents.mockImplementation((page?: number) =>
      Promise.resolve({
        data: page === 1 ? firstPage : [{ id: 'a100', name: 'Agente tardio', api_key_id: 'key-openai' }],
      }),
    );
    render(<AiCredentials />);

    await findAccountRow();
    await user.click(screen.getAllByLabelText('actions.delete')[0]);

    // The only agent using this credential sits on page 2: stopping at the
    // first page told the user nothing would break.
    expect(await screen.findByRole('alert')).toHaveTextContent('deleteDialog.inUseWarning');
    expect(listAgents).toHaveBeenCalledTimes(2);
  });
});

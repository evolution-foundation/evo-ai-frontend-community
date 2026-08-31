import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The role editor must not offer a manageable checkbox for a permission held
// regardless of the role. `basic` (every user) is always locked. `implied_by`
// is global catalog metadata, so it locks the checkbox ONLY when this role
// actually holds the source grant; otherwise the implied permission is a
// normal, editable grant. Locked permissions render checked + disabled and
// never reach the save payload.

const bulkUpdateMock = vi.fn().mockResolvedValue({ id: 'r1', permissions_by_resource: {} });
const createMock = vi.fn().mockResolvedValue({ id: 'r2', key: 'agent_copy', system: false, name: 'Agent (copy)' });

// Stable references: loadData depends on [id, t, navigate]; fresh identities
// each render would re-fire the effect in a loop (stuck loading).
const navigateStub = vi.fn();
const tStub = (k: string) => k;
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'r1' }),
  useNavigate: () => navigateStub,
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: tStub, currentLanguage: 'en' }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true, loading: false }),
}));

// Mutable so each test can seed the role's real grants before rendering.
let rolePermissions: Record<string, string[]> = { labels: ['create'] };
// Which role is being edited, and whether it is a system role.
let roleKey = 'agent';
let roleSystem = false;

vi.mock('@/services/roles/rolesService', () => ({
  rolesService: {
    get: vi.fn().mockImplementation(() =>
      Promise.resolve({
        id: 'r1',
        key: roleKey,
        system: roleSystem,
        name: 'Agent',
        description: '',
        permissions_by_resource: rolePermissions,
      }),
    ),
    bulkUpdatePermissions: (...args: unknown[]) => bulkUpdateMock(...args),
    create: (...args: unknown[]) => createMock(...args),
  },
}));

vi.mock('@/services/permissions', () => ({
  permissionsService: {
    getResourceActions: vi.fn().mockResolvedValue({
      data: {
        resources: {
          conversations: {
            name: 'Conversations',
            description: '',
            actions: {
              // group "view"
              read: { name: 'View', description: '', basic: false, implied_by: null },
              search: { name: 'Search', description: '', basic: false, implied_by: null },
              attachments: { name: 'Attachments', description: '', basic: false, implied_by: null },
              // group "write"
              create: { name: 'Create', description: '', basic: false, implied_by: null },
              update: { name: 'Update', description: '', basic: false, implied_by: null },
              toggle_status: { name: 'Toggle status', description: '', basic: false, implied_by: null },
              delete: { name: 'Delete', description: '', basic: false, implied_by: null },
              // standalone: scope, not CRUD — keeps its own row
              read_all: { name: 'Read all', description: '', basic: false, implied_by: null },
            },
          },
          labels: {
            name: 'Labels',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: true, implied_by: null },
              create: { name: 'Create', description: '', basic: false, implied_by: null },
            },
          },
          users: {
            // users.read is only carried operationally by conversations.read.
            name: 'Users',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: 'conversations.read' },
              stats: { name: 'Statistics', description: '', basic: false, implied_by: null },
            },
          },
          // CRM domain, with nested children (pipeline_stages, pipeline_items) under pipelines.
          pipelines: {
            name: 'Pipelines',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          pipeline_stages: {
            name: 'Pipeline Stages',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              create: { name: 'Create', description: '', basic: false, implied_by: null },
            },
          },
          // CRM-178: card writes, write-only (reads stay on pipelines.read).
          pipeline_items: {
            name: 'Pipeline Cards',
            description: '',
            actions: {
              update: { name: 'Manage cards', description: '', basic: false, implied_by: null },
            },
          },
          // Channels domain: nested child (working_hours) + an inbox template action.
          inboxes: {
            name: 'Inboxes',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              // Live: gates the per-channel Meta sync → a write.
              message_templates: { name: 'Sync templates', description: '', basic: false, implied_by: null },
              // Dead since EVO-1716 → hidden.
              delete_message_template: { name: 'Delete template', description: '', basic: false, implied_by: null },
            },
          },
          working_hours: {
            name: 'Working Hours',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              update: { name: 'Update', description: '', basic: false, implied_by: null },
            },
          },
          // AI domain: a normal action next to a system action (leak guard).
          ai_agents: {
            name: 'AI Agents',
            description: '',
            actions: {
              read: { name: 'View', description: 'Manage AI robots', basic: false, implied_by: null },
              secret_sync: { name: 'Secret sync', description: '', system: true },
            },
          },
          // 100% system resource — its card must not render (AC3).
          installation_configs: {
            name: 'Installation Configs',
            description: '',
            actions: {
              manage: { name: 'Manage', description: '', system: true },
            },
          },
          // Fake resource absent from every domain → falls into "Others" (NFR4).
          zzz_new_feature: {
            name: 'Future Feature',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          // Hidden resources: the catalog still ships them, the editor must not.
          oauth_applications: {
            name: 'OAuth Applications',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              create: { name: 'Create', description: '', basic: false, implied_by: null },
            },
          },
          whatsapp_authorizations: {
            name: 'WhatsApp Authorizations',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              create: { name: 'Create', description: '', basic: false, implied_by: null },
            },
          },
          ai_folders: {
            name: 'AI Folders',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
            },
          },
          ai_tools: {
            name: 'AI Custom Tools',
            description: '',
            actions: {
              read: { name: 'View', description: '', basic: false, implied_by: null },
              available: { name: 'Available', description: '', basic: false, implied_by: null },
            },
          },
        },
      },
    }),
    clearPermissionsCache: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import RoleDetail from './RoleDetail';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  bulkUpdateMock.mockClear();
  createMock.mockClear();
  navigateStub.mockClear();
  rolePermissions = { labels: ['create'] };
  roleKey = 'agent';
  roleSystem = false;
});

const cb = (key: string) => document.getElementById(key) as HTMLButtonElement | null;

// Auth answers 403 on bulk_update_permissions for any system role, so the editor
// renders one read-only: grid visible, no toggles, no Save, lock notice. A checkbox
// whose save is refused is the lying control this screen exists to eliminate.
describe('RoleDetail — system roles are read-only', () => {
  it('offers no Save button for a system role', async () => {
    roleSystem = true;
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-labels-write')).not.toBeNull());

    expect(screen.queryByText('savePermissions')).toBeNull();
  });

  it('renders its checkboxes disabled and shows the read-only notice, grid still visible', async () => {
    roleSystem = true;
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-labels-write')).not.toBeNull());

    expect(cb('group-labels-write')).toBeDisabled();
    expect(screen.getByTestId('system-role-readonly-notice')).toBeTruthy();
  });

  // Pinned separately from the generic system-role case: it is the one the backend
  // guard is keyed on.
  it('is read-only for the installation owner specifically', async () => {
    roleKey = 'super_admin';
    roleSystem = true;
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-labels-write')).not.toBeNull());

    expect(screen.queryByText('savePermissions')).toBeNull();
    expect(cb('group-labels-write')).toBeDisabled();
  });

  it('still lets a custom (non-system) role be edited and saved', async () => {
    roleSystem = false;
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-labels-write')).not.toBeNull());

    expect(cb('group-labels-write')).not.toBeDisabled();
    expect(screen.queryByTestId('system-role-readonly-notice')).toBeNull();
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
  });
});

// The read-only notice names this action, so it has to exist and has to carry the
// source permissions over.
describe('RoleDetail — duplicating a system role as a custom one', () => {
  const openDialog = async () => {
    roleSystem = true;
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-labels-write')).not.toBeNull());
    await userEvent.click(screen.getByText('detail.duplicate'));
  };

  it('offers the duplicate action on a system role and not on a custom one', async () => {
    await openDialog();
    expect(screen.getByText('detail.duplicateTitle')).toBeTruthy();
  });

  it('creates the copy and carries the source permissions over', async () => {
    await openDialog();
    await userEvent.click(screen.getByText('detail.duplicateConfirm'));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    // The copy is written by id of the NEW role, never the source.
    const [newId, keys] = bulkUpdateMock.mock.calls.at(-1) as [string, string[]];
    expect(newId).toBe('r2');
    expect(keys).toContain('labels.create');
    // …and the user lands on the copy, which is editable.
    await waitFor(() => expect(navigateStub).toHaveBeenCalledWith('/settings/roles/r2'));
  });

  it('keeps the created role and still navigates when copying the permissions fails', async () => {
    bulkUpdateMock.mockRejectedValueOnce(new Error('403'));
    await openDialog();
    await userEvent.click(screen.getByText('detail.duplicateConfirm'));

    await waitFor(() => expect(navigateStub).toHaveBeenCalledWith('/settings/roles/r2'));
    expect(createMock).toHaveBeenCalled();
  });

  it('does not offer it on a custom role — that one is editable in place', async () => {
    roleSystem = false;
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-labels-write')).not.toBeNull());

    expect(screen.queryByText('detail.duplicate')).toBeNull();
  });
});

describe('RoleDetail — locked basic/implied permissions', () => {
  // A locked permission is held regardless of the role, so the editor offers no
  // decision about it: no row, no checkbox, and it never reaches the payload.
  it('renders no row for a basic permission, and never persists it', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-labels-write')).not.toBeNull());

    // labels.read is basic → nothing to grant, so the Read group has no editable
    // key and does not render at all.
    expect(cb('labels.read')).toBeNull();
    expect(cb('group-labels-read')).toBeNull();
    // The role already holds labels.create, so the Write group is checked.
    expect(cb('group-labels-write')).toHaveAttribute('data-state', 'checked');

    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('labels.create');
    expect(savedKeys).not.toContain('labels.read');
  });

  it('keeps an implied permission editable inside its group while its source is not held', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-users-read')).not.toBeNull());

    // users.read is implied by conversations.read, which this role does not hold —
    // so it is a genuine, grantable permission and lives in the Read group.
    await userEvent.click(cb('group-users-read') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('users.read');
  });

  it('drops the implied permission from the payload once its source is held', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-read')).not.toBeNull());

    await userEvent.click(cb('group-conversations-read') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());

    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('conversations.read');
    expect(savedKeys).not.toContain('users.read');
  });

  it('the Read group ignores a locked member when toggled', async () => {
    // Holding conversations.read locks users.read; toggling the users Read group
    // must still grant the keys that are actually editable.
    rolePermissions = { conversations: ['read'], labels: ['create'] };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-users-read')).not.toBeNull());

    await userEvent.click(cb('group-users-read') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('users.stats');
    expect(savedKeys).not.toContain('users.read');
  });
});

// EVO-2069: every resource collapses to Read / Write / Delete. The group is one
// checkbox; the save payload still carries the individual catalog keys.
describe('RoleDetail — action groups', () => {
  it('renders one checkbox per group, and none for the actions inside it', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-read')).not.toBeNull());

    expect(cb('group-conversations-write')).not.toBeNull();
    expect(cb('group-conversations-delete')).not.toBeNull();
    ['read', 'search', 'attachments', 'create', 'update', 'toggle_status', 'delete'].forEach(a =>
      expect(cb(`conversations.${a}`)).toBeNull(),
    );
  });

  it('keeps a standalone action on its own row', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-read')).not.toBeNull());

    // read_all is scope, not CRUD.
    expect(cb('conversations.read_all')).not.toBeNull();
  });

  it('expands a group into its real catalog keys on save', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-write')).not.toBeNull());

    await userEvent.click(cb('group-conversations-write') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());

    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toEqual(
      expect.arrayContaining([
        'conversations.create',
        'conversations.update',
        'conversations.toggle_status',
      ]),
    );
    expect(savedKeys).not.toContain('conversations.read');
    expect(savedKeys).not.toContain('conversations.delete');
  });

  it('shows a partially-granted group as indeterminate and preserves it untouched', async () => {
    rolePermissions = { conversations: ['update'], labels: ['create'] };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-write')).not.toBeNull());

    const group = cb('group-conversations-write') as HTMLElement;
    expect(group).toHaveAttribute('data-indeterminate', 'true');
    expect(group).toHaveAttribute('data-state', 'unchecked');

    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('conversations.update');
    expect(savedKeys).not.toContain('conversations.create');
  });

  it('toggling a fully-granted group off removes every key it stands for', async () => {
    rolePermissions = {
      conversations: ['create', 'update', 'toggle_status', 'mute', 'unmute', 'toggle_priority',
        'custom_attributes', 'toggle_typing_status', 'update_last_seen', 'unread', 'import'],
      labels: ['create'],
    };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-write')).not.toBeNull());
    expect(cb('group-conversations-write')).toHaveAttribute('data-state', 'checked');

    await userEvent.click(cb('group-conversations-write') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());

    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    ['create', 'update', 'toggle_status'].forEach(a =>
      expect(savedKeys).not.toContain(`conversations.${a}`),
    );
  });

  it('hides a dead action and does not revoke a grant the role already holds for it', async () => {
    rolePermissions = { inboxes: ['delete_message_template', 'read'], labels: ['create'] };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-inboxes-read')).not.toBeNull());

    expect(cb('inboxes.delete_message_template')).toBeNull();

    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('inboxes.delete_message_template');
  });

  it('classifies the live inbox template sync as a write, not a read', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-inboxes-write')).not.toBeNull());

    await userEvent.click(cb('group-inboxes-write') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('inboxes.message_templates');
  });
});

describe('RoleDetail — bulk select', () => {
  it('the section checkbox grants every key of every resource in it, nested ones included', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('select-all-crm')).not.toBeNull());

    await userEvent.click(cb('select-all-crm') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());

    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('pipelines.read');
    // pipeline_stages/pipeline_items render inside the pipelines row but are their
    // own resources.
    expect(savedKeys).toContain('pipeline_stages.read');
    expect(savedKeys).toContain('pipeline_stages.create');
    expect(savedKeys).toContain('pipeline_items.update');
    // Another section is untouched.
    expect(savedKeys).not.toContain('conversations.read');
  });

  it('the top checkbox grants everything on screen, and clears it on the second click', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('select-all-everything')).not.toBeNull());

    await userEvent.click(cb('select-all-everything') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());

    const granted = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(granted).toEqual(
      expect.arrayContaining(['conversations.read', 'pipelines.read', 'ai_agents.read']),
    );
    // Never a system key, never a hidden resource.
    expect(granted).not.toContain('ai_agents.secret_sync');
    expect(granted).not.toContain('oauth_applications.read');

    bulkUpdateMock.mockClear();
    await userEvent.click(cb('select-all-everything') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    expect(bulkUpdateMock.mock.calls[0][1]).toEqual([]);
  });

  it('a filtered search narrows what the bulk checkboxes own', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('select-all-everything')).not.toBeNull());

    await userEvent.type(screen.getByPlaceholderText('detail.filterPlaceholder'), 'Pipelines');
    await waitFor(() => expect(cb('group-conversations-read')).toBeNull());

    await userEvent.click(cb('select-all-everything') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());

    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('pipelines.read');
    // Filtered out of view → the bulk toggle must not have touched it.
    expect(savedKeys).not.toContain('conversations.read');
  });
});

describe('RoleDetail — domain grouping, system filter, search, nesting', () => {
  const precedes = (a: Element, b: Element) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('renders resources grouped under domain headers in the curated order (AC1)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-read')).not.toBeNull());

    const attendance = screen.getByText('domains.attendance');
    const crm = screen.getByText('domains.crm');
    const ai = screen.getByText('domains.ai');
    const channels = screen.getByText('domains.channels');
    const admin = screen.getByText('domains.admin');
    const others = screen.getByText('domains.others');

    expect(precedes(attendance, crm)).toBe(true);
    expect(precedes(crm, ai)).toBe(true);
    expect(precedes(ai, channels)).toBe(true);
    expect(precedes(channels, admin)).toBe(true);
    expect(precedes(admin, others)).toBe(true);

    expect(screen.queryByText('domains.contacts')).toBeNull();
    expect(screen.queryByText('domains.automation')).toBeNull();
  });

  it('never renders a hidden resource, in any domain or under "Others"', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-read')).not.toBeNull());

    ['oauth_applications', 'whatsapp_authorizations', 'ai_folders', 'ai_tools'].forEach(resource => {
      expect(cb(`group-${resource}-read`)).toBeNull();
      expect(cb(`resource-${resource}`)).toBeNull();
    });
    expect(screen.queryByText('OAuth Applications')).toBeNull();
    expect(screen.queryByText('AI Folders')).toBeNull();
  });

  it('hiding a resource does not revoke a grant the role already holds', async () => {
    rolePermissions = { oauth_applications: ['read'], labels: ['create'] };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-labels-write')).not.toBeNull());

    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('oauth_applications.read');
  });

  it('re-sends system grants the role already holds instead of stripping them', async () => {
    rolePermissions = { ai_agents: ['read', 'secret_sync'], labels: ['create'] };
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-ai_agents-read')).not.toBeNull());

    expect(cb('ai_agents.secret_sync')).toBeNull();

    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('ai_agents.secret_sync');
    expect(savedKeys).toContain('ai_agents.read');
  });

  it('places a catalog resource outside every domain under "Others" (NFR4/AC2)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-zzz_new_feature-read')).not.toBeNull());
    expect(screen.getByText('domains.others')).toBeTruthy();
    expect(precedes(screen.getByText('domains.admin'), screen.getByText('domains.others'))).toBe(true);
  });

  it('hides system actions and drops a fully-system resource card (AC3)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-ai_agents-read')).not.toBeNull());

    expect(cb('ai_agents.secret_sync')).toBeNull();
    expect(cb('installation_configs.manage')).toBeNull();
    expect(cb('resource-installation_configs')).toBeNull();
    expect(cb('group-installation_configs-write')).toBeNull();
  });

  it('never leaks a system key into the payload via the card select-all (AC3/NFR1)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('resource-ai_agents')).not.toBeNull());

    await userEvent.click(cb('resource-ai_agents') as HTMLElement);
    await userEvent.click(screen.getByText('savePermissions'));
    await waitFor(() => expect(bulkUpdateMock).toHaveBeenCalled());
    const savedKeys = bulkUpdateMock.mock.calls[0][1] as string[];
    expect(savedKeys).toContain('ai_agents.read');
    expect(savedKeys).not.toContain('ai_agents.secret_sync');
  });

  it('filters resources/domains by resource name or group label (AC4)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-conversations-read')).not.toBeNull());

    await userEvent.type(screen.getByPlaceholderText('detail.filterPlaceholder'), 'Pipelines');

    await waitFor(() => expect(cb('group-conversations-read')).toBeNull());
    expect(cb('group-pipelines-read')).not.toBeNull();
    expect(screen.queryByText('domains.attendance')).toBeNull();
    expect(screen.getByText('domains.crm')).toBeTruthy();
  });

  it('nests pipeline_stages and working_hours inside their parent cards (AC6)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-pipelines-read')).not.toBeNull());

    // The nested child renders its own groups, never its own card.
    expect(cb('group-pipeline_stages-read')).not.toBeNull();
    expect(cb('group-working_hours-read')).not.toBeNull();
    expect(cb('resource-pipeline_stages')).toBeNull();
    expect(cb('resource-working_hours')).toBeNull();

    expect(screen.getByText('detail.nested.pipelineStages')).toBeTruthy();
    expect(screen.getByText('detail.nested.workingHours')).toBeTruthy();
  });

  // CRM-178: pipeline_items joined RESOURCE_NESTING. Without a matching
  // NESTED_LABEL_KEYS entry the row renders t(undefined) — checkboxes with no name.
  it('nests pipeline_items under Pipelines WITH a label (CRM-178, AC6)', async () => {
    render(<RoleDetail />);
    await waitFor(() => expect(cb('group-pipelines-read')).not.toBeNull());

    expect(cb('group-pipeline_items-write')).not.toBeNull();
    expect(cb('resource-pipeline_items')).toBeNull();

    expect(screen.getByText('detail.nested.pipelineItems')).toBeTruthy();
  });
});

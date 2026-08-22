// Presentation-only grouping for the role editor. Order mirrors the app's real
// navigation (menuItems.ts). This is NOT the RBAC source of truth — the catalog
// (auth-service ResourceActionsConfig) is. Adding a resource here changes only
// how it is grouped on screen; a resource absent from every domain still renders
// (under "Others"), so the catalog and the screen can never silently diverge.
export interface PermissionDomain {
  key: string;
  labelKey: string; // i18n key under the 'roles' locale
  resources: string[]; // curated order; nested resources stay listed so they are
  // claimed by a domain and never fall to "Others"
}

export const PERMISSION_DOMAINS: PermissionDomain[] = [
  {
    key: 'attendance',
    labelKey: 'domains.attendance',
    resources: ['conversations', 'canned_responses', 'macros', 'labels', 'csat_survey_responses'],
  },
  {
    key: 'contacts',
    labelKey: 'domains.contacts',
    resources: ['contacts', 'custom_attribute_definitions', 'segments', 'custom_filters'],
  },
  {
    key: 'crm',
    labelKey: 'domains.crm',
    resources: ['pipelines', 'pipeline_stages', 'pipeline_items', 'products', 'crm_forms'], // pipeline_stages + pipeline_items nested under pipelines (AC6, CRM-178)
  },
  {
    key: 'automation',
    labelKey: 'domains.automation',
    resources: ['automation_rules', 'journeys', 'campaigns'],
  },
  {
    key: 'ai',
    labelKey: 'domains.ai',
    // ai_tools/ai_folders/ai_mcp_servers stay listed here but do not render today:
    // HIDDEN_RESOURCES keeps them off the editor (see the note there). They remain
    // in the catalog — the core-service and processor still enforce them — so the
    // grouping is kept for when the follow-up settles their fate.
    resources: [
      'ai_agents',
      'ai_tools',
      'ai_folders',
      'ai_mcp_servers',
      'ai_custom_tools',
      'ai_custom_mcp_servers',
      'ai_api_keys',
    ],
  },
  {
    key: 'channels',
    labelKey: 'domains.channels',
    resources: ['inboxes', 'working_hours', 'message_templates', 'chat_pages', 'webhooks', 'agent_bots', 'integrations'], // working_hours nested under inboxes (AC6)
  },
  {
    key: 'admin',
    labelKey: 'domains.admin',
    resources: ['users', 'teams', 'roles', 'accounts', 'access_tokens', 'templates', 'profiles'],
  },
];

// Nested resource -> parent resource. Nested ones render inside the parent card
// (AC6), never as their own card and never under "Others".
export const RESOURCE_NESTING: Record<string, string> = {
  pipeline_stages: 'pipelines',
  pipeline_items: 'pipelines',
  working_hours: 'inboxes',
};

// Resources the role editor must not offer, because there is nothing for an admin
// to grant. They stay in the auth catalog — services still enforce some of them, and
// dropping a key would 403 those routes — but no user administers them here. They are
// hidden from every domain AND from "Others": that fallback exists to surface
// resources nobody has classified yet, not ones we know should not be there.
//
//   oauth_applications  the OAuth Apps screen has never been reachable — its
//                       Integrations card is filtered out by `active? => false`
//                       (hardcoded since the first community release).
//   ai_folders          upstream Evo AI concept. No page, no menu entry, and not one
//                       caller of agentService's folder functions.
//   ai_mcp_servers      the built-in MCP server catalog, which users do not register.
//                       (User-registered ones are ai_custom_mcp_servers.)
//                       /agents/mcp-servers has never been in the menu.
//   ai_clients          upstream multi-tenant leftover. Its one live key gates a
//                       session counter against hard-coded limits, with no caller.
//   ai_tools            the BUILT-IN tool catalog, read-only (despite its catalog
//                       label saying "AI Custom Tools" — the user-created ones are
//                       ai_custom_tools). Of its 8 keys only `available` and
//                       `categories` gate anything, and both serve the agent
//                       editor's ToolsDialog: whoever manages AI agents must be
//                       able to list the built-in tools. That is an implication of
//                       ai_agents, not a checkbox of its own. Hiding revokes
//                       nothing — held grants are still persisted — it only stops
//                       offering a toggle nobody could use correctly.
//   *_authorizations    these name the OAuth handshake, not the thing it creates:
//                       connecting a channel creates an inbox, and /channels/new
//                       already requires inboxes.create. 15 of their 20 keys gate
//                       nothing at all (the controllers define no index/show/
//                       update/destroy action, and no route reaches one).
//
// Removing the keys, the endpoints and the dead screens is a follow-up; this keeps
// them off the editor meanwhile.
export const HIDDEN_RESOURCES = new Set<string>([
  'oauth_applications',
  'ai_folders',
  'ai_mcp_servers',
  'ai_clients',
  'ai_tools',
  'google_authorizations',
  'instagram_authorizations',
  'microsoft_authorizations',
  'twitter_authorizations',
  'whatsapp_authorizations',
]);

// Actions the role editor must not offer, keyed by resource. The key exists in the
// catalog but gates nothing, so a checkbox for it can only mislead.
//
// inboxes: EVO-1716 moved template CRUD out of InboxesController into its own
// `message_templates` resource. Six of the seven inbox template keys went dead with
// it — they survive only as InboxPolicy methods no controller calls, and no route
// reaches them. The seventh, `message_templates`, still gates the per-channel Meta
// sync, so it stays (as a write).
export const HIDDEN_ACTIONS: Record<string, Set<string>> = {
  inboxes: new Set([
    'whatsapp_templates',
    'sync_whatsapp_templates',
    'update_whatsapp_template',
    'delete_whatsapp_template',
    'update_message_template',
    'delete_message_template',
  ]),
};

export function isHiddenAction(resourceKey: string, actionKey: string): boolean {
  return HIDDEN_ACTIONS[resourceKey]?.has(actionKey) ?? false;
}

// One checkbox standing for several catalog keys. The editor renders the group; the
// save payload expands it back into the real keys, so the backend and the catalog
// are untouched.
//
// A resource's actions are far more granular than any decision an admin makes.
// There are three: can you read it, can you write to it, can you delete it. Every
// mutating verb — clone, duplicate, toggle_active, pause/resume/stop, execute,
// recompute, connect/disconnect, sync, test — is a write. Deleting something *inside*
// the resource (a custom attribute, an access token, an avatar) is a write too;
// "delete" means deleting the resource itself.
//
// Collapsing the keys is a backend change. Grouping them here is the part the admin
// sees.
export interface ActionGroup {
  key: 'read' | 'write' | 'delete';
  labelKey: string;
  actions: string[]; // the real catalog keys this checkbox stands for
}

// Reads. Everything else that is not a delete or a standalone is a write.
// NOTE: mirrored on the backend as ResourceActionsConfig::NON_WRITE_ACTIONS —
// keep the two in sync (a read added here must be added there, or the two
// disagree on what a "write" is and a save 403s).
const READ_ACTIONS = new Set([
  'read',
  'meta',
  'search',
  'filter',
  'available_for_pipeline',
  'attachments',
  'transcript',
  'inbox_assistant',
  'active',
  'contactable_inboxes',
  'assignable_agents',
  'agent_bot',
  'stats',
  'types',
  'permissions',
  'check_permission',
  'export',
  // View-only actions on AI/config resources (would otherwise mis-group as write).
  'available',
  'categories',
  'config',
  'access_shared',
  'usage',
  'metrics',
]);

// Keys that are not CRUD at all and keep their own row.
//   conversations.read_all  scope, not reading: see every inbox
//   users.manage            still being defined; left alone on purpose
const STANDALONE_ACTIONS: Record<string, Set<string>> = {
  conversations: new Set(['read_all']),
  // CRM-210: standalone on the backend too, so the coarse `users.write` never
  // implies account takeover and the key stays grantable on its own.
  users: new Set(['manage', 'reset_password']),
  // CRM-70 use-vs-manage: Settings-screen management, own row like users.manage.
  macros: new Set(['manage']),
  message_templates: new Set(['manage']),
  teams: new Set(['manage']),
};

export function isStandaloneAction(resourceKey: string, actionKey: string): boolean {
  return STANDALONE_ACTIONS[resourceKey]?.has(actionKey) ?? false;
}

/** Which group an action belongs to, or null when it renders on its own row. */
export function groupOfAction(resourceKey: string, actionKey: string): ActionGroup['key'] | null {
  if (isHiddenAction(resourceKey, actionKey)) return null;
  if (isStandaloneAction(resourceKey, actionKey)) return null;
  if (actionKey === 'delete') return 'delete';
  return READ_ACTIONS.has(actionKey) ? 'read' : 'write';
}

/**
 * EVO-2127: given the granular keys about to be saved, also emit the coarse
 * `<resource>.write` key the role editor's Write group displays — additively
 * (the granular keys stay) and guarded (only when the catalog declares it, so a
 * backend without `<resource>.write` never triggers a 422).
 *
 * Only WRITE is synthesized. Coarse `read`/`delete` are identical to their
 * granular homonyms (`x.read` / `x.delete`), which are already in `knownKeys`
 * whenever selected — synthesizing them would add nothing and could grant e.g.
 * `x.read` off a sibling read action like `x.search`.
 */
export function expandCoarseKeys(
  knownKeys: string[],
  catalogHas: (resource: string, action: string) => boolean,
): string[] {
  const coarse = new Set<string>();
  for (const key of knownKeys) {
    const [resource, action] = key.split('.');
    if (groupOfAction(resource, action) === 'write' && catalogHas(resource, 'write')) {
      coarse.add(`${resource}.write`);
    }
  }
  return Array.from(new Set([...knownKeys, ...coarse]));
}

const GROUP_ORDER: ActionGroup['key'][] = ['read', 'write', 'delete'];

/** The groups this resource renders, given the actions it actually declares. */
export function groupsFor(resourceKey: string, actionKeys: string[]): ActionGroup[] {
  return GROUP_ORDER.flatMap(key => {
    const actions = actionKeys.filter(a => groupOfAction(resourceKey, a) === key);
    return actions.length > 0
      ? [{ key, labelKey: `detail.actionGroups.${key}`, actions } as ActionGroup]
      : [];
  });
}

/** Actions of this resource that render inside a group, not on their own row. */
export function groupedActionsOf(resourceKey: string, actionKeys: string[]): Set<string> {
  return new Set(actionKeys.filter(a => groupOfAction(resourceKey, a) !== null));
}

export interface DomainGroup {
  key: string;
  labelKey: string;
  resources: string[];
}

const NESTED_RESOURCES = new Set(Object.keys(RESOURCE_NESTING));

/**
 * Group catalog resource keys into curated presentation domains.
 *
 * For each domain (in curated order) it keeps only the resources that are both
 * present in `resourceKeys` and not nested (nested resources render inside their
 * parent card). Any resource that belongs to no domain and is not nested is
 * collected into a trailing `others` group, so a resource newly added to the
 * auth-service catalog never disappears from the screen (NFR4). Empty groups are
 * omitted.
 */
export function groupResourcesByDomain(resourceKeys: string[]): DomainGroup[] {
  // Hidden resources never render, in any group — not even under "Others".
  const visible = resourceKeys.filter(r => !HIDDEN_RESOURCES.has(r));
  const present = new Set(visible);
  const claimed = new Set<string>();
  const groups: DomainGroup[] = [];

  for (const domain of PERMISSION_DOMAINS) {
    const resources = domain.resources.filter(r => {
      if (NESTED_RESOURCES.has(r)) {
        claimed.add(r); // nested resources are owned by their parent, never "Others"
        return false;
      }
      if (!present.has(r)) return false;
      claimed.add(r);
      return true;
    });
    if (resources.length > 0) {
      groups.push({ key: domain.key, labelKey: domain.labelKey, resources });
    }
  }

  const others = visible.filter(r => !claimed.has(r) && !NESTED_RESOURCES.has(r));
  if (others.length > 0) {
    groups.push({ key: 'others', labelKey: 'domains.others', resources: others });
  }

  return groups;
}

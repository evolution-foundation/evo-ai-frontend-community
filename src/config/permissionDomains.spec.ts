import { describe, expect, it } from 'vitest';
import { expandCoarseKeys, groupOfAction, groupsFor, isStandaloneAction } from './permissionDomains';

// EVO-2127: expandCoarseKeys turns the granular keys the editor is about to save
// into the additive, guarded coarse read/write/delete keys the screen shows.
describe('expandCoarseKeys', () => {
  // Backend carries every coarse action (post Task 2).
  const catalogHasAll = () => true;

  it('adds the coarse write and keeps the granular key (AC1/AC2)', () => {
    const out = expandCoarseKeys(['ai_agents.create'], catalogHasAll);
    expect(out).toContain('ai_agents.write'); // coarse emitted
    expect(out).toContain('ai_agents.create'); // granular preserved (additive)
  });

  it('emits a coarse key for each distinct write group, deduped', () => {
    const out = expandCoarseKeys(['ai_agents.create', 'ai_agents.update'], catalogHasAll);
    expect(out.filter(k => k === 'ai_agents.write')).toHaveLength(1);
    expect(out).toEqual(expect.arrayContaining(['ai_agents.create', 'ai_agents.update', 'ai_agents.write']));
  });

  it('does not emit write for a read-only selection (AC5)', () => {
    const out = expandCoarseKeys(['ai_agents.read'], catalogHasAll);
    expect(out).not.toContain('ai_agents.write');
  });

  it('guards on the catalog: omits write when the backend lacks it, no throw (AC7)', () => {
    // Backend without the coarse write (Task 2 not yet deployed).
    const catalogHasNoWrite = (_resource: string, action: string) => action !== 'write';
    const out = expandCoarseKeys(['ai_agents.create'], catalogHasNoWrite);
    expect(out).not.toContain('ai_agents.write');
    expect(out).toContain('ai_agents.create');
  });

  it('does not synthesize a coarse delete (delete has no separate coarse key)', () => {
    const out = expandCoarseKeys(['ai_agents.delete'], catalogHasAll);
    expect(out).toEqual(['ai_agents.delete']); // granular preserved, nothing added
  });

  it('does not synthesize coarse read from a sibling read action like search (L1)', () => {
    // groupOfAction('contacts','search') === 'read', but coarse read == the
    // granular `contacts.read` — synthesizing it would grant a read the user
    // never selected. Only write is synthesized.
    const out = expandCoarseKeys(['contacts.search'], catalogHasAll);
    expect(out).toEqual(['contacts.search']);
  });

  it('ignores standalone actions that belong to no group (e.g. conversations.read_all)', () => {
    const out = expandCoarseKeys(['conversations.read_all'], catalogHasAll);
    // read_all is standalone → groupOfAction returns null → nothing coarse added.
    expect(out).toEqual(['conversations.read_all']);
  });

  it('returns the granular keys unchanged when nothing groups', () => {
    const out = expandCoarseKeys([], catalogHasAll);
    expect(out).toEqual([]);
  });

  it('drives correctly off a real ResourceActionsData-shaped catalog (handleSave guard lambda, L2)', () => {
    // Mirrors the closure RoleDetail#handleSave passes:
    //   (resource, action) => resourceActions.resources[resource]?.actions?.[action] !== undefined
    const catalog = {
      resources: {
        ai_agents: { actions: { create: {}, read: {}, write: {} } },
        // legacy: backend without the coarse write yet (Task 2 not deployed there)
        legacy: { actions: { create: {} } },
      },
    } as unknown as { resources: Record<string, { actions: Record<string, unknown> }> };
    const catalogHas = (resource: string, action: string) =>
      catalog.resources[resource]?.actions?.[action] !== undefined;

    const out = expandCoarseKeys(['ai_agents.create', 'legacy.create'], catalogHas);
    expect(out).toContain('ai_agents.write'); // catalog declares it
    expect(out).not.toContain('legacy.write'); // guard: catalog lacks it → no 422
    expect(out).toEqual(expect.arrayContaining(['ai_agents.create', 'legacy.create']));
  });
});

// CRM-210: STANDALONE_ACTIONS mirrors the backend's STANDALONE_ACTIONS_BY_RESOURCE
// by hand, and this mirror drifted once already — `users.reset_password` was added
// to the catalog as standalone but not here, so the key fell into the coarse write
// group. Ticking Escrita on Users then granted account takeover and unticking it
// revoked the key silently, while granting it ON ITS OWN — the escape hatch the
// deliberately narrow migration relies on for custom roles — became impossible.
describe('standalone keys never fall into a coarse group', () => {
  const catalogHasAll = () => true;
  const USERS_ACTIONS = ['read', 'create', 'update', 'delete', 'manage', 'reset_password'];

  it.each([
    ['users', 'reset_password'],
    ['users', 'manage'],
    ['conversations', 'read_all'],
  ])('%s.%s is standalone and belongs to no group', (resource, action) => {
    expect(isStandaloneAction(resource, action)).toBe(true);
    expect(groupOfAction(resource, action)).toBeNull();
  });

  it('keeps reset_password out of the Users write group', () => {
    const write = groupsFor('users', USERS_ACTIONS).find(g => g.key === 'write');
    expect(write?.actions).toEqual(['create', 'update']);
  });

  // The other direction: holding the standalone key must not synthesize the coarse
  // write, matching ResourceActionsConfig.manageable_write_actions on the backend.
  it('does not synthesize users.write from the standalone key', () => {
    expect(expandCoarseKeys(['users.reset_password'], catalogHasAll)).toEqual([
      'users.reset_password',
    ]);
  });
});

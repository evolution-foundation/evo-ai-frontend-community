import { describe, it, expect } from 'vitest';
import {
  getCustomerMenuItems,
  shouldShowMenuItem,
  type SubMenuItem,
} from './menuItems';

// EVO-2071 AC7: `dashboard.read` is not a catalog resource (it lives in the auth
// BASIC_READ_PERMISSIONS). Gating the menu on it made `can()` deny for everyone,
// hiding the Dashboard from all users. The gate is removed — Dashboard is a
// top-level item, so locate it directly, not via findSubItem.
describe('menuItems — Dashboard orphan gate removed (EVO-2071 AC7)', () => {
  it('exposes Dashboard with no resource/action gate (always visible to authenticated users)', () => {
    const dashboard = getCustomerMenuItems(t).find(i => i.href === '/dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard?.resource).toBeUndefined();
    expect(dashboard?.action).toBeUndefined();
  });
});

// Identity translator: returns the key itself so we can locate items by href.
const t = (key: string) => key;

// Build a `can(resource, action)` from a flat set of "resource.action" keys.
const canFrom = (granted: string[]) => (resource: string, action: string) =>
  granted.includes(`${resource}.${action}`);

const canAnyFrom = (granted: string[]) => (permissions: string[]) =>
  permissions.some(p => granted.includes(p));

const canAllFrom = (granted: string[]) => (permissions: string[]) =>
  permissions.every(p => granted.includes(p));

function findSubItem(href: string): SubMenuItem {
  const items = getCustomerMenuItems(t);
  for (const item of items) {
    const match = item.subItems?.find(sub => sub.href === href);
    if (match) return match;
  }
  throw new Error(`Sub item with href ${href} not found`);
}

describe('menuItems — Settings > Atendentes gating (AC4)', () => {
  it('gates the Atendentes item on users.manage (administrative), not users.read', () => {
    const atendentes = findSubItem('/settings/users');
    expect(atendentes.resource).toBe('users');
    expect(atendentes.action).toBe('manage');
  });

  it('hides Atendentes for a Conversas-only profile with users.read but without users.manage', () => {
    const atendentes = findSubItem('/settings/users');
    const granted = ['users.read', 'conversations.read'];

    const visible = shouldShowMenuItem(
      atendentes,
      canFrom(granted),
      canAnyFrom(granted),
      canAllFrom(granted),
    );

    expect(visible).toBe(false);
  });

  it('shows Atendentes for a profile that has users.manage', () => {
    const atendentes = findSubItem('/settings/users');
    const granted = ['users.read', 'users.manage'];

    const visible = shouldShowMenuItem(
      atendentes,
      canFrom(granted),
      canAnyFrom(granted),
      canAllFrom(granted),
    );

    expect(visible).toBe(true);
  });
});

// EVO-1938: the default agent no longer holds the administrative Settings reads
// (dropped from the auth seed), so the existing `.read` gate hides those items —
// no menu change needed. These lock in that behavior.
describe('menuItems — EVO-1938 admin Settings gating for the default agent', () => {
  // Representative post-fix agent set: operational reads (incl. teams.read for the
  // in-chat assign-team picker), none of the admin Settings resources.
  const agentGranted = [
    'conversations.read',
    'contacts.read',
    'pipelines.read',
    'inboxes.read',
    'users.read',
    'labels.read',
    'canned_responses.read',
    'macros.read',
    'message_templates.read',
    'teams.read',
  ];

  const isVisible = (item: SubMenuItem, granted: string[]) =>
    shouldShowMenuItem(item, canFrom(granted), canAnyFrom(granted), canAllFrom(granted));

  it.each(['/settings/integrations', '/settings/segments'])(
    'hides the admin Settings item %s from the default agent',
    href => {
      expect(isVisible(findSubItem(href), agentGranted)).toBe(false);
    },
  );

  // teams stays visible (teams.read kept for the chat picker); the Teams Settings
  // use-vs-manage split is deferred to EVO-1955, like labels/canned/macros.
  it.each(['/settings/labels', '/settings/canned-responses', '/settings/teams'])(
    'keeps the operational Settings item %s visible to the agent',
    href => {
      expect(isVisible(findSubItem(href), agentGranted)).toBe(true);
    },
  );

  it('gates Procedimentos on procedures.read', () => {
    const procedimentos = findSubItem('/settings/procedures');

    expect(procedimentos.resource).toBe('procedures');
    expect(procedimentos.action).toBe('read');
    expect(isVisible(procedimentos, agentGranted)).toBe(false);
    expect(isVisible(procedimentos, [...agentGranted, 'procedures.read'])).toBe(true);
  });

  it('shows the admin Settings items to an administrator that holds the reads', () => {
    const adminGranted = [...agentGranted, 'integrations.read', 'segments.read'];
    expect(isVisible(findSubItem('/settings/integrations'), adminGranted)).toBe(true);
    expect(isVisible(findSubItem('/settings/segments'), adminGranted)).toBe(true);
  });
});

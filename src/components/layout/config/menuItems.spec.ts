import { describe, it, expect } from 'vitest';
import {
  getCustomerMenuItems,
  shouldShowMenuItem,
  type SubMenuItem,
} from './menuItems';

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

  it('shows the admin Settings items to an administrator that holds the reads', () => {
    const adminGranted = [...agentGranted, 'integrations.read', 'segments.read'];
    expect(isVisible(findSubItem('/settings/integrations'), adminGranted)).toBe(true);
    expect(isVisible(findSubItem('/settings/segments'), adminGranted)).toBe(true);
  });
});

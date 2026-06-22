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

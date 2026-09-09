export const ROLE_KEYS = {
  SUPER_ADMIN: 'super_admin',
  ACCOUNT_OWNER: 'account_owner',
  ADMINISTRATOR: 'administrator',
  AGENT: 'agent',
} as const;

export const ADMIN_ROLE_KEYS = [
  ROLE_KEYS.SUPER_ADMIN,
  ROLE_KEYS.ACCOUNT_OWNER,
  ROLE_KEYS.ADMINISTRATOR,
] as const;

export const ALL_ROLE_KEYS = Object.values(ROLE_KEYS);

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export const isAdminRole = (key: string): boolean =>
  (ADMIN_ROLE_KEYS as readonly string[]).includes(key);

// Roles the Settings > Users panel never hands out (CRM-524): super_admin is
// the installation owner and account_owner is user-global in the auth. Account
// admins come from the enterprise membership roles, not from here.
export const PANEL_NON_ASSIGNABLE_ROLE_KEYS = [
  ROLE_KEYS.SUPER_ADMIN,
  ROLE_KEYS.ACCOUNT_OWNER,
] as const;

export const isPanelAssignableRole = (key: string): boolean =>
  !(PANEL_NON_ASSIGNABLE_ROLE_KEYS as readonly string[]).includes(key);

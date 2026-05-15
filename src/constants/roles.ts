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

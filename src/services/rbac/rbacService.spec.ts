import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/services/core', () => ({
  apiAuth: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { data: {} } }),
    put: vi.fn().mockResolvedValue({ data: { data: {} } }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import { apiAuth } from '@/services/core';
import {
  fetchRoles,
  fetchRoleActions,
  fetchRolePermissions,
  createRole,
  deleteRolePermission,
} from './rbacService';

const mockedGet = apiAuth.get as ReturnType<typeof vi.fn>;
const mockedPost = apiAuth.post as ReturnType<typeof vi.fn>;
const mockedDelete = apiAuth.delete as ReturnType<typeof vi.fn>;

// EVO-1688 regression guard: apiAuth's baseURL already ends in /api/v1, so the
// paths passed here must NOT repeat the prefix — doubled prefixes 404 on the
// auth service (broke the user-creation role dropdown).
describe('rbacService request paths (EVO-1688)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchRoles targets /roles without the /api/v1 prefix', async () => {
    await fetchRoles();
    expect(mockedGet.mock.calls[0][0]).toMatch(/^\/roles\?/);
  });

  it('fetchRoleActions targets /resource_actions without the prefix', async () => {
    await fetchRoleActions();
    expect(mockedGet.mock.calls[0][0]).toMatch(/^\/resource_actions\?/);
  });

  it('fetchRolePermissions targets /role_permissions without the prefix', async () => {
    await fetchRolePermissions();
    expect(mockedGet.mock.calls[0][0]).toMatch(/^\/role_permissions\?/);
  });

  it('write endpoints (create/delete) are also single-prefix', async () => {
    await createRole({ name: 'r' } as never);
    await deleteRolePermission('42');

    expect(mockedPost.mock.calls[0][0]).toBe('/roles');
    expect(mockedDelete.mock.calls[0][0]).toBe('/role_permissions/42');
  });

  it('no rbacService path starts with /api/v1 (doubled prefix)', async () => {
    await fetchRoles();
    await fetchRoleActions();
    await fetchRolePermissions();
    await createRole({ name: 'r' } as never);
    await deleteRolePermission('42');

    const allPaths = [
      ...mockedGet.mock.calls,
      ...mockedPost.mock.calls,
      ...mockedDelete.mock.calls,
    ].map((call) => call[0] as string);

    expect(allPaths.length).toBeGreaterThan(0);
    for (const path of allPaths) {
      expect(path).not.toMatch(/^\/api\/v1\//);
    }
  });
});

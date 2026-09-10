import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/core/apiAuth', () => ({
  default: { get: vi.fn() },
}));

import apiAuth from '@/services/core/apiAuth';
import usersService from './usersService';

const mockedGet = apiAuth.get as unknown as ReturnType<typeof vi.fn>;

const page = (ids: number[], pageNo: number, totalPages: number) => ({
  data: {
    success: true,
    data: ids.map(id => ({ id, name: `User ${id}`, email: `u${id}@example.com` })),
    meta: { pagination: { page: pageNo, page_size: 100, total: 0, total_pages: totalPages } },
  },
});

// CRM-539: the account directory is the single people source. The auth pages
// at 20 by default and caps at 100, so the source asks for full pages and
// walks all of them; the account scope itself is applied by the auth from the
// request context, never by a caller-side filter.
describe('usersService.getAccountUsers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks /users for full pages and walks every page', async () => {
    mockedGet
      .mockResolvedValueOnce(page([1, 2], 1, 3))
      .mockResolvedValueOnce(page([3], 2, 3))
      .mockResolvedValueOnce(page([4], 3, 3));

    const users = await usersService.getAccountUsers();

    expect(users.map(u => u.id)).toEqual([1, 2, 3, 4]);
    expect(mockedGet).toHaveBeenCalledTimes(3);
    expect(mockedGet.mock.calls.map(c => c[0])).toEqual(['/users', '/users', '/users']);
    expect(mockedGet.mock.calls.map(c => c[1].params)).toEqual([
      { page: 1, per_page: 100 },
      { page: 2, per_page: 100 },
      { page: 3, per_page: 100 },
    ]);
  });

  it('forwards sort/order/q and stops after a single page when that is all there is', async () => {
    mockedGet.mockResolvedValueOnce(page([9], 1, 1));

    const users = await usersService.getAccountUsers({ sort: 'name', order: 'asc' });

    expect(users).toHaveLength(1);
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet.mock.calls[0][1].params).toEqual({ sort: 'name', order: 'asc', page: 1, per_page: 100 });
  });

  it('treats a response without pagination meta as a single page', async () => {
    mockedGet.mockResolvedValueOnce({ data: { success: true, data: [{ id: 1 }] } });

    const users = await usersService.getAccountUsers();

    expect(users).toHaveLength(1);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('never sends a tenant filter itself — scoping belongs to the request context', async () => {
    mockedGet.mockResolvedValueOnce(page([1], 1, 1));

    await usersService.getAccountUsers();

    const [, config] = mockedGet.mock.calls[0];
    expect(config.headers).toBeUndefined();
    expect(Object.keys(config.params)).not.toContain('tenant_id');
  });
});

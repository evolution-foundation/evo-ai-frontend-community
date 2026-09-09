import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAccessToken, activeAccountHeaders } from './accessTokensService';

const post = vi.fn();

vi.mock('@/services/core/apiAuth', () => ({
  default: { post: (...args: unknown[]) => post(...args) },
}));

const created = { data: { data: { access_token: { id: 't-1', token: 'secret' } } } };

// The auth learns the account to bind the token to only from this header.
describe('createAccessToken', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue(created);
    localStorage.clear();
  });

  it('sends the active account the host persisted', async () => {
    localStorage.setItem('evo_active_tenant_id', 'acc-1');

    await createAccessToken({ name: 'CI', scopes: 'contacts.read' } as never);

    expect(post).toHaveBeenCalledWith(
      '/access_tokens',
      { access_token: { name: 'CI', scopes: 'contacts.read' } },
      { headers: { 'X-Evo-Tenant-Id': 'acc-1' } },
    );
  });

  it('sends no account header on a standalone install', async () => {
    await createAccessToken({ name: 'CI', scopes: 'contacts.read' } as never);

    expect(post).toHaveBeenCalledWith('/access_tokens', expect.anything(), { headers: {} });
  });

  it('never throws when storage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(activeAccountHeaders()).toEqual({});
    getItem.mockRestore();
  });
});

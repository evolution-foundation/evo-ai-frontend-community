import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAccessToken, activeAccountHeaders, regenerateAccessToken } from './accessTokensService';

const post = vi.fn();
const patch = vi.fn();

vi.mock('@/services/core/apiAuth', () => ({
  default: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
  },
}));

const created = { data: { data: { access_token: { id: 't-1', token: 'secret' } } } };

// CRM-561: the auth binds a new token to the account it was minted in, and it
// learns that account only from this header. Without it an agency owner's token
// resolves to no account and every CRM call answers 401.
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

// The auth wraps the token as data.access_token; the screen reads the token off
// what this returns, so returning the wrapper crashed it.
describe('regenerateAccessToken', () => {
  it('returns the regenerated token itself', async () => {
    patch.mockResolvedValue({
      data: { success: true, data: { access_token: { id: 't-1', name: 'CI', token: 'new-value' } } },
    });

    const regenerated = await regenerateAccessToken('t-1');

    expect(patch).toHaveBeenCalledWith('/access_tokens/t-1/update_token');
    expect(regenerated).toEqual({ id: 't-1', name: 'CI', token: 'new-value' });
  });
});

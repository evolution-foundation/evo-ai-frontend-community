import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateToken } from './authService';
import { useAuthStore } from '@/store/authStore';

const post = vi.fn();

vi.mock('@/services/core/apiAuth', () => ({
  default: { post: (...args: unknown[]) => post(...args) },
}));

vi.mock('@/services/tours/tourService', () => ({
  tourService: { completeTour: vi.fn(), resetTour: vi.fn() },
}));

const validateResponse = { data: { data: { user: { id: 'u-1' } } } };

// Embedded in the shell, this store's copy of the token is filled once, at module
// load — which happens before the host logs in. Deciding "do I need a refresh?"
// from that copy asked for a new token while a valid one sat in localStorage, and
// the refresh writes back into the key the host reads too.
describe('validateToken', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue(validateResponse);
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, impersonation: null });
  });

  it('does not refresh when the token lives only in localStorage', async () => {
    localStorage.setItem('access_token', 'issued-by-the-host');

    await validateToken();

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/validate');
  });

  it('still refreshes when there is no token anywhere', async () => {
    post.mockResolvedValueOnce({ data: { data: { access_token: 'fresh' } } });

    await validateToken();

    expect(post).toHaveBeenNthCalledWith(1, '/auth/refresh');
    expect(post).toHaveBeenNthCalledWith(2, '/auth/validate');
  });
});

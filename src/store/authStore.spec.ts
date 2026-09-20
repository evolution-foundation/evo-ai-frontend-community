import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';
import type { UserResponse } from '@/types/auth';

vi.mock('@/services/tours/tourService', () => ({
  tourService: { completeTour: vi.fn(), resetTour: vi.fn() },
}));

// The header is signed per request, and the store's copy of the token is only as
// fresh as the last login THIS app ran. Embedded in the shell it runs none: the
// host logs in and writes localStorage, so a copy captured at module load keeps
// signing requests with a token the next login already revoked (403 on every
// tenant-scoped read until a full reload).
const admin = { id: 'u-1', name: 'Admin' } as unknown as UserResponse;
const impersonated = { id: 'u-2', name: 'Client' } as unknown as UserResponse;

describe('authStore.getAuthHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, currentUser: null, impersonation: null });
  });

  it('signs with the stored token when this store still holds an older one', () => {
    useAuthStore.setState({ accessToken: 'revoked-by-the-previous-logout' });
    localStorage.setItem('access_token', 'issued-by-the-new-login');

    expect(useAuthStore.getState().getAuthHeader()).toEqual({
      Authorization: 'Bearer issued-by-the-new-login',
    });
  });

  it('keeps the impersonated token, which lives only in memory', () => {
    useAuthStore.setState({ currentUser: admin, accessToken: 'admin-token' });
    localStorage.setItem('access_token', 'admin-token');

    useAuthStore.getState().startImpersonation(impersonated, 'impersonated-token', 'Acme');

    expect(useAuthStore.getState().getAuthHeader()).toEqual({
      Authorization: 'Bearer impersonated-token',
    });
  });

  it('falls back to the store when nothing is persisted', () => {
    useAuthStore.setState({ accessToken: 'in-memory-only' });

    expect(useAuthStore.getState().getAuthHeader()).toEqual({
      Authorization: 'Bearer in-memory-only',
    });
  });

  it('signs nothing when there is no token at all', () => {
    expect(useAuthStore.getState().getAuthHeader()).toBeUndefined();
  });
});

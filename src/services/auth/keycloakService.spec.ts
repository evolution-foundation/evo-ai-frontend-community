import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isKeycloakEnabled,
  buildKeycloakAuthUrl,
  exchangeKeycloakCode,
} from './keycloakService';
import apiAuth from '@/services/core/apiAuth';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/services/core/apiAuth', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      setAccessToken: vi.fn(),
    })),
  },
}));

describe('keycloakService', () => {
  const mockSetItem = vi.fn();
  const mockGetItem = vi.fn();
  const mockRemoveItem = vi.fn();
  const mockSetAccessToken = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('sessionStorage', {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: mockRemoveItem,
    });
    vi.mocked(useAuthStore.getState).mockReturnValue({
      setAccessToken: mockSetAccessToken,
    } as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isKeycloakEnabled', () => {
    it('returns false when Keycloak is not configured', () => {
      expect(isKeycloakEnabled()).toBe(false);
    });
  });

  describe('buildKeycloakAuthUrl', () => {
    it('throws error when Keycloak is not configured', async () => {
      await expect(buildKeycloakAuthUrl('http://localhost/callback')).rejects.toThrow(
        'Keycloak is not configured (VITE_KEYCLOAK_ISSUER / VITE_KEYCLOAK_CLIENT_ID)'
      );
    });
  });

  describe('exchangeKeycloakCode', () => {
    it('throws error when code verifier is missing from sessionStorage', async () => {
      mockGetItem.mockReturnValue(null);

      await expect(
        exchangeKeycloakCode('auth-code', 'http://localhost/callback')
      ).rejects.toThrow('Missing PKCE code verifier — session may have expired');
    });

    it('exchanges code successfully, sets token and cleans up verifier', async () => {
      mockGetItem.mockReturnValue('verifier-123');
      const mockUser = { id: '1', email: 'test@test.com', name: 'Test User' };
      vi.mocked(apiAuth.post).mockResolvedValue({
        data: {
          data: {
            user: mockUser,
            token: { access_token: 'token-123' },
          },
        },
      } as any);

      const result = await exchangeKeycloakCode('auth-code', 'http://localhost/callback');

      expect(apiAuth.post).toHaveBeenCalledWith('/auth/keycloak_exchange', {
        code: 'auth-code',
        code_verifier: 'verifier-123',
        redirect_uri: 'http://localhost/callback',
      });
      expect(mockSetAccessToken).toHaveBeenCalledWith('token-123');
      expect(mockRemoveItem).toHaveBeenCalledWith('_kc_cv');
      expect(result.user).toEqual(mockUser);
    });

    it('does not remove code verifier on exchange error to allow retry', async () => {
      mockGetItem.mockReturnValue('verifier-123');
      vi.mocked(apiAuth.post).mockRejectedValue(new Error('Network error'));

      await expect(
        exchangeKeycloakCode('auth-code', 'http://localhost/callback')
      ).rejects.toThrow('Network error');

      expect(mockRemoveItem).not.toHaveBeenCalled();
    });

    it('handles response with token at data.access_token path', async () => {
      mockGetItem.mockReturnValue('verifier-123');
      const mockUser = { id: '1', email: 'test@test.com' };
      vi.mocked(apiAuth.post).mockResolvedValue({
        data: {
          data: {
            user: mockUser,
          },
          access_token: 'token-from-root',
        },
      } as any);

      await exchangeKeycloakCode('auth-code', 'http://localhost/callback');

      expect(mockSetAccessToken).toHaveBeenCalledWith('token-from-root');
    });
  });
});

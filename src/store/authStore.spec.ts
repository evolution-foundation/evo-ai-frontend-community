import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      currentUser: null,
      accessToken: null,
      isLoggedIn: false,
      isLoading: true,
      isFetching: false,
      impersonation: null,
      tours: {},
    });
  });

  describe('setAccessToken', () => {
    it('stores token in localStorage when setting', () => {
      useAuthStore.getState().setAccessToken('keycloak-token-123');

      expect(localStorage.getItem('access_token')).toBe('keycloak-token-123');
      expect(useAuthStore.getState().accessToken).toBe('keycloak-token-123');
    });

    it('removes token from localStorage when setting to null', () => {
      localStorage.setItem('access_token', 'existing-token');
      useAuthStore.getState().setAccessToken(null);

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('updates localStorage when token changes', () => {
      useAuthStore.getState().setAccessToken('token-1');
      expect(localStorage.getItem('access_token')).toBe('token-1');

      useAuthStore.getState().setAccessToken('token-2');
      expect(localStorage.getItem('access_token')).toBe('token-2');
    });
  });

  describe('getAuthHeader', () => {
    it('returns Bearer token when accessToken is set in state', () => {
      useAuthStore.getState().setAccessToken('keycloak-token-123');

      const header = useAuthStore.getState().getAuthHeader();

      expect(header).toEqual({ Authorization: 'Bearer keycloak-token-123' });
    });

    it('returns Bearer token from localStorage when state token is null', () => {
      localStorage.setItem('access_token', 'stored-token');
      useAuthStore.setState({ accessToken: null });

      const header = useAuthStore.getState().getAuthHeader();

      expect(header).toEqual({ Authorization: 'Bearer stored-token' });
    });

    it('returns undefined when no token exists', () => {
      useAuthStore.setState({ accessToken: null });
      localStorage.removeItem('access_token');

      const header = useAuthStore.getState().getAuthHeader();

      expect(header).toBeUndefined();
    });
  });

  describe('clearUser', () => {
    it('clears all user data and token', () => {
      useAuthStore.setState({
        currentUser: { id: '1', email: 'test@test.com', ui_settings: {} } as any,
        accessToken: 'token-123',
        isLoggedIn: true,
      });
      localStorage.setItem('access_token', 'token-123');

      useAuthStore.getState().clearUser();

      expect(useAuthStore.getState().currentUser).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isLoggedIn).toBe(false);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('Keycloak integration flow', () => {
    it('sets token after successful Keycloak exchange simulation', () => {
      const mockKeycloakToken = 'keycloak-jwt-token-xyz';
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
        ui_settings: {},
      };

      // Simulate the flow: set token then user
      useAuthStore.getState().setAccessToken(mockKeycloakToken);
      useAuthStore.getState().setUser(mockUser as any);

      expect(useAuthStore.getState().accessToken).toBe(mockKeycloakToken);
      expect(useAuthStore.getState().currentUser).toEqual(mockUser);
      expect(useAuthStore.getState().isLoggedIn).toBe(true);
      expect(useAuthStore.getState().getAuthHeader()).toEqual({
        Authorization: `Bearer ${mockKeycloakToken}`,
      });
    });

    it('handles logout after Keycloak login', () => {
      // Setup logged in state
      useAuthStore.getState().setAccessToken('keycloak-token');
      useAuthStore.getState().setUser({ id: '1', email: 'user@test.com', ui_settings: {} } as any);

      // Logout
      useAuthStore.getState().clearUser();

      expect(useAuthStore.getState().isLoggedIn).toBe(false);
      expect(useAuthStore.getState().getAuthHeader()).toBeUndefined();
    });
  });

  describe('updateUISettings', () => {
    it('updates user UI settings when user is logged in', () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        ui_settings: { theme: 'light', language: 'en' },
      };
      useAuthStore.setState({ currentUser: mockUser as any, isLoggedIn: true });

      useAuthStore.getState().updateUISettings({ theme: 'dark' });

      expect(useAuthStore.getState().currentUser?.ui_settings).toEqual({
        theme: 'dark',
        language: 'en',
      });
    });

    it('does nothing when no user is logged in', () => {
      useAuthStore.getState().updateUISettings({ theme: 'dark' });

      expect(useAuthStore.getState().currentUser).toBeNull();
    });
  });

  describe('setUser', () => {
    it('sets isLoggedIn to true when user has id', () => {
      useAuthStore.getState().setUser({ id: '123', email: 'test@test.com', ui_settings: {} } as any);

      expect(useAuthStore.getState().isLoggedIn).toBe(true);
      expect(useAuthStore.getState().currentUser?.id).toBe('123');
    });

    it('sets isLoggedIn to false when user is null', () => {
      useAuthStore.getState().setUser(null);

      expect(useAuthStore.getState().isLoggedIn).toBe(false);
      expect(useAuthStore.getState().currentUser).toBeNull();
    });

    it('sets isLoggedIn to false when user has no id', () => {
      useAuthStore.getState().setUser({ email: 'test@test.com', ui_settings: {} } as any);

      expect(useAuthStore.getState().isLoggedIn).toBe(false);
    });
  });
});

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { UserResponse } from '@/types/auth';
import { useAuthStore } from '@/store/authStore';
import { normalizeAvatarUrl } from '@/utils/avatarUrl';
import { useAppDataStore } from '@/store/appDataStore';
import { getReconnectService } from '@/services/core';
import { verifyMfa, logout as authServiceLogout } from '@/services/auth/authService';
import { profileService } from '@/services/profile/profileService';
import { markBootstrapPhaseEnd, markBootstrapPhaseStart } from '@/utils/requestMonitor';

interface MfaState {
  required: boolean;
  method: 'totp' | 'email';
  tempToken: string;
  email: string;
}

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaState: MfaState | null;
  login: (
    userData: UserResponse,
    loginData: { access_token?: string },
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  verifyMfaCode: (code: string) => Promise<void>;
  clearMfaState: () => void;
  setMfaRequired: (data: MfaState) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    currentUser: user,
    isLoading,
    isLoggedIn: isAuthenticated,
    setUser,
    setLoading,
    clearUser,
    validityCheck,
  } = useAuthStore();

  // MFA state
  const [mfaState, setMfaState] = React.useState<MfaState | null>(null);

  const validityCheckCalled = React.useRef(false);

  useEffect(() => {
    const isWidgetPublicRoute =
      window.location.pathname === '/widget' ||
      window.location.pathname.startsWith('/survey/responses/');
    if (isWidgetPublicRoute) {
      validityCheckCalled.current = true;
      setLoading(false);
      return;
    }

    if (validityCheckCalled.current) return;

    const checkAuth = async () => {
      validityCheckCalled.current = true;
      markBootstrapPhaseStart('auth-validity-check');

      try {
        await validityCheck();
        markBootstrapPhaseEnd('auth-validity-check', { status: 'ok' });
        getReconnectService();
      } catch (validationError) {
        markBootstrapPhaseEnd('auth-validity-check', { status: 'error' });
        const apiError = validationError as { response?: { status?: number } };
        if (apiError?.response?.status === 401) {
          clearUser();
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic token validation (every 5 minutes)
  useEffect(() => {
    const isWidgetPublicRoute =
      window.location.pathname === '/widget' ||
      window.location.pathname.startsWith('/survey/responses/');
    if (isWidgetPublicRoute) return;
    if (!isAuthenticated || !user) return;

    const interval = setInterval(async () => {
      await validityCheck();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const login = async (userData: UserResponse, _loginData: { access_token?: string }) => {
    try {
      setUser(userData);
    } catch (error) {
      clearUser();
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authServiceLogout();
    } catch (error) {
      console.error('Error during logout service call:', error);
    }

    clearUser();
    useAppDataStore.getState().clearAppData();
    setMfaState(null);
  };

  const verifyMfaCode = async (code: string) => {
    if (!mfaState) {
      throw new Error('No MFA session active');
    }

    try {
      setLoading(true);
      const { response } = await verifyMfa({
        email: mfaState.email,
        code,
        tempToken: mfaState.tempToken,
      });

      const userData = response.data.user;
      setUser(userData);

      // Initialize app data after MFA
      await useAppDataStore.getState().initializeAppData();

      setMfaState(null);
    } catch (error) {
      console.error('Erro na verificação MFA:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearMfaState = () => {
    setMfaState(null);
  };

  const setMfaRequired = (data: MfaState) => {
    setMfaState(data);
  };

  const refreshUser = async () => {
    try {
      const profileData = await profileService.getProfile();

      if (profileData?.user) {
        const currentUserData = user || {} as UserResponse;
        const updatedUser: UserResponse = {
          ...currentUserData,
          ...profileData.user,
          avatar_url: normalizeAvatarUrl(profileData.user.avatar_url) || currentUserData.avatar_url,
        };

        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    mfaState,
    login,
    logout,
    refreshUser,
    verifyMfaCode,
    clearMfaState,
    setMfaRequired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

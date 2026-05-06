import { create } from 'zustand';
import { UserResponse, UISettings, UserTour } from '@/types/auth';
import { validateToken } from '@/services/auth/authService';
import { tourService } from '@/services/tours/tourService';
import { useAppDataStore } from './appDataStore';
import { normalizeAvatarUrl } from '@/utils/avatarUrl';

interface ImpersonationData {
  adminUser: UserResponse;
  adminToken: string;
  impersonatedClient: string;
}

interface AuthState {
  // User data
  currentUser: UserResponse | null;
  isLoggedIn: boolean;

  // Token data
  accessToken: string | null;

  impersonation: ImpersonationData | null;

  // UI flags
  isLoading: boolean;
  isFetching: boolean;

  // Tours
  tours: Record<string, 'completed' | 'skipped'>;

  // Actions
  setUser: (user: UserResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setAccessToken: (token: string | null) => void;
  clearUser: () => void;
  validityCheck: () => Promise<void>;
  updateUISettings: (settings: Partial<UISettings>) => void;
  updateAvailability: (availability: 'online' | 'offline' | 'busy') => void;
  getAuthHeader: () => { Authorization: string } | undefined;

  // Tour actions
  setTours: (tours: UserTour[]) => void;
  markTourCompleted: (tourKey: string) => void;
  markTourSkipped: (tourKey: string) => void;
  resetTour: (tourKey: string) => void;

  // Impersonation actions
  startImpersonation: (impersonatedUser: UserResponse, impersonatedToken: string, clientName: string) => void;
  exitImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const checkIsLoggedIn = (user: UserResponse | null): boolean => {
    return !!user?.id;
  };

  return {
    currentUser: null,
    accessToken: localStorage.getItem('access_token'),
    isLoggedIn: false,
    isLoading: true,
    isFetching: false,
    impersonation: null,
    tours: {},

    setUser: user => {
      const isLoggedIn = checkIsLoggedIn(user);
      set({
        currentUser: user,
        isLoggedIn: isLoggedIn,
      });
    },

    setLoading: loading => set({ isLoading: loading }),

    setAccessToken: (token) => {
      set({ accessToken: token });
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    },

    getAuthHeader: () => {
      const token = get().accessToken || localStorage.getItem('access_token');
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
      return undefined;
    },

    clearUser: () => {
      localStorage.removeItem('access_token');
      set({
        currentUser: null,
        accessToken: null,
        isLoggedIn: false,
      });
    },

    validityCheck: async () => {
      set({ isFetching: true });
      try {
        const userData = await validateToken();

        if (!userData) {
          set({ isFetching: false });
          return;
        }

        const isLoggedIn = checkIsLoggedIn(userData);
        set({
          currentUser: {
            ...userData,
            avatar_url: normalizeAvatarUrl(userData.avatar_url) || userData.avatar_url,
          },
          isLoggedIn: isLoggedIn,
          isFetching: false,
        });

        // Initialize app data after successful validation
        try {
          await useAppDataStore.getState().initializeAppData();
        } catch (error) {
          console.error('Failed to initialize app data after validity check:', error);
        }
      } catch (error: unknown) {
        const apiError = error as { response?: { status?: number } };
        if (apiError?.response?.status === 401) {
          get().clearUser();
        }
        set({ isFetching: false });
      }
    },

    updateUISettings: settings => {
      const currentUser = get().currentUser;
      if (!currentUser) return;

      const updatedUser = {
        ...currentUser,
        ui_settings: {
          ...currentUser.ui_settings,
          ...settings,
        },
      };

      set({ currentUser: updatedUser });
    },

    updateAvailability: (availability) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;

      set({ currentUser: { ...currentUser, availability } });
    },

    startImpersonation: (impersonatedUser, impersonatedToken, clientName) => {
      const currentState = get();

      if (currentState.currentUser && currentState.accessToken) {
        set({
          impersonation: {
            adminUser: currentState.currentUser,
            adminToken: currentState.accessToken,
            impersonatedClient: clientName,
          },
          currentUser: impersonatedUser,
          accessToken: impersonatedToken,
        });
      }
    },

    setTours: (tours) => {
      const toursMap = Object.fromEntries(
        tours.map(t => [t.tour_key, t.status ?? 'completed'])
      ) as Record<string, 'completed' | 'skipped'>;
      set({ tours: toursMap });
    },

    markTourCompleted: (tourKey) => {
      set(state => ({ tours: { ...state.tours, [tourKey]: 'completed' as const } }));
      tourService.completeTour(tourKey, 'completed').catch(err => {
        console.error('Failed to persist tour completion:', err);
      });
    },

    markTourSkipped: (tourKey) => {
      set(state => ({ tours: { ...state.tours, [tourKey]: 'skipped' as const } }));
      tourService.completeTour(tourKey, 'skipped').catch(err => {
        console.error('Failed to persist tour skip:', err);
      });
    },

    resetTour: (tourKey) => {
      set(state => {
        const { [tourKey]: _, ...rest } = state.tours;
        return { tours: rest };
      });
      tourService.resetTour(tourKey).catch(err => {
        console.error('Failed to reset tour:', err);
      });
    },

    exitImpersonation: () => {
      const impersonationData = get().impersonation;

      if (impersonationData) {
        set({
          currentUser: impersonationData.adminUser,
          accessToken: impersonationData.adminToken,
          impersonation: null,
        });
      }
    },
  };
});

import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import KeycloakCallback from './KeycloakCallback';
import * as keycloakService from '@/services/auth/keycloakService';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/services/auth/keycloakService');
vi.mock('@/contexts/AuthContext');
vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: {
    getState: vi.fn(() => ({
      initializeAppData: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      accessToken: 'test-token',
      isLoggedIn: true,
      currentUser: { id: '1' },
    })),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('KeycloakCallback', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ login: mockLogin } as any);
    vi.stubGlobal('console', {
      log: vi.fn(),
      error: vi.fn(),
    });
  });

  it('shows loading state while processing', () => {
    vi.mocked(keycloakService.exchangeKeycloakCode).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <MemoryRouter initialEntries={['/keycloak/callback?code=valid-code']}>
        <Routes>
          <Route path="/keycloak/callback" element={<KeycloakCallback />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Autenticando con Keycloak...')).toBeInTheDocument();
  });

  it('shows error when no code param is present', async () => {
    render(
      <MemoryRouter initialEntries={['/keycloak/callback']}>
        <Routes>
          <Route path="/keycloak/callback" element={<KeycloakCallback />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error de autenticación')).toBeInTheDocument();
    });
    expect(
      screen.getByText('No se recibió un código de autorización de Keycloak')
    ).toBeInTheDocument();
  });

  it('shows error when Keycloak returns error param', async () => {
    render(
      <MemoryRouter
        initialEntries={['/keycloak/callback?error=access_denied&error_description=User+denied+access']}
      >
        <Routes>
          <Route path="/keycloak/callback" element={<KeycloakCallback />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error de autenticación')).toBeInTheDocument();
    });
    expect(screen.getByText('User denied access')).toBeInTheDocument();
  });

  it('completes login flow and navigates to home on success', async () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      name: 'Test User',
      ui_settings: {},
    };
    vi.mocked(keycloakService.exchangeKeycloakCode).mockResolvedValue({
      user: mockUser,
    });
    vi.mocked(mockLogin).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/keycloak/callback?code=valid-code']}>
        <Routes>
          <Route path="/keycloak/callback" element={<KeycloakCallback />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(keycloakService.exchangeKeycloakCode).toHaveBeenCalledWith(
        'valid-code',
        expect.stringContaining('/keycloak/callback')
      );
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(mockUser, {});
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows error message when exchange fails', async () => {
    vi.mocked(keycloakService.exchangeKeycloakCode).mockRejectedValue(
      new Error('Invalid authorization code')
    );

    render(
      <MemoryRouter initialEntries={['/keycloak/callback?code=invalid-code']}>
        <Routes>
          <Route path="/keycloak/callback" element={<KeycloakCallback />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error de autenticación')).toBeInTheDocument();
    });
    expect(screen.getByText('Invalid authorization code')).toBeInTheDocument();
    expect(screen.getByText('Volver al login')).toBeInTheDocument();
  });

  it('prevents duplicate processing with guard flag', async () => {
    const mockUser = { id: '1', email: 'test@test.com', ui_settings: {} };
    let resolveExchange: (value: { user: typeof mockUser }) => void;
    const exchangePromise = new Promise<{ user: typeof mockUser }>((resolve) => {
      resolveExchange = resolve;
    });

    vi.mocked(keycloakService.exchangeKeycloakCode).mockReturnValue(exchangePromise);
    vi.mocked(mockLogin).mockResolvedValue(undefined);

    const { rerender } = render(
      <MemoryRouter initialEntries={['/keycloak/callback?code=valid-code']}>
        <Routes>
          <Route path="/keycloak/callback" element={<KeycloakCallback />} />
        </Routes>
      </MemoryRouter>
    );

    // Force re-render to simulate React Strict Mode
    rerender(
      <MemoryRouter initialEntries={['/keycloak/callback?code=valid-code']}>
        <Routes>
          <Route path="/keycloak/callback" element={<KeycloakCallback />} />
        </Routes>
      </MemoryRouter>
    );

    // Resolve the exchange
    resolveExchange!({ user: mockUser });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    // Should only be called once due to guard
    expect(keycloakService.exchangeKeycloakCode).toHaveBeenCalledTimes(1);
  });
});

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { exchangeKeycloakCode } from '@/services/auth/keycloakService';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDataStore } from '@/store/appDataStore';
import { useAuthStore } from '@/store/authStore';

const KeycloakCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const isProcessing = React.useRef(false);

  useEffect(() => {
    // Prevent double execution (React Strict Mode or re-renders)
    if (isProcessing.current) {
      console.log('[KeycloakCallback] Already processing, skipping');
      return;
    }

    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(params.get('error_description') || errorParam);
      return;
    }

    if (!code) {
      setError('No se recibió un código de autorización de Keycloak');
      return;
    }

    // Mark as processing to prevent duplicate exchange
    isProcessing.current = true;
    console.log('[KeycloakCallback] Starting exchange for code:', code.substring(0, 10) + '...');

    const redirectUri = `${window.location.origin}/keycloak/callback`;

    exchangeKeycloakCode(code, redirectUri)
      .then(async ({ user }) => {
        console.log('[KeycloakCallback] exchange success, user:', user?.id, user?.email);
        console.log('[KeycloakCallback] token before login:', useAuthStore.getState().accessToken?.substring(0, 20) + '...');

        await authLogin(user, {});
        console.log('[KeycloakCallback] after authLogin, isLoggedIn:', useAuthStore.getState().isLoggedIn, 'user:', useAuthStore.getState().currentUser?.id);

        // Refresh user data from backend to get updated roles
        try {
          await refreshUser();
          console.log('[KeycloakCallback] refreshUser success');
        } catch (e) {
          console.error('[KeycloakCallback] refreshUser failed:', e);
        }

        try {
          await useAppDataStore.getState().initializeAppData();
          console.log('[KeycloakCallback] initializeAppData success');
        } catch (e) {
          console.error('[KeycloakCallback] initializeAppData failed:', e);
        }

        console.log('[KeycloakCallback] before navigate, isLoggedIn:', useAuthStore.getState().isLoggedIn);
        navigate('/', { replace: true });
      })
      .catch((err: Error) => {
        console.error('[KeycloakCallback] exchange failed:', err);
        setError(err.message || 'Error de autenticación');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm p-6">
          <p className="text-destructive font-semibold text-lg">Error de autenticación</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a href="/login" className="text-primary underline text-sm">
            Volver al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Autenticando con Keycloak...</p>
      </div>
    </div>
  );
};

export default KeycloakCallback;

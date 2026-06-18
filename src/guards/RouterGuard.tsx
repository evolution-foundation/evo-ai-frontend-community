import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { markBootstrapPhaseEnd, markBootstrapPhaseStart } from '@/utils/requestMonitor';

interface RouterGuardProps {
  children: React.ReactNode;
}

const SPECIAL_ROUTES = {
  PUBLIC_ROUTES: ['/auth', '/login', '/register', '/widget', '/setup', '/keycloak/callback'],
  // Routes that bypass the "redirect authenticated users to /conversations" rule
  AUTH_EXEMPT_ROUTES: ['/setup/onboarding', '/keycloak/callback'],
};

const RouterGuard: React.FC<RouterGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading } = useAuthStore();
  const { user, isAuthenticated, logout } = useAuth();
  const { isReady: permissionsReady } = usePermissions();
  const { setupRequired, setupLoading } = useGlobalConfig();

  useEffect(() => {
    const handleSetupRequired = async () => {
      if (isAuthenticated) {
        await logout();
      }
      navigate('/login', { replace: true });
    };

    window.addEventListener('setup:required', handleSetupRequired);
    return () => window.removeEventListener('setup:required', handleSetupRequired);
  }, [isAuthenticated, logout, navigate]);

  useEffect(() => {
    // Wait for setup status to be resolved before making routing decisions
    if (setupLoading) return;

    markBootstrapPhaseStart('router-guard');

    const checkAuth = async () => {
      // If setup is required, redirect to /setup (unless already there)
      if (setupRequired && location.pathname !== '/setup') {
        navigate('/setup', { replace: true });
        return;
      }

      // If setup is NOT required but user is on /setup, redirect appropriately
      if (!setupRequired && location.pathname === '/setup') {
        navigate(isAuthenticated ? '/conversations' : '/login', { replace: true });
        return;
      }

      // Skip auth check for public routes
      const isPublicRoute = SPECIAL_ROUTES.PUBLIC_ROUTES.some(route =>
        location.pathname.startsWith(route)
      );

      if (isPublicRoute) {
        // If user is already authenticated and trying to access auth pages, redirect
        // EXCEPT when there are OAuth parameters (oauth_url or return_to) or accessing widget
        // IMPORTANT: Only redirect if user is fully loaded to avoid loops
        const isAuthExemptRoute = SPECIAL_ROUTES.AUTH_EXEMPT_ROUTES.some(route =>
          location.pathname.startsWith(route)
        );

        if (isAuthenticated && user && location.pathname !== '/widget' && !isLoading && !isAuthExemptRoute) {
          const urlParams = new URLSearchParams(location.search);
          const hasOAuthParams = urlParams.has('oauth_url') || urlParams.has('return_to');

          const isAuthConfirmationRoute = location.pathname.startsWith('/auth/confirmation');

          if (!hasOAuthParams && !isAuthConfirmationRoute) {
            const defaultRoute = '/conversations';
            if (location.pathname !== defaultRoute) {
              navigate(defaultRoute, { replace: true });
            }
          }
        }
        return;
      }

      // For protected routes, validate authentication
      if (!isLoading) {
        if (!isAuthenticated || !user) {
          navigate('/login', {
            state: { from: location },
            replace: true,
          });
          return;
        }

        if (!permissionsReady) {
          markBootstrapPhaseEnd('router-guard', { stage: 'waiting_permissions', path: location.pathname });
          return;
        }

      }
    };

    checkAuth();
    if (!isLoading && (!isAuthenticated || permissionsReady)) {
      markBootstrapPhaseEnd('router-guard', {
        stage: 'ready',
        path: location.pathname,
        authenticated: isAuthenticated,
      });
    }
  }, [location, isAuthenticated, user, isLoading, permissionsReady, navigate, setupRequired, setupLoading]);

  // Show loading spinner while setup status is being checked
  if (setupLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading spinner while checking auth or loading permissions
  const isCurrentPathPublic = SPECIAL_ROUTES.PUBLIC_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  if (isLoading || (!isCurrentPathPublic && isAuthenticated && !permissionsReady)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RouterGuard;

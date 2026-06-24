import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PublicRouteProps {
  children: ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Redirect /auth without OAuth params to /login
  if (location.pathname === '/auth') {
    const urlParams = new URLSearchParams(location.search);
    const hasOAuthParams = urlParams.has('oauth_url') || urlParams.has('return_to');

    if (!hasOAuthParams) {
      // Preserve any error params when redirecting to login
      const errorParam = urlParams.get('error');
      const loginUrl = errorParam ? `/login?error=${errorParam}` : '/login';
      return <Navigate to={loginUrl} replace />;
    }
  }

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Redirecionar para página inicial se já estiver autenticado
  // EXCEPT when there are OAuth parameters, specific OAuth routes, widget route, or survey route
  if (isAuthenticated) {
    // Widget, Survey and the anonymous public pages (lead-capture form /f/:slug
    // and chat /chat/:slug) should always be accessible regardless of auth status
    if (
      location.pathname === '/widget' ||
      location.pathname.startsWith('/survey/responses/') ||
      location.pathname.startsWith('/f/') ||
      location.pathname.startsWith('/chat/')
    ) {
      return <>{children}</>;
    }

    const urlParams = new URLSearchParams(location.search);
    const hasOAuthParams = urlParams.has('oauth_url') || urlParams.has('return_to');
    const hasOAuthAuthorizeParams = urlParams.has('client_id') && urlParams.has('redirect_uri');
    const isOAuthCallbackRoute = location.pathname.startsWith('/oauth/');
    const isAuthConfirmationRoute = location.pathname.startsWith('/auth/');
    const isInstagramCallback = location.pathname === '/instagram/callback';
    const isGoogleCallback = location.pathname === '/google/callback';
    const isGoogleCalendarCallback = location.pathname === '/google-calendar/callback';
    const isGoogleSheetsCallback = location.pathname === '/google-sheets/callback';
    const isGitHubCallback = location.pathname === '/github/callback';
    const isNotionCallback = location.pathname === '/notion/callback';
    const isStripeCallback = location.pathname === '/stripe/callback';
    const isLinearCallback = location.pathname === '/linear/callback';
    const isMondayCallback = location.pathname === '/monday/callback';
    const isAtlassianCallback = location.pathname === '/atlassian/callback';
    const isAsanaCallback = location.pathname === '/asana/callback';
    const isHubSpotCallback = location.pathname === '/hubspot/callback';
    const isPayPalCallback = location.pathname === '/paypal/callback';
    const isCanvaCallback = location.pathname === '/canva/callback';
    const isSupabaseCallback = location.pathname === '/supabase/callback';
    const isMicrosoftCallback = location.pathname === '/microsoft/callback';
    const isKeycloakCallback = location.pathname === '/keycloak/callback';

    // Allow access if there are OAuth params or specific OAuth routes
    const shouldAllowAccess =
      hasOAuthParams ||
      (isOAuthCallbackRoute && hasOAuthAuthorizeParams) ||
      isAuthConfirmationRoute ||
      isInstagramCallback ||
      isGoogleCallback ||
      isGoogleCalendarCallback ||
      isGoogleSheetsCallback ||
      isGitHubCallback ||
      isNotionCallback ||
      isStripeCallback ||
      isLinearCallback ||
      isMondayCallback ||
      isAtlassianCallback ||
      isAsanaCallback ||
      isHubSpotCallback ||
      isPayPalCallback ||
      isCanvaCallback ||
      isSupabaseCallback ||
      isMicrosoftCallback ||
      isKeycloakCallback;

    if (!shouldAllowAccess) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default PublicRoute;

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDataStore } from '@/store/appDataStore';
import { useAuthStore } from '@/store/authStore';
import { tourService } from '@/services/tours/tourService';
import { useUnreadConversationsStore } from '@/store/unreadConversationsStore';
import i18n from '@/i18n/config';
import LoadingScreen from '@/components/LoadingScreen';
interface AppInitializerProps {
  children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { t } = useLanguage('common');
  const { user, isLoading } = useAuth();
  const { account, initializeAppDataDeferred } = useAppDataStore();
  const setTours = useAuthStore(state => state.setTours);

  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [pathname, setPathname] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '',
  );

  const getDeferredOptionsForPath = (pathname: string) => {
    if (pathname.startsWith('/conversations')) {
      return { inboxes: true, agents: false, labels: false, teams: false };
    }
    if (pathname.startsWith('/settings/users')) {
      return { inboxes: false, agents: true, labels: false, teams: false };
    }
    if (pathname.startsWith('/settings/teams')) {
      return { inboxes: false, agents: false, labels: false, teams: true };
    }
    if (pathname.startsWith('/settings/labels')) {
      return { inboxes: false, agents: false, labels: true, teams: false };
    }
    if (pathname.startsWith('/channels')) {
      return { inboxes: true, agents: false, labels: false, teams: false };
    }
    return null;
  };

  useEffect(() => {
    const initializeApp = async () => {
      if (isLoading) return;

      try {
        if (!user) {
          setIsInitialized(true);
          return;
        }

        // Skip if already initialized to prevent loops
        if (isInitialized) return;

        // Set language based on account locale
        if (account?.locale) {
          const locale = account.locale;
          let i18nLocale = locale;
          if (locale === 'pt' || locale === 'pt_BR') {
            i18nLocale = 'pt-BR';
          } else if (locale === 'es' || locale.startsWith('es_')) {
            i18nLocale = 'es';
          } else if (locale === 'en' || locale.startsWith('en_')) {
            i18nLocale = 'en';
          }

          if (i18n.language !== i18nLocale) {
            await i18n.changeLanguage(i18nLocale);
            localStorage.setItem('i18nextLng', i18nLocale);
          }
        }

        // ⚡ OTIMIZAÇÃO: Removido carregamento antecipado de dados
        // Antes: carregava agents, inboxes, labels, teams mesmo sem precisar
        // Agora: cada página carrega apenas o que precisa, quando precisa
        // O cache de 15min garante que não haja requisições duplicadas

        setIsInitialized(true);
        setInitError(null);
      } catch (error) {
        console.error('App initialization failed:', error);
        setInitError(t('base.appInitializer.errorMessage'));
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [isLoading, user, isInitialized, t]);

  // Fetch user tours whenever the logged-in user changes. Keyed on user?.id
  // so that logout → Ctrl+F5 → login re-populates `tours` in the store
  // (the main initializeApp effect short-circuits on subsequent logins once
  // `isInitialized` is set, so tour loading has to live outside of it).
  useEffect(() => {
    if (!user?.id) return;
    tourService
      .getTours()
      .then(setTours)
      .catch(() => {
        // Non-critical: tours default to empty (all tours will show)
      });
  }, [user?.id, setTours]);

  useEffect(() => {
    if (!user?.id) {
      useUnreadConversationsStore.getState().reset();
      return;
    }
    useUnreadConversationsStore.getState().fetch();
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRouteChange = () => setPathname(window.location.pathname);

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !user) return;

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : pathname;
    const deferredOptions = getDeferredOptionsForPath(currentPath);
    if (!deferredOptions) return;

    initializeAppDataDeferred(deferredOptions).catch(error => {
      console.warn('Deferred route data initialization failed:', error);
    });
  }, [
    isLoading,
    user,
    pathname,
    initializeAppDataDeferred,
  ]);

  useEffect(() => {
    if (user?.ui_settings) applyUISettings(user.ui_settings as Record<string, unknown>);
  }, [user?.ui_settings]);

  const applyUISettings = (settings: Record<string, unknown>) => {
    const rtl = (settings as { rtl_view?: boolean })?.rtl_view;
    if (rtl) {
      document.documentElement.dir = 'rtl';
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.classList.remove('rtl');
    }

    const sidebarCollapsed = (settings as { sidebar_collapsed?: boolean })?.sidebar_collapsed;
    if (sidebarCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  };

  if (!isInitialized) {
    return (
      <LoadingScreen fullScreen showLogo />
    );
  }

  if (initError) {
    return (
      <LoadingScreen fullScreen showLogo />
    );
  }

  return <>{children}</>;
};

export default AppInitializer;

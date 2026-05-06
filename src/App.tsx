import { useEffect } from 'react';
import AppRouter from './routes';
import { AuthProvider } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/ThemeContext';
import ImpersonationBar from './components/ImpersonationBar';
import AppInitializer from './components/AppInitializer';
import { GlobalConfigProvider } from './contexts/GlobalConfigContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { UISettingsApplier } from './components/UISettingsApplier';
import { unlockAudioContext } from '@/utils/audioNotificationUtils';

import { Toaster } from '@evoapi/design-system';

import { useIsDarkClass } from '@/hooks/chat/useIsDarkClass';

// Componente wrapper para o Toaster que usa o contexto de tema
function ThemedToaster() {
  const isDark = useIsDarkClass();

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={2000}
      theme={isDark ? 'dark' : 'light'}
    />
  );
}

function App() {
  useEffect(() => {
    // Try to unlock the AudioContext on the widest possible range of user
    // interactions so notification sounds work even if the user never clicked
    // or typed before switching tabs (the original EVO-977 scenario).
    const gestureEvents: Array<keyof WindowEventMap> = [
      'click',
      'keydown',
      'pointerdown',
      'touchstart',
    ];
    const unlock = () => unlockAudioContext();
    // `once: true` removes the listener automatically after first fire,
    // so no manual cleanup is needed for these.
    gestureEvents.forEach(evt => window.addEventListener(evt, unlock, { once: true }));

    // visibilitychange does not count as a user gesture, but when the tab
    // becomes visible again the browser usually allows resume() — try it.
    const onVisibility = () => {
      if (!document.hidden) unlockAudioContext();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <AuthProvider>
      <DarkModeProvider>
        <GlobalConfigProvider>
          <UISettingsApplier />
          <PermissionsProvider>
          <NotificationsProvider>
            <AppInitializer>
              <ImpersonationBar />
              <AppRouter />
              <ThemedToaster />
            </AppInitializer>
          </NotificationsProvider>
          </PermissionsProvider>
        </GlobalConfigProvider>
      </DarkModeProvider>
    </AuthProvider>
  );
}

export default App;

import { useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

// BrowserRouter has no data-router blocker. Guard its navigation methods for
// sidebar links, useNavigate and in-app history buttons without changing the
// application's router. Native document exits remain covered by beforeunload.
export function useUnsavedNavigationGuard(dirty: boolean) {
  const context = useContext(UNSAFE_NavigationContext);
  useEffect(() => {
    if (!dirty || !context) return;
    const navigator = context.navigator;
    const { push, replace, go } = navigator;
    const allowed = () =>
      window.confirm('Há alterações não salvas na automação AMH. Sair e descartar a edição?');
    navigator.push = (...args) => {
      if (allowed()) push.apply(navigator, args);
    };
    navigator.replace = (...args) => {
      if (allowed()) replace.apply(navigator, args);
    };
    navigator.go = (...args) => {
      if (allowed()) go.apply(navigator, args);
    };
    return () => {
      navigator.push = push;
      navigator.replace = replace;
      navigator.go = go;
    };
  }, [dirty, context]);
}

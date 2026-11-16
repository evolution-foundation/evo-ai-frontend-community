import { createRoot } from 'react-dom/client';
import "@evoapi/design-system/styles";
// React Flow CSS imported here so it is processed BEFORE globals.css and
// our theming overrides in globals.css can win the cascade (EVO-1270).
import '@xyflow/react/dist/style.css';
import './styles/globals.css';
import './i18n/config'; // Importar configuração do i18n

import { initTheme } from './utils/themeUtils';
import { initGA4 } from './utils/ga4Utils';

// Inicialização do tema antes do React montar
initTheme();

// Reset is a separate entry tree: no authenticated providers, plugins or analytics.
const isReset = window.location.pathname.replace(/\/$/, '') === '/auth/reset-password';
const root = createRoot(document.getElementById('root')!);
if (isReset) {
  void import('./components/auth/ResetPasswordEntry').then(({ default: ResetPasswordEntry }) => root.render(<ResetPasswordEntry />));
} else {
  initGA4();
  void import('./App').then(({ default: App }) => root.render(<App />));
}

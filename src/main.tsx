import { createRoot } from 'react-dom/client';
import "@evoapi/design-system/styles";
// React Flow CSS imported here so it is processed BEFORE globals.css and
// our theming overrides in globals.css can win the cascade (EVO-1270).
import '@xyflow/react/dist/style.css';
import './styles/globals.css';
import './i18n/config'; // Importar configuração do i18n
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { initTheme } from './utils/themeUtils';
import { initGA4 } from './utils/ga4Utils';

// Inicialização do tema antes do React montar
initTheme();

// Inicialização do Google Analytics 4
initGA4();

// Recuperação automática de chunk "stale": após um rebuild do frontend o
// navegador pode ter o index.html antigo em cache apontando para chunks que
// não existem mais. A falha do React.lazy derruba a árvore inteira (tela
// branca); aqui recarregamos a página para buscar o bundle novo (máx. 1x/30s).
const DYNAMIC_IMPORT_ERROR =
  /dynamically imported module|Importing a module script failed|Loading chunk/i;

function handleDynamicImportFailure(): boolean {
  const now = Date.now();
  const last = Number(sessionStorage.getItem('evo:chunk-reload') || 0);
  if (now - last <= 30000) return false;
  sessionStorage.setItem('evo:chunk-reload', String(now));
  window.location.reload();
  return true;
}

window.addEventListener('error', (event) => {
  const msg = typeof event.message === 'string' ? event.message : '';
  if (DYNAMIC_IMPORT_ERROR.test(msg)) {
    event.preventDefault();
    handleDynamicImportFailure();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg =
    reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : String(reason);
  if (DYNAMIC_IMPORT_ERROR.test(msg)) {
    event.preventDefault();
    handleDynamicImportFailure();
  }
});

// ⚡ OTIMIZAÇÃO: StrictMode removido para evitar duplicação de requests
// Em desenvolvimento, StrictMode executa useEffect 2x para detectar problemas
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

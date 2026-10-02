import api from '@/services/core/api';

// Token que as ferramentas de dashboard (Painel Tráfego, Setup Marketing etc.
// — HTML/JS em MenuConfig, renderizado num iframe sandbox sem
// allow-same-origin) usam pra autenticar chamadas a /api/v1/... — buscado
// aqui (autenticado pela sessão real) e repassado ao iframe via postMessage
// pelo ContentViewer, em vez de ficar hardcoded no HTML servido ao navegador.
export async function getDashboardToolsToken(): Promise<string | null> {
  const response = await api.get('/dashboard_tools/token');
  return response.data?.data?.token ?? null;
}

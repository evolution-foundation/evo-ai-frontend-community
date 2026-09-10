/**
 * Sincronização servidor-side das configurações de menu (Editor, Sites e
 * Dashboard). Fonte de verdade: backend (menu_configs — config GLOBAL,
 * compartilhada por todos os usuários da instalação, ver MenuConfig no
 * backend). O localStorage é só um cache local para a UI renderizar sem
 * esperar a rede; toda vez que o servidor responde, ele SEMPRE sobrescreve
 * o cache local, mesmo vazio — não existe mais "dado só local" que sobrevive
 * sem nunca ter sido persistido (era exatamente o bug: menus criados só
 * ficavam no localStorage e se perdiam se o navegador/perfil trocasse).
 */
import { toast } from 'sonner';
import api from '@/services/core/api';
import { EDITOR_MENUS_EVENT } from '@/utils/editorMenus';
import { DASHBOARD_ITEMS_EVENT } from '@/utils/dashboardMenu';
import { SITE_MENU_ITEMS_EVENT } from '@/utils/siteMenuItems';

export type MenuScope = 'editor-menus' | 'dashboard-menu-items' | 'site-menu-items';

const SCOPES: MenuScope[] = ['editor-menus', 'dashboard-menu-items', 'site-menu-items'];

const SCOPE_STORAGE: Record<MenuScope, string> = {
  'editor-menus': 'evo-editor-menus',
  'dashboard-menu-items': 'dashboard-menu-items',
  'site-menu-items': 'evo-site-menu-items',
};

function dispatchEvents(): void {
  window.dispatchEvent(new CustomEvent(EDITOR_MENUS_EVENT));
  window.dispatchEvent(new CustomEvent(DASHBOARD_ITEMS_EVENT));
  window.dispatchEvent(new CustomEvent(SITE_MENU_ITEMS_EVENT));
}

/**
 * Busca os 3 scopes do backend e grava no localStorage o que vier — SEMPRE,
 * mesmo lista vazia, porque o servidor é a fonte de verdade global agora.
 * Se a chamada falhar (offline, não autenticado ainda), mantém o cache local
 * como fallback só para essa sessão, sem apagar nada.
 */
export async function pullMenuConfigs(): Promise<void> {
  for (const scope of SCOPES) {
    try {
      const res = await api.get(`/menu_configs/${scope}`);
      const payload = res?.data?.data?.payload;
      const value = Array.isArray(payload) ? payload : payload?.items ?? [];
      localStorage.setItem(SCOPE_STORAGE[scope], JSON.stringify(value));
    } catch {
      // Offline ou não autenticado ainda — mantém o que já está no cache local.
    }
  }
  dispatchEvents();
}

/**
 * Envia um scope para o servidor e espera confirmar — quem chama pode
 * aguardar o resultado (ex.: desabilitar um botão de salvar até terminar).
 * Se falhar, avisa via toast: salvar deixou de ser "silenciosamente
 * esperançoso" (antes: debounce que podia nunca completar e o erro sumia).
 */
export async function pushMenuConfig(scope: MenuScope, value: unknown): Promise<boolean> {
  try {
    await api.put(`/menu_configs/${scope}`, { payload: { items: value } });
    return true;
  } catch {
    toast.error('Não foi possível salvar esse menu no servidor. Tente novamente.');
    return false;
  }
}

/**
 * Itens personalizados do submenu Dashboard (mesmo padrão do submenu Sites,
 * mas com conteúdo rico como no Editor: ícone escolhível e tipo de conteúdo
 * link/HTML/arquivo). O item fixo "Atendimentos" continua vindo de
 * menuItems.ts; os itens aqui são adicionados antes/depois dele.
 */
import { FileText, Code, Link2, LucideIcon, CheckSquare } from 'lucide-react';
import { SubMenuItem } from '@/components/layout/config/menuItems';
import { EditorContentType, EDITOR_ICON_REGISTRY, generateEditorId } from '@/utils/editorMenus';
import { pushMenuConfig } from '@/utils/menuSync';

export interface DashboardItem {
  id: string;
  title: string;
  contentType: EditorContentType;
  /** contentType === 'link' */
  url?: string;
  /** contentType === 'html' */
  html?: string;
  /** contentType === 'file' */
  fileName?: string;
  fileData?: string;
  /** Nome do ícone lucide (EDITOR_ICON_REGISTRY) */
  icon?: string;
  /** Imagem enviada pelo usuário (dataURL) — tem prioridade sobre o ícone lucide */
  iconUrl?: string;
  /** Antes/depois do item fixo "Atendimentos" */
  position: 'before' | 'after';
}

export const DASHBOARD_ITEMS_EVENT = 'dashboard-items-changed';
export const DASHBOARD_CONTENT_ROUTE = '/dashboard/content';
export const DASHBOARD_DEFAULT_HREF = '/dashboard';

// Item fixo "Tarefas" (kanban de pipelines com suporte a cards de tarefa,
// estilo Asana) — sempre presente ao lado de "Atendimentos", não editável
// pelo formulário de itens personalizados (mesmo tratamento do item padrão).
const TAREFAS_SUB_ITEM: SubMenuItem = {
  name: 'Tarefas',
  href: '/pipelines/default',
  icon: CheckSquare,
};

const STORAGE_KEY = 'dashboard-menu-items';

export function emptyDashboardItem(): DashboardItem {
  return {
    id: generateEditorId(),
    title: '',
    contentType: 'link',
    url: '',
    html: '',
    fileName: '',
    fileData: '',
    position: 'after',
  };
}

function isDashboardItem(raw: unknown): raw is DashboardItem {
  if (!raw || typeof raw !== 'object') return false;
  const n = raw as Partial<DashboardItem>;
  return (
    typeof n.id === 'string' &&
    typeof n.title === 'string' &&
    (n.contentType === 'link' || n.contentType === 'html' || n.contentType === 'file') &&
    (n.position === 'before' || n.position === 'after')
  );
}

export function getDashboardItems(): DashboardItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDashboardItem);
  } catch {
    return [];
  }
}

export function saveDashboardItems(items: DashboardItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(DASHBOARD_ITEMS_EVENT));
  pushMenuConfig('dashboard-menu-items', items);
}

export function findDashboardItem(id: string): DashboardItem | null {
  return getDashboardItems().find((i) => i.id === id) ?? null;
}

const iconForType = (type: EditorContentType): LucideIcon =>
  type === 'link' ? Link2 : type === 'html' ? Code : FileText;

function lucideForItem(item: DashboardItem): LucideIcon {
  return (item.icon && EDITOR_ICON_REGISTRY[item.icon]) || iconForType(item.contentType);
}

function itemToSubItem(item: DashboardItem): SubMenuItem {
  return {
    name: item.title.trim() || '(sem título)',
    href: `${DASHBOARD_CONTENT_ROUTE}/${item.id}`,
    icon: lucideForItem(item),
    ...(item.iconUrl ? { iconUrl: item.iconUrl } : {}),
  };
}

/** Monta a lista final de subitens do Dashboard: itens "before" + item fixo + itens "after". */
export function buildDashboardSubItems(defaultSubItem: SubMenuItem): SubMenuItem[] {
  const items = getDashboardItems();
  const before = items.filter((i) => i.position === 'before').map(itemToSubItem);
  const after = items.filter((i) => i.position === 'after').map(itemToSubItem);
  return [...before, defaultSubItem, TAREFAS_SUB_ITEM, ...after];
}

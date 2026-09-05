/**
 * Itens personalizados do submenu Sites — mesma engine do Editor (ícone,
 * conteúdo link/HTML/arquivo, submenus em camadas ilimitadas via `children`),
 * mas sempre dentro do grupo Sites (sem escolher posição/âncora). O site
 * padrão (azuliapp) continua vindo de `siteLinks.ts`, com seu próprio
 * mecanismo simples de override — não é afetado por este módulo.
 */
import { FileText, Code, Link2, LucideIcon } from 'lucide-react';
import { SubMenuItem } from '@/components/layout/config/menuItems';
import {
  EditorContentType,
  EditorNode,
  EDITOR_ICON_REGISTRY,
  generateEditorId,
  sanitizeNodes,
} from '@/utils/editorMenus';
import { DEFAULT_SITE_SLUG, getSiteLinks, saveSiteLinks } from '@/utils/siteLinks';
import { pushMenuConfig } from '@/utils/menuSync';

export const SITE_MENU_ITEMS_EVENT = 'site-menu-items-changed';
export const SITE_CONTENT_ROUTE = '/sites/content';

const STORAGE_KEY = 'evo-site-menu-items';
const MIGRATION_FLAG_KEY = 'evo-site-menu-items-migrated';

/**
 * Links customizados antigos (criados antes da unificação com o Editor) só
 * tinham nome + URL. Roda uma vez: converte cada um num EditorNode do tipo
 * link e remove do storage antigo (mantendo lá só o override do site padrão).
 */
function migrateLegacySiteLinks(): EditorNode[] {
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return [];
  localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  const legacy = getSiteLinks().filter((l) => l.id !== DEFAULT_SITE_SLUG);
  if (legacy.length === 0) return [];
  saveSiteLinks(getSiteLinks().filter((l) => l.id === DEFAULT_SITE_SLUG));
  return legacy.map((l) => ({
    id: generateEditorId(),
    title: l.name,
    contentType: 'link' as const,
    url: l.url,
  }));
}

export function getSiteMenuItems(): EditorNode[] {
  let stored: EditorNode[];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    stored = raw ? sanitizeNodes(JSON.parse(raw)) : [];
  } catch {
    stored = [];
  }
  const migrated = migrateLegacySiteLinks();
  if (migrated.length > 0) {
    const merged = [...stored, ...migrated];
    saveSiteMenuItems(merged);
    return merged;
  }
  return stored;
}

export function saveSiteMenuItems(items: EditorNode[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(SITE_MENU_ITEMS_EVENT));
  pushMenuConfig('site-menu-items', items);
}

export function upsertSiteMenuItem(node: EditorNode): void {
  const items = getSiteMenuItems();
  const idx = items.findIndex((i) => i.id === node.id);
  if (idx >= 0) items[idx] = node;
  else items.push(node);
  saveSiteMenuItems(items);
}

export function deleteSiteMenuItem(id: string): void {
  saveSiteMenuItems(getSiteMenuItems().filter((i) => i.id !== id));
}

/** Busca recursiva de um nó pelo id (para a página de visualização). */
export function findSiteMenuItem(id: string): EditorNode | null {
  const stack = [...getSiteMenuItems()];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.id === id) return current;
    if (current.children) stack.push(...current.children);
  }
  return null;
}

const iconForType = (type: EditorContentType): LucideIcon =>
  type === 'link' ? Link2 : type === 'html' ? Code : FileText;

function nodeToSubItem(n: EditorNode): SubMenuItem {
  return {
    name: n.title.trim() || '(sem título)',
    href: `${SITE_CONTENT_ROUTE}/${n.id}`,
    icon: (n.icon && EDITOR_ICON_REGISTRY[n.icon]) || iconForType(n.contentType),
    ...(n.iconUrl ? { iconUrl: n.iconUrl } : {}),
    ...(n.children && n.children.length > 0 ? { children: n.children.map(nodeToSubItem) } : {}),
  };
}

export function siteMenuItemsToSubItems(): SubMenuItem[] {
  return getSiteMenuItems().map(nodeToSubItem);
}

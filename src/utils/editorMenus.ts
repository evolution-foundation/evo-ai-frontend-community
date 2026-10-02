/**
 * Menus personalizados criados na aba Editor (/editor/menu).
 * Cada menu é injetado na navegação principal antes/depois de um item
 * âncora escolhido pelo usuário e pode conter submenus em camadas
 * ilimitadas. As folhas têm conteúdo do tipo link, HTML ou arquivo.
 */
import { pushMenuConfig } from '@/utils/menuSync';
import {
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  Code,
  Cog,
  Contact,
  CreditCard,
  FileText,
  Filter,
  Gift,
  Globe,
  Heart,
  Home,
  Image,
  Key,
  Layers,
  LayoutTemplate,
  Link2,
  List,
  LucideIcon,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Music,
  Package,
  PenTool,
  Phone,
  PieChart,
  Route,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  SquareKanban,
  Star,
  Tags,
  Target,
  TestTube,
  Truck,
  User,
  Users2,
  Video,
  Wallet,
  Wand,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';
import { getCustomerMenuItems, MenuItem, SubMenuItem } from '@/components/layout/config/menuItems';

export type EditorContentType = 'link' | 'html' | 'file';

/** Ícones lucide disponíveis no seletor do Editor (nome → componente). */
export const EDITOR_ICON_REGISTRY: Record<string, LucideIcon> = {
  PieChart, MessageSquare, Contact, SquareKanban, Package, Wallet, Wrench,
  LayoutTemplate, Building2, Workflow, Route, Megaphone, Bot, Cog, Settings,
  User, Users2, Tags, Code, Filter, MessageCircle, FileText, Key, Shield,
  ShieldCheck, List, Wand, TestTube, Layers, Star, Heart, Home, ShoppingCart,
  Globe, Calendar, BarChart3, Zap, Target, Gift, Phone, Mail, Image, Video,
  Music, BookOpen, Briefcase, CreditCard, Truck,
};

/** Lista ordenada de opções do seletor (nome legível + ícone). */
export const EDITOR_ICON_OPTIONS: Array<{ name: string; icon: LucideIcon }> = Object.entries(
  EDITOR_ICON_REGISTRY,
).map(([name, icon]) => ({ name, icon }));

export interface EditorNode {
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
  /** Submenu (camadas ilimitadas) */
  children?: EditorNode[];
}

export interface EditorMenu {
  id: string;
  name: string;
  placement: 'before' | 'after';
  anchorName: string;
  items: EditorNode[];
  icon?: string;
  iconUrl?: string;
  /** Guarda conteúdo pra ser referenciado por link direto (ex.: um submenu
   * nativo apontando pra /editor/content/:id) sem também virar sua própria
   * entrada solta na sidebar. */
  hidden?: boolean;
}

export const EDITOR_MENUS_EVENT = 'editor-menus-changed';
export const EDITOR_MENU_ROUTE = '/editor/menu';
export const EDITOR_CONTENT_ROUTE = '/editor/content';

const STORAGE_KEY = 'evo-editor-menus';

export function generateEditorId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyEditorNode(): EditorNode {
  return {
    id: generateEditorId(),
    title: '',
    contentType: 'link',
    url: '',
    html: '',
    fileName: '',
    fileData: '',
  };
}

function isEditorNode(raw: unknown): raw is EditorNode {
  if (!raw || typeof raw !== 'object') return false;
  const n = raw as Partial<EditorNode>;
  return (
    typeof n.id === 'string' &&
    typeof n.title === 'string' &&
    (n.contentType === 'link' || n.contentType === 'html' || n.contentType === 'file')
  );
}

export function sanitizeNodes(nodes: unknown): EditorNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.filter(isEditorNode).map((n) => ({
    ...n,
    children: sanitizeNodes(n.children),
  }));
}

export function getEditorMenus(): EditorMenu[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is EditorMenu =>
          !!m &&
          typeof m.id === 'string' &&
          typeof m.name === 'string' &&
          (m.placement === 'before' || m.placement === 'after') &&
          typeof m.anchorName === 'string',
      )
      .map((m) => ({ ...m, items: sanitizeNodes(m.items) }));
  } catch {
    return [];
  }
}

export function saveEditorMenus(menus: EditorMenu[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
  window.dispatchEvent(new CustomEvent(EDITOR_MENUS_EVENT));
  pushMenuConfig('editor-menus', menus);
}

export function upsertEditorMenu(menu: EditorMenu): void {
  const menus = getEditorMenus();
  const idx = menus.findIndex((m) => m.id === menu.id);
  if (idx >= 0) menus[idx] = menu;
  else menus.push(menu);
  saveEditorMenus(menus);
}

export function deleteEditorMenu(id: string): void {
  saveEditorMenus(getEditorMenus().filter((m) => m.id !== id));
}

/**
 * Nomes dos itens nativos da sidebar — opções de âncora do combobox de posição.
 * Precisa da função de tradução real: vários itens (Dashboard, Conversas, etc.)
 * usam t('menu.customer.*') em vez de rótulo literal, e o valor salvo aqui é
 * comparado depois contra os nomes já traduzidos da sidebar (injectEditorMenus).
 * Passar uma função identidade faz esses itens guardarem a chave i18n crua,
 * que nunca casa com o nome renderizado — a âncora "antes/depois" fica muda.
 */
export function getCustomerAnchorNames(t: (key: string) => string): string[] {
  return getCustomerMenuItems(t).map((i) => i.name);
}

/** Normaliza a URL informada (adiciona https:// se faltar esquema). */
export function normalizeEditorUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Busca recursiva de um nó pelo id (para a página de visualização). */
export function findEditorNode(nodeId: string): { node: EditorNode; menu: EditorMenu } | null {
  for (const menu of getEditorMenus()) {
    const stack = [...menu.items];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current.id === nodeId) return { node: current, menu };
      if (current.children) stack.push(...current.children);
    }
  }
  return null;
}

const iconFor = (type: EditorContentType) =>
  type === 'link' ? Link2 : type === 'html' ? Code : FileText;

const lucideFor = (n: { icon?: string; contentType: EditorContentType }): LucideIcon =>
  (n.icon && EDITOR_ICON_REGISTRY[n.icon]) || iconFor(n.contentType);

function nodeToSubItem(n: EditorNode): SubMenuItem {
  return {
    name: n.title.trim() || '(sem título)',
    href: `${EDITOR_CONTENT_ROUTE}/${n.id}`,
    icon: lucideFor(n),
    ...(n.iconUrl ? { iconUrl: n.iconUrl } : {}),
    ...(n.children && n.children.length > 0 ? { children: n.children.map(nodeToSubItem) } : {}),
  };
}

export function editorMenuToMenuItem(m: EditorMenu): MenuItem {
  return {
    id: `editor-menu-${m.id}`,
    name: m.name,
    // '#' = clicar apenas abre/fecha o painel do submenu (não navega).
    // Navegar para /editor/menu aqui fazia o painel abrir na aba Editor
    // estática, e todo clique acabava de volta no construtor.
    href: '#',
    icon: (m.icon && EDITOR_ICON_REGISTRY[m.icon]) || PenTool,
    ...(m.iconUrl ? { iconUrl: m.iconUrl } : {}),
    subItems: m.items.map(nodeToSubItem),
  };
}

/**
 * Injeta os menus personalizados na lista da sidebar, respeitando a posição
 * (antes/depois do item âncora). Âncora pode ser um item nativo ou outro
 * menu personalizado já injetado. Sem âncora válida, vai para o fim.
 */
export function injectEditorMenus(items: MenuItem[]): MenuItem[] {
  const result = [...items];
  for (const menu of getEditorMenus()) {
    if (menu.hidden) continue;
    const built = editorMenuToMenuItem(menu);
    const anchorIdx = result.findIndex(
      (i) => i.name.trim().toLowerCase() === menu.anchorName.trim().toLowerCase(),
    );
    if (anchorIdx >= 0) {
      result.splice(menu.placement === 'before' ? anchorIdx : anchorIdx + 1, 0, built);
    } else {
      result.push(built);
    }
  }
  return result;
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUnansweredConversationsStore } from '@/store/unansweredConversationsStore';
import { Link, useLocation } from 'react-router-dom';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Input,
  Label,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import MenuItem from './MenuItem';
import { MenuItem as MenuItemType, SubMenuItem as SubMenuItemType } from '../config/menuItems';
import { cn } from '@/utils/cn';
import { PluginSlot } from '@/plugin-host';
import {
  DEFAULT_SITE_SLUG,
  DEFAULT_SITE_URL,
  getSiteLinks,
  normalizeSiteUrl,
  saveSiteLinks,
  siteHrefForSlug,
} from '@/utils/siteLinks';
import {
  SITE_CONTENT_ROUTE,
  deleteSiteMenuItem,
  findSiteMenuItem,
  upsertSiteMenuItem,
} from '@/utils/siteMenuItems';
import {
  DASHBOARD_CONTENT_ROUTE,
  DASHBOARD_DEFAULT_HREF,
  DashboardItem,
  emptyDashboardItem,
  getDashboardItems,
  saveDashboardItems,
} from '@/utils/dashboardMenu';
import { EditorNode, emptyEditorNode } from '@/utils/editorMenus';
import { IconPicker } from '@/components/editor/IconPicker';
import { ContentTypeFields } from '@/components/editor/ContentTypeFields';
import { NodeEditor } from '@/components/editor/NodeEditor';

interface SidebarProps {
  isCollapsed: boolean;
  menuItems: MenuItemType[];
  activeSubmenu: MenuItemType | null;
  activeMenu: string | null;
  isMenuWithSubItemsActive: (item: MenuItemType) => boolean;
  handleMenuClick: (item: MenuItemType, e: React.MouseEvent) => void;
  setActiveSubmenu: (item: MenuItemType | null) => void;
}

export default function Sidebar({
  isCollapsed,
  menuItems,
  activeSubmenu,
  activeMenu,
  isMenuWithSubItemsActive,
  handleMenuClick,
  setActiveSubmenu,
}: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { t } = useLanguage('layout');
  const currentYear = new Date().getFullYear();
  const flyoutRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // Tracks previous activeSubmenu to distinguish "newly opened" from "switched between submenus"
  const prevActiveSubmenuRef = useRef<MenuItemType | null>(null);

  const companyName = t('sidebar.footer.brand');
  const supportWhatsappUrl = 'https://api.whatsapp.com/send/?phone=553196219989&text=Ol%C3%A1%21+Preciso+de+suporte.&type=phone_number&app_absent=0';

  // activeSubmenu guarda a referência do item no momento do clique; quando o
  // menu é recomputado (ex.: links do submenu Sites alterados), o objeto fica
  // obsoleto. Resolve sempre o item atual pelo nome/href.
  const currentSubmenu = useMemo(() => {
    if (!activeSubmenu) return null;
    return (
      menuItems.find(
        (item) => item.name === activeSubmenu.name && item.href === activeSubmenu.href,
      ) ?? activeSubmenu
    );
  }, [activeSubmenu, menuItems]);

  const totalUnread = useUnreadConversationsStore((state) => state.totalUnread);
  const totalUnanswered = useUnansweredConversationsStore((state) => state.totalUnanswered);

  // --- Gerenciamento do site padrão (override simples de nome/URL) ---
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [siteForm, setSiteForm] = useState({ name: '', url: '' });

  const isSitesGroup = (item: MenuItemType) =>
    item.subItems?.some((s) => s.href.startsWith('/sites/')) ?? false;

  const handleSaveSite = () => {
    const name = siteForm.name.trim();
    const url = normalizeSiteUrl(siteForm.url);
    if (!name || !url) {
      toast.error('Informe nome e URL do site');
      return;
    }
    const links = getSiteLinks();
    const existing = links.find((l) => l.id === DEFAULT_SITE_SLUG);
    if (existing) {
      saveSiteLinks(links.map((l) => (l.id === DEFAULT_SITE_SLUG ? { ...l, name, url } : l)));
    } else {
      saveSiteLinks([...links, { id: DEFAULT_SITE_SLUG, name, url }]);
    }
    toast.success('Site padrão atualizado');
    setSiteDialogOpen(false);
  };
  // --- fim gerenciamento do site padrão ---

  // --- Gerenciamento de itens personalizados do submenu Sites (mesma
  // engine do Editor: ícone, conteúdo link/HTML/arquivo, submenus em
  // camadas ilimitadas) ---
  const [siteNodeDialogOpen, setSiteNodeDialogOpen] = useState(false);
  const [editingSiteNodeId, setEditingSiteNodeId] = useState<string | null>(null);
  const [siteNodeForm, setSiteNodeForm] = useState<EditorNode>(emptyEditorNode());
  const [siteContextMenu, setSiteContextMenu] = useState<{ x: number; y: number; id: string; openedAt: number } | null>(null);

  const openNewSiteNodeDialog = () => {
    setEditingSiteNodeId(null);
    setSiteNodeForm(emptyEditorNode());
    setSiteNodeDialogOpen(true);
  };

  const openEditSiteNodeDialog = (id: string) => {
    const item = findSiteMenuItem(id);
    if (!item) return;
    setEditingSiteNodeId(item.id);
    setSiteNodeForm(JSON.parse(JSON.stringify(item)) as EditorNode);
    setSiteNodeDialogOpen(true);
  };

  const handleSaveSiteNode = () => {
    const title = siteNodeForm.title.trim();
    if (!title) {
      toast.error('Informe o título do site');
      return;
    }
    upsertSiteMenuItem({ ...siteNodeForm, title });
    toast.success(editingSiteNodeId ? 'Site atualizado' : 'Site adicionado ao submenu Sites');
    setSiteNodeDialogOpen(false);
  };

  const handleDeleteSiteNode = (id: string) => {
    if (!confirm('Excluir este item do submenu Sites?')) return;
    deleteSiteMenuItem(id);
    toast.success('Site removido');
  };

  // Fecha o menu de contexto ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!siteContextMenu) return;
    const { openedAt } = siteContextMenu;
    const close = (e?: Event) => {
      // Ignora eventos muito próximos da abertura (mesma propagação)
      if (e?.type === 'contextmenu' && performance.now() - openedAt < 100) return;
      setSiteContextMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    // Usa capture=true para interceptar antes de outros handlers
    document.addEventListener('pointerdown', close, { capture: true });
    document.addEventListener('contextmenu', close, { capture: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close, { capture: true });
      document.removeEventListener('contextmenu', close, { capture: true });
      document.removeEventListener('keydown', onKey);
    };
  }, [siteContextMenu]);
  // --- fim gerenciamento de itens personalizados de Sites ---

  // --- Gerenciamento de itens personalizados do submenu Dashboard ---
  const [dashboardDialogOpen, setDashboardDialogOpen] = useState(false);
  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null);
  const [dashboardForm, setDashboardForm] = useState<Omit<DashboardItem, 'id'>>(emptyDashboardItem());

  const isDashboardGroup = (item: MenuItemType) =>
    item.subItems?.some((s) => s.href === DASHBOARD_DEFAULT_HREF) ?? false;

  const openNewDashboardDialog = () => {
    setEditingDashboardId(null);
    setDashboardForm(emptyDashboardItem());
    setDashboardDialogOpen(true);
  };

  const openEditDashboardDialog = (id: string) => {
    const item = getDashboardItems().find((i) => i.id === id);
    if (!item) return;
    setEditingDashboardId(item.id);
    setDashboardForm(item);
    setDashboardDialogOpen(true);
  };

  const handleSaveDashboardItem = () => {
    const title = dashboardForm.title.trim();
    if (!title) {
      toast.error('Informe o título do item');
      return;
    }
    const items = getDashboardItems();
    if (editingDashboardId) {
      saveDashboardItems(
        items.map((i) => (i.id === editingDashboardId ? { ...dashboardForm, title, id: editingDashboardId } : i)),
      );
      toast.success('Item atualizado');
    } else {
      saveDashboardItems([...items, { ...dashboardForm, title, id: emptyDashboardItem().id }]);
      toast.success('Item adicionado ao submenu Dashboard');
    }
    setDashboardDialogOpen(false);
  };

  const handleDeleteDashboardItem = (id: string) => {
    if (!confirm('Excluir este item do submenu Dashboard?')) return;
    saveDashboardItems(getDashboardItems().filter((i) => i.id !== id));
    toast.success('Item removido');
  };
  // --- fim gerenciamento Dashboard ---

  const enrichedMenuItems = useMemo(
    () =>
      menuItems.map((item) =>
        item.href === '/conversations' && totalUnanswered > 0
          ? { ...item, badge: totalUnanswered, badgeHref: '/conversations?segment=unanswered' }
          : item,
      ),
    [menuItems, totalUnanswered],
  );

  const mainMenuItems = enrichedMenuItems.filter(item => item.href !== '/tutorials');
  const tutorialsItem = enrichedMenuItems.find(item => item.href === '/tutorials');

  // Dismiss collapsed flyout on Escape (WAI-ARIA requirement for popover-like elements)
  useEffect(() => {
    if (!activeSubmenu || !isCollapsed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveSubmenu(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSubmenu, isCollapsed, setActiveSubmenu]);

  // Focus management: save trigger only on first open; restore on close; re-focus first element when switching
  useEffect(() => {
    if (activeSubmenu && isCollapsed) {
      // Only capture the trigger when flyout transitions from closed → open (not submenu A → submenu B)
      if (!prevActiveSubmenuRef.current) {
        previousFocusRef.current = document.activeElement as HTMLElement;
      }
      const firstFocusable = flyoutRef.current?.querySelector<HTMLElement>('nav a, nav button');
      firstFocusable?.focus();
    } else if (!activeSubmenu && isCollapsed && previousFocusRef.current) {
      if (document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    }
    prevActiveSubmenuRef.current = activeSubmenu;
  }, [activeSubmenu, isCollapsed]);

  // Keyboard trap: cycle focus within the flyout so Tab cannot escape to main content
  useEffect(() => {
    if (!activeSubmenu || !isCollapsed) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !flyoutRef.current) return;

      const focusable = flyoutRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [activeSubmenu, isCollapsed]);

  /**
   * Renderiza um subitem do submenu. Nós com `children` são títulos de grupo
   * (camadas de submenu criadas no Editor) e renderizam seus filhos de forma
   * recursiva, com indentação por profundidade. Folhas são links normais.
   */
  const renderSubNode = (subItem: SubMenuItemType, depth: number, key: string): React.ReactNode => {
    if (subItem.children && subItem.children.length > 0) {
      return (
        <div key={key}>
          <div
            className="flex items-center gap-2.5 py-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {subItem.iconUrl ? (
              <img src={subItem.iconUrl} alt="" className="h-3.5 w-3.5 flex-shrink-0 object-contain" />
            ) : (
              <subItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="truncate">{subItem.name}</span>
          </div>
          <div className="space-y-0.5">
            {subItem.children.map((child, i) =>
              renderSubNode(child, depth + 1, `${key}-${i}`),
            )}
          </div>
        </div>
      );
    }

    const exactMatch = pathname === subItem.href;
    const startsWithMatch = pathname.startsWith(subItem.href + '/');
    const isSubActive = exactMatch || startsWithMatch;
    const isDefaultSite = subItem.href === siteHrefForSlug(DEFAULT_SITE_SLUG);
    const siteContentId = subItem.href.startsWith(`${SITE_CONTENT_ROUTE}/`)
      ? subItem.href.replace(`${SITE_CONTENT_ROUTE}/`, '')
      : null;
    // Ações de editar/excluir só na raiz do submenu (grupo Sites)
    const isSiteDefaultItem = isDefaultSite && depth === 0;
    const isSiteCustomItem = siteContentId !== null && depth === 0;
    const dashboardItemId = subItem.href.startsWith(`${DASHBOARD_CONTENT_ROUTE}/`)
      ? subItem.href.replace(`${DASHBOARD_CONTENT_ROUTE}/`, '')
      : null;
    // Item fixo "Atendimentos" (href === /dashboard) não é editável por aqui —
    // só os itens personalizados adicionados via "+".
    const isDashboardItem = dashboardItemId !== null && depth === 0;
    return (
      <div key={key} className="group/site flex items-center gap-1">
        <Link
          to={subItem.href}
          onContextMenu={isSiteCustomItem ? (e) => {
            e.preventDefault();
            e.stopPropagation();
            setSiteContextMenu({ x: e.clientX, y: e.clientY, id: siteContentId!, openedAt: performance.now() });
          } : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm flex-1',
            isSubActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {subItem.iconUrl ? (
            <img
              src={subItem.iconUrl}
              alt=""
              className={cn('flex-shrink-0 h-4 w-4 object-contain', isSubActive && 'drop-shadow')}
            />
          ) : (
            <subItem.icon className={cn('flex-shrink-0 h-4 w-4', isSubActive && 'text-primary')} />
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium truncate">{subItem.name}</span>
          </div>
        </Link>
        {isSiteDefaultItem && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/site:opacity-100 transition-opacity pr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Editar site"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Abre dialog com o override salvo (se existir) ou os dados
                // padrão, nunca os dois misturados.
                const override = getSiteLinks().find((l) => l.id === DEFAULT_SITE_SLUG);
                setSiteForm({
                  name: override?.name ?? subItem.name,
                  url: override?.url ?? DEFAULT_SITE_URL,
                });
                setSiteDialogOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {isSiteCustomItem && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/site:opacity-100 transition-opacity pr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Editar site"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openEditSiteNodeDialog(siteContentId!);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Excluir site"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteSiteNode(siteContentId!);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {isDashboardItem && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/site:opacity-100 transition-opacity pr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Editar item"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openEditDashboardDialog(dashboardItemId!);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Excluir item"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteDashboardItem(dashboardItemId!);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const submenuItems = (item: MenuItemType) =>
    item.subItems?.map((subItem, i) => renderSubNode(subItem, 0, `${item.name}-${i}`));

  const submenuHeader = (item: MenuItemType) => (
    <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
      <item.icon className="h-5 w-5 text-primary" />
      <div className="flex-1">
        <h3 id="flyout-title" className="font-semibold text-sidebar-foreground">{item.name}</h3>
      </div>
      {isSitesGroup(item) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Adicionar site"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openNewSiteNodeDialog();
              }}
              className="h-8 w-8 p-0 hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Adicionar site</p>
          </TooltipContent>
        </Tooltip>
      )}
      {isDashboardGroup(item) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Adicionar item"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openNewDashboardDialog();
              }}
              className="h-8 w-8 p-0 hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Adicionar item</p>
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('sidebar.closeSubmenu')}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveSubmenu(null);
            }}
            className="h-8 w-8 p-0 hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{t('sidebar.closeSubmenu')}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar — z-20 fica acima do backdrop de fechamento (z-20 > z-10) */}
      <div
        className={cn(
          'hidden md:flex relative z-20 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border',
          isCollapsed ? 'w-16' : 'w-56',
        )}
      >
        <TooltipProvider delayDuration={300}>
          {/* Navigation Menu */}
          <nav className="space-y-1.5 flex-1 px-2 py-4 overflow-y-auto">
            {mainMenuItems.map(item => (
              <MenuItem
                key={item.id || item.href}
                item={item}
                isCollapsed={isCollapsed}
                isActive={isMenuWithSubItemsActive(item)}
                activeMenu={activeMenu}
                onClick={(e) => handleMenuClick(item, e)}
              />
            ))}
            <PluginSlot id="sidebar.afterMain" />
          </nav>

          {/* Tutorials - fixed at bottom */}
          {tutorialsItem && (
            <div className="px-2 pb-2">
              <MenuItem
                item={tutorialsItem}
                isCollapsed={isCollapsed}
                isActive={pathname === tutorialsItem.href}
                activeMenu={activeMenu}
                onClick={(e) => handleMenuClick(tutorialsItem, e)}
              />
            </div>
          )}

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-sidebar-border">
            {isCollapsed ? (
              <div className="flex flex-col items-center">
                <div className="text-xs text-muted-foreground text-center">© {currentYear}</div>
              </div>
            ) : (
              <>
                <div className="text-sm text-primary font-medium">{companyName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('sidebar.footer.copyright', { year: currentYear })}
                </div>
                {__APP_VERSION__ !== 'dev' && (
                  <div className="text-xs text-muted-foreground/70 mt-1">
                    {__APP_VERSION__}
                  </div>
                )}
                <div className="mt-2 flex flex-col gap-1 text-xs">
                  <a
                    href="https://docs.evolutionfoundation.com.br/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('sidebar.footer.documentation')}
                  </a>
                  <a
                    href={supportWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('sidebar.footer.support')}
                  </a>
                </div>
              </>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/*
       * Collapsed flyout: always mounted when sidebar is collapsed so CSS transitions
       * (opacity + translate) animate correctly on show/hide — conditional rendering
       * would unmount the element and bypass the transition entirely.
       */}
      {isCollapsed && (
        <div
          ref={flyoutRef}
          role="dialog"
          aria-labelledby="flyout-title"
          aria-hidden={activeSubmenu ? undefined : 'true'}
          className={cn(
            'hidden md:flex relative z-20 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border',
            'transition-all duration-150 ease-in-out overflow-hidden',
            activeSubmenu
              ? 'w-64 opacity-100'
              : 'w-0 opacity-0 pointer-events-none',
          )}
        >
          {currentSubmenu && (
            <>
              {submenuHeader(currentSubmenu)}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {submenuItems(currentSubmenu)}
              </nav>
            </>
          )}
        </div>
      )}

      {/* Expanded mode submenu panel — standard in-flow panel, no animation needed */}
      {!isCollapsed && currentSubmenu && (
        <div className="hidden md:flex relative z-20 w-64 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border">
          {submenuHeader(currentSubmenu)}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {submenuItems(currentSubmenu)}
          </nav>
        </div>
      )}

      {/* Menu de contexto (botão direito) dos links customizados do submenu Sites */}
      {siteContextMenu && (
        <div
          role="menu"
          className="fixed z-[100] min-w-[140px] rounded-md border border-border bg-card shadow-lg py-1"
          style={{ left: siteContextMenu.x, top: siteContextMenu.y }}
          onClick={(e) => {
            e.stopPropagation();
            setSiteContextMenu(null);
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2 cursor-pointer"
            onClick={() => {
              openEditSiteNodeDialog(siteContextMenu.id);
              setSiteContextMenu(null);
            }}
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors flex items-center gap-2 cursor-pointer"
            onClick={() => {
              handleDeleteSiteNode(siteContextMenu.id);
              setSiteContextMenu(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        </div>
      )}

      {/* Dialog editar o site padrão (azuliapp) */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar site</DialogTitle>
            <DialogDescription>
              O item será exibido no submenu Sites com um link para a URL informada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-name">Nome</Label>
              <Input
                id="site-name"
                value={siteForm.name}
                onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                placeholder="Ex: Meu Site"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-url">URL</Label>
              <Input
                id="site-url"
                value={siteForm.url}
                onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })}
                placeholder="https://exemplo.com.br"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSite}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog adicionar/editar item personalizado do submenu Sites — mesma
          engine do Editor: ícone, conteúdo (link/HTML/arquivo) e o "+" dentro
          do NodeEditor permite aninhar submenus em camadas ilimitadas. */}
      <Dialog open={siteNodeDialogOpen} onOpenChange={setSiteNodeDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSiteNodeId ? 'Editar site' : 'Adicionar site'}</DialogTitle>
            <DialogDescription>
              O item aparece no submenu Sites. Use o + para adicionar submenus dentro dele.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <NodeEditor
              node={siteNodeForm}
              depth={0}
              onChange={setSiteNodeForm}
              onDelete={() => {
                if (editingSiteNodeId) handleDeleteSiteNode(editingSiteNodeId);
                setSiteNodeDialogOpen(false);
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteNodeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSiteNode}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog adicionar/editar item personalizado do submenu Dashboard */}
      <Dialog open={dashboardDialogOpen} onOpenChange={setDashboardDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDashboardId ? 'Editar item' : 'Adicionar item'}</DialogTitle>
            <DialogDescription>
              O item aparece no submenu Dashboard, ao lado de Atendimentos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="dashboard-item-title">Título</Label>
              <Input
                id="dashboard-item-title"
                value={dashboardForm.title}
                onChange={(e) => setDashboardForm({ ...dashboardForm, title: e.target.value })}
                placeholder="Ex: Relatórios"
              />
            </div>

            <IconPicker
              label="Ícone"
              value={{ icon: dashboardForm.icon, iconUrl: dashboardForm.iconUrl }}
              onChange={(v) => setDashboardForm({ ...dashboardForm, icon: v.icon, iconUrl: v.iconUrl })}
            />

            <div className="space-y-1.5">
              <Label>Posição</Label>
              <div className="flex rounded-md border border-border overflow-hidden w-fit">
                {(['before', 'after'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDashboardForm({ ...dashboardForm, position: p })}
                    className={cn(
                      'px-3 py-2 text-xs font-medium transition-colors',
                      dashboardForm.position === p
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                  >
                    {p === 'before' ? 'Antes de Atendimentos' : 'Depois de Atendimentos'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Conteúdo</Label>
              <ContentTypeFields
                value={{
                  contentType: dashboardForm.contentType,
                  url: dashboardForm.url,
                  html: dashboardForm.html,
                  fileName: dashboardForm.fileName,
                  fileData: dashboardForm.fileData,
                }}
                onChange={(v) => setDashboardForm({ ...dashboardForm, ...v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDashboardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDashboardItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

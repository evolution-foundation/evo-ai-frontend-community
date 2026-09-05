import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { Header, Sidebar } from './components';
import {
  getCustomerMenuItems,
  MenuItem as MenuItemType,
  filterMenuItemsByPermissions,
} from './config/menuItems';

import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useMenuState } from '@/hooks/useMenuState';
import { useDashboardApps } from '@/hooks/useDashboardApps';
import { injectDashboardAppsIntoMenu } from '@/utils/injectDashboardApps';
import { WelcomeTourModal } from '@/components/WelcomeTourModal';
import {
  EDITOR_MENUS_EVENT,
  injectEditorMenus,
} from '@/utils/editorMenus';
import {
  SITE_LINKS_EVENT,
  DEFAULT_SITE_SLUG,
  getSiteLinks,
  siteHrefForSlug,
} from '@/utils/siteLinks';
import { SITE_MENU_ITEMS_EVENT, siteMenuItemsToSubItems } from '@/utils/siteMenuItems';
import {
  DASHBOARD_ITEMS_EVENT,
  DASHBOARD_DEFAULT_HREF,
  buildDashboardSubItems,
} from '@/utils/dashboardMenu';
import { pullMenuConfigs } from '@/utils/menuSync';
import ErrorBoundary from '@/components/ErrorBoundary';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { t } = useLanguage('layout');
  const { user, logout } = useAuth();
  const { can, canAny, canAll } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // Estados do layout
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Load dashboard apps for sidebar integration
  const { apps: dashboardApps } = useDashboardApps({
    autoLoad: true,
    loadDelay: 1000, // Defer slightly to not block initial render
  });

  // Load saved sidebar state
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Sync dos menus personalizados (Editor/Sites/Dashboard) com o servidor:
  // puxa o estado do backend para o localStorage e refresca os menus.
  useEffect(() => {
    pullMenuConfigs();
  }, []);

  // Menu items baseado no tipo de usuário e rota atual
  const getMenuItems = useCallback((): MenuItemType[] => {
    return getCustomerMenuItems(t);
  }, [t]);

  // Links customizados do submenu Sites (localStorage). O contador força o
  // useMemo a recalcular quando um link é adicionado/editado/removido.
  const [siteLinksVersion, setSiteLinksVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setSiteLinksVersion((v) => v + 1);
    window.addEventListener(SITE_LINKS_EVENT, refresh);
    window.addEventListener(SITE_MENU_ITEMS_EVENT, refresh);
    window.addEventListener(EDITOR_MENUS_EVENT, refresh);
    window.addEventListener(DASHBOARD_ITEMS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SITE_LINKS_EVENT, refresh);
      window.removeEventListener(SITE_MENU_ITEMS_EVENT, refresh);
      window.removeEventListener(EDITOR_MENUS_EVENT, refresh);
      window.removeEventListener(DASHBOARD_ITEMS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const menuItems = useMemo(() => {
    const rawMenuItems = getMenuItems();
    let finalItems = filterMenuItemsByPermissions(rawMenuItems, can, canAny, canAll, user?.role?.key);

    const sitesItem = finalItems.find((item) => item.href.startsWith('/sites/'));
    if (sitesItem) {
      const allLinks = getSiteLinks();
      // O site padrão (azuliapp) já tem uma entrada fixa em menuItems.ts — um
      // override salvo para ele atualiza esse rótulo em vez de duplicar a entrada.
      const defaultOverride = allLinks.find((l) => l.id === DEFAULT_SITE_SLUG);
      if (defaultOverride) {
        const defaultHref = siteHrefForSlug(DEFAULT_SITE_SLUG);
        sitesItem.subItems = (sitesItem.subItems ?? []).map((s) =>
          s.href === defaultHref ? { ...s, name: defaultOverride.name } : s,
        );
      }
      const customSubItems = siteMenuItemsToSubItems();
      if (customSubItems.length > 0) {
        sitesItem.subItems = [...(sitesItem.subItems ?? []), ...customSubItems];
        if (!sitesItem.href || sitesItem.href === '#') {
          sitesItem.href = sitesItem.subItems[0].href;
        }
      }
    }

    const dashboardItem = finalItems.find((item) => item.href === DASHBOARD_DEFAULT_HREF);
    if (dashboardItem?.subItems?.[0]) {
      dashboardItem.subItems = buildDashboardSubItems(dashboardItem.subItems[0]);
    }

    if (dashboardApps.length > 0) {
      finalItems = injectDashboardAppsIntoMenu(finalItems, dashboardApps);
    }

    finalItems = injectEditorMenus(finalItems);

    return finalItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMenuItems, can, canAny, canAll, dashboardApps, user?.role?.key, siteLinksVersion]);

  // Use the custom menu state hook
  const menuState = useMenuState(menuItems, setIsMobileMenuOpen);

  const handleLogout = async () => {
    setLogoutDialogOpen(false);

    toast.loading(t('logout.loggingOut'), { id: 'logout' });

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      await logout(); // Now await the async logout function
      toast.success(t('logout.success'), { id: 'logout' });
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/login');
    } catch {
      toast.error(t('logout.error'), { id: 'logout' });
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Se não há usuário, não renderizar o layout
  if (!user) {
    return <div className="flex h-screen items-center justify-center">{t('common.loading')}</div>;
  }

  return (
    <div className="flex flex-col h-dvh bg-background transition-colors duration-150 ease-in-out">

      {/* Header */}
      <Header
        user={user}
        isCollapsed={isCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        menuItems={menuItems}
        activeMenu={menuState.activeMenu}
        pathname={pathname}
        toggleSidebar={toggleSidebar}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setLogoutDialogOpen={setLogoutDialogOpen}
        isMenuItemActive={menuState.isMenuItemActive}
        isMenuWithSubItemsActive={menuState.isMenuWithSubItemsActive}
        handleMenuClick={menuState.handleMenuClick}
      />

      {/* Main Layout Container — `relative` is the positioning anchor for the collapsed sidebar flyout */}
      <div className="flex flex-1 min-h-0 relative transition-colors duration-150 ease-in-out">
        {/* Sidebar */}
        <Sidebar
          isCollapsed={isCollapsed}
          menuItems={menuItems}
          activeSubmenu={menuState.activeSubmenu}
          activeMenu={menuState.activeMenu}
          isMenuWithSubItemsActive={menuState.isMenuWithSubItemsActive}
          handleMenuClick={menuState.handleMenuClick}
          setActiveSubmenu={menuState.setActiveSubmenu}
        />

        {/* Backdrop acessível: fecha o flyout do submenu (sidebar recolhida) via clique, Enter ou Espaço.
            z-10 fica ABAIXO do painel do submenu (z-20 na Sidebar), então cliques nos itens do
            submenu chegam aos links e cliques fora fecham o flyout. */}
        {isCollapsed && menuState.activeSubmenu && (
          <Button
            type="button"
            variant="ghost"
            aria-label={t('sidebar.closeSubmenu')}
            tabIndex={0}
            onClick={() => menuState.setActiveSubmenu(null)}
            onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                menuState.setActiveSubmenu(null);
              }
            }}
            className="absolute inset-0 z-10 h-full w-full cursor-default rounded-none border-0 bg-black/40 md:block"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-auto bg-background transition-colors duration-150 ease-in-out">
          {/* Keyed by path so a crashed page does not keep the fallback up after navigating away */}
          <div className="h-full">
            <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
          </div>
        </main>

      </div>

      {/* Tour */}
      <WelcomeTourModal />

      {/* Logout Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-lg font-semibold">{t('logout.title')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('logout.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              {t('logout.cancel')}
            </Button>
            <Button onClick={handleLogout}>{t('logout.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

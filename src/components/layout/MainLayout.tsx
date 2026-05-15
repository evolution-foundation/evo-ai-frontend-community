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

  // Menu items baseado no tipo de usuário e rota atual
  const getMenuItems = useCallback((): MenuItemType[] => {
    return getCustomerMenuItems(t);
  }, [t]);

  const menuItems = useMemo(() => {
    const rawMenuItems = getMenuItems();
    let finalItems = filterMenuItemsByPermissions(rawMenuItems, can, canAny, canAll, user?.role?.key);

    if (dashboardApps.length > 0) {
      finalItems = injectDashboardAppsIntoMenu(finalItems, dashboardApps);
    }

    return finalItems;
  }, [getMenuItems, can, canAny, canAll, dashboardApps, user?.role?.key]);

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
    <div className="flex flex-col h-screen bg-background transition-colors duration-150 ease-in-out">

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

        {/* Backdrop for collapsed sidebar flyout — starts at left-16 so the icon sidebar remains clickable */}
        {menuState.activeSubmenu && isCollapsed && (
          <div
            role="button"
            tabIndex={0}
            aria-label={t('sidebar.closeSubmenu')}
            className="hidden md:block absolute left-16 top-0 bottom-0 right-0 z-40"
            onClick={() => menuState.setActiveSubmenu(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') menuState.setActiveSubmenu(null);
            }}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background transition-colors duration-150 ease-in-out">
          <div className="h-full">{children}</div>
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

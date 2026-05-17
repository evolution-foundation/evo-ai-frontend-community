import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  ScrollArea,
} from '@evoapi/design-system';
import { useLanguage } from '../../../hooks/useLanguage';
import NotificationBell from '../NotificationBell';
import ProfileMenu from './ProfileMenu';
import { TourFab } from '@/components/TourFab';
import MenuItem from './MenuItem';
import { MenuItem as MenuItemType } from '../config/menuItems';
import { ThemeToggle } from '../../ThemeToggle';
import { AppLogo } from '../../AppLogo';
import { PluginSlot } from '@/plugin-host';

// Utility function for className merging
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar_url?: string;
}

interface HeaderProps {
  user: User;
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  menuItems: MenuItemType[];
  activeMenu: string | null;
  pathname: string;
  toggleSidebar: () => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setLogoutDialogOpen: (open: boolean) => void;
  isMenuItemActive: (href: string) => boolean;
  isMenuWithSubItemsActive: (item: MenuItemType) => boolean;
  handleMenuClick: (item: MenuItemType, e: React.MouseEvent) => void;
}

export default function Header({
  user,
  isCollapsed,
  isMobileMenuOpen,
  menuItems,
  activeMenu,
  pathname,
  toggleSidebar,
  setIsMobileMenuOpen,
  setLogoutDialogOpen,
  isMenuWithSubItemsActive,
  handleMenuClick,
}: HeaderProps) {
  const { t } = useLanguage('layout');
  const [expandedMobileMenus, setExpandedMobileMenus] = useState<Set<string>>(new Set());

  return (
    <div className="flex-shrink-0 bg-sidebar border-b border-sidebar-border px-0 py-3 flex items-center shadow-sm">
      {/* Mobile Layout */}
      <div className="md:hidden flex items-center w-full px-4">
        {/* Left: Menu Button */}
        <div className="flex-1 flex justify-start">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground cursor-pointer">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t('sidebar.openMenu')}</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-80 p-0 !bg-sidebar text-sidebar-foreground">

              <SheetHeader className="border-b border-sidebar-border p-6">
                <SheetTitle className="text-left text-sidebar-foreground">
                  {t('sidebar.navigationMenu')}
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="flex-1 min-h-0 overflow-hidden p-4">
                <nav className="space-y-1">
                  {menuItems.map(item => {
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const menuKey = item.id || item.href;
                    const isExpanded = expandedMobileMenus.has(menuKey);

                    if (!hasSubItems) {
                      return (
                        <MenuItem
                          key={menuKey}
                          item={item}
                          mobile
                          isActive={isMenuWithSubItemsActive(item)}
                          activeMenu={activeMenu}
                          onClick={e => handleMenuClick(item, e)}
                        />
                      );
                    }

                    const isParentActive = item.subItems!.some(
                      sub => pathname === sub.href || pathname.startsWith(sub.href + '/')
                    );

                    return (
                      <div key={menuKey}>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedMobileMenus(prev => {
                              const next = new Set(prev);
                              if (next.has(menuKey)) {
                                next.delete(menuKey);
                              } else {
                                next.add(menuKey);
                              }
                              return next;
                            });
                          }}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all w-full text-left cursor-pointer',
                            isParentActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                          )}
                        >
                          <item.icon className={cn('flex-shrink-0 h-5 w-5', isParentActive && 'text-primary')} />
                          <span className="font-medium flex-1">{item.name}</span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                            {item.subItems!.map(subItem => {
                              const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                              return (
                                <Link
                                  key={subItem.href}
                                  to={subItem.href}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm',
                                    isSubActive
                                      ? 'bg-primary text-primary-foreground'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                                  )}
                                >
                                  <subItem.icon className={cn('flex-shrink-0 h-4 w-4', isSubActive && 'text-primary-foreground')} />
                                  <span className="font-medium">{subItem.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <PluginSlot id="sidebar.afterMain" />
                </nav>
              </ScrollArea>

              <div className="p-4 border-t border-sidebar-border">
                <ThemeToggle />
              </div>

              {/* Mobile User Menu */}
              <ProfileMenu
                user={user}
                mobile
                setLogoutDialogOpen={setLogoutDialogOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Center: Logo */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2">
            <AppLogo className="h-8 max-w-32" />
          </div>
        </div>

        {/* Right: Notifications and User Menu */}
        <div className="flex-1 flex justify-end items-center gap-2">
          <PluginSlot id="header.right" />
          <TourFab />
          <NotificationBell />
          <ProfileMenu
            user={user}
            setLogoutDialogOpen={setLogoutDialogOpen}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center w-full">
        {/* Left side - aligned with sidebar */}
        <div
          className={cn(
            'flex items-center justify-between transition-all duration-300 ease-in-out px-4 relative',
            isCollapsed ? 'w-16' : 'w-56',
          )}
        >
          {/* App Logo - only show when not collapsed */}
          {!isCollapsed && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <AppLogo className="h-8 max-w-32" />
            </div>
          )}

          {/* Desktop sidebar toggle - always at the right edge of sidebar area */}
          <div className={cn('flex items-center', isCollapsed ? 'w-full justify-center' : 'ml-auto')}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-8 w-8 text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0 cursor-pointer"
                >
                  {isCollapsed ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2 px-4">
          <PluginSlot id="header.left" />
          <PluginSlot id="header.right" />
          <TourFab />
          {/* Theme Toggle */}
          <ThemeToggle />
          {/* Notifications */}
          <NotificationBell />
          {/* User Menu */}
          <ProfileMenu
            user={user}
            setLogoutDialogOpen={setLogoutDialogOpen}
          />
        </div>
      </div>
    </div>
  );
}

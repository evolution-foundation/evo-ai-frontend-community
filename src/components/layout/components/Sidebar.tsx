import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  Button,
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@evoapi/design-system';
import MenuItem from './MenuItem';
import { MenuItem as MenuItemType } from '../config/menuItems';
import { cn } from '@/utils/cn';
import { PluginSlot } from '@/plugin-host';

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

  const mainMenuItems = menuItems.filter(item => item.href !== '/tutorials');
  const tutorialsItem = menuItems.find(item => item.href === '/tutorials');

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

  const submenuItems = (item: MenuItemType) =>
    item.subItems?.map(subItem => {
      const exactMatch = pathname === subItem.href;
      const startsWithMatch = pathname.startsWith(subItem.href + '/');
      const hasMoreSpecificMatch = item.subItems?.some(
        other =>
          other.href !== subItem.href &&
          (pathname === other.href || pathname.startsWith(other.href + '/')) &&
          other.href.length > subItem.href.length,
      );
      const isSubActive = exactMatch || (startsWithMatch && !hasMoreSpecificMatch);
      return (
        <Link
          key={subItem.href}
          to={subItem.href}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm',
            isSubActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          <subItem.icon className={cn('flex-shrink-0 h-4 w-4', isSubActive && 'text-primary')} />
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium">{subItem.name}</span>
          </div>
        </Link>
      );
    });

  const submenuHeader = (item: MenuItemType) => (
    <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
      <item.icon className="h-5 w-5 text-primary" />
      <div className="flex-1">
        <h3 id="flyout-title" className="font-semibold text-sidebar-foreground">{item.name}</h3>
      </div>
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
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border',
          isCollapsed ? 'w-16' : 'w-56',
        )}
      >
        <TooltipProvider delayDuration={300}>
          {/* Navigation Menu */}
          <nav className="space-y-1.5 flex-1 px-2 py-4">
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
            'hidden md:flex w-64 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border',
            'absolute left-16 top-0 h-full z-50 shadow-xl',
            'transition-all duration-150 ease-in-out',
            activeSubmenu
              ? 'translate-x-0 opacity-100'
              : '-translate-x-2 opacity-0 pointer-events-none',
          )}
        >
          {activeSubmenu && (
            <>
              {submenuHeader(activeSubmenu)}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {submenuItems(activeSubmenu)}
              </nav>
            </>
          )}
        </div>
      )}

      {/* Expanded mode submenu panel — standard in-flow panel, no animation needed */}
      {!isCollapsed && activeSubmenu && (
        <div className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border">
          {submenuHeader(activeSubmenu)}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {submenuItems(activeSubmenu)}
          </nav>
        </div>
      )}
    </>
  );
}

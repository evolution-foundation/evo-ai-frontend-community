import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@evoapi/design-system';
import { MenuItem as MenuItemType } from '../config/menuItems';

// Utility function for className merging
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface MenuItemProps {
  item: MenuItemType;
  mobile?: boolean;
  isCollapsed?: boolean;
  isActive: boolean;
  activeMenu: string | null;
  onClick: (e: React.MouseEvent) => void;
}

export default function MenuItem({
  item,
  mobile = false,
  isCollapsed = false,
  isActive,
  onClick,
}: MenuItemProps) {
  const hasSubItems = item.subItems && item.subItems.length > 0;

  const menuItem = (
    <Link
      to={hasSubItems && !mobile && item.href === '#' ? '#' : item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group',
        mobile ? 'w-full' : isCollapsed ? 'justify-center' : '',
        isActive
          ? mobile
            ? 'bg-primary text-primary-foreground'
            : isCollapsed
            ? 'bg-primary/20 text-primary'
            : 'bg-primary/15 text-primary border-l-4 border-primary pl-2.5'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      <item.icon className={cn('flex-shrink-0 h-5 w-5', isActive && 'text-primary')} />
      {(!isCollapsed || mobile) && (
        <>
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium">{item.name}</span>
          </div>
          {hasSubItems && !mobile && (
            <div className="ml-auto">
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </>
      )}
    </Link>
  );

  if (!mobile && isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {menuItem}
        </TooltipTrigger>
        <TooltipContent side="right" className={cn(hasSubItems ? 'p-0 overflow-hidden' : '')}>
          {hasSubItems ? (
            <div className="min-w-[180px]">
              <p className="font-semibold text-sm px-3 pt-2.5 pb-1.5 text-primary-foreground">{item.name}</p>
              <div className="border-t border-primary-foreground/20">
                {item.subItems?.map(subItem => (
                  <Link
                    key={subItem.href}
                    to={subItem.href}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-primary-foreground hover:bg-primary-foreground/15 transition-colors"
                  >
                    <subItem.icon className="h-4 w-4 flex-shrink-0 text-primary-foreground/70" />
                    <span>{subItem.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="font-medium">{item.name}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return menuItem;
}

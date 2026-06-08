import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@evoapi/design-system';
import { MenuItem as MenuItemType } from '../config/menuItems';
import { UnreadBadge } from '@/components/shared';
import { cn } from '@/utils/cn';

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
  const { t } = useTranslation('chat');
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const badgeAriaLabel =
    item.badge && item.badge > 0
      ? t('unreadBadge.menuAriaLabel', { count: item.badge })
      : undefined;

  const menuItem = (
    <Link
      to={hasSubItems && !mobile && item.href === '#' ? '#' : item.href}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group',
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
          {item.badge ? (
            <UnreadBadge
              count={item.badge}
              ariaLabel={badgeAriaLabel}
              className="ml-auto"
            />
          ) : hasSubItems && !mobile ? (
            <div className="ml-auto">
              <ChevronRight className="h-4 w-4" />
            </div>
          ) : null}
        </>
      )}
      {isCollapsed && !mobile && item.badge ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-none"
        >
          {item.badge < 100 ? item.badge : '99+'}
        </span>
      ) : null}
    </Link>
  );

  if (!mobile && isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{menuItem}</TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{item.name}</p>
          {badgeAriaLabel ? (
            <p className="text-xs text-muted-foreground">{badgeAriaLabel}</p>
          ) : null}
        </TooltipContent>
      </Tooltip>
    );
  }

  return menuItem;
}

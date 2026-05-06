import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Bell } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@evoapi/design-system';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '@/contexts/NotificationsContext';
import { cn } from '@/lib/utils';

export default function NotificationBell() {
  const { t } = useLanguage('layout');
  const [isOpen, setIsOpen] = useState(false);
  const { state, actions } = useNotifications();

  // Fetch notifications every time the dropdown opens.
  // `actions` is now memoized in the provider (deps=[]), so it's stable across
  // renders and safe to include here without causing re-fetch loops.
  useEffect(() => {
    if (isOpen) {
      actions.fetchNotifications({ page: 1 });
    }
  }, [isOpen, actions]);

  const unreadCount = state.meta.unreadCount;

  // Format unread count display
  const getUnreadCountDisplay = () => {
    if (unreadCount === 0) return '';
    return unreadCount < 100 ? unreadCount.toString() : '99+';
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer',
            isOpen && 'bg-primary/10 text-primary hover:bg-primary/10'
          )}
        >
          <Bell className={cn('h-5 w-5', isOpen && 'text-primary')} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-1 bg-yellow-400 text-black text-xs font-medium min-w-[1rem] h-4 rounded-full flex items-center justify-center px-1">
              {getUnreadCountDisplay()}
            </span>
          )}
          <span className="sr-only">{t('notifications.bell.ariaLabel')}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[520px] p-0 bg-background border shadow-lg"
        align="end"
        sideOffset={8}
      >
        <NotificationPanel
          onClose={() => setIsOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

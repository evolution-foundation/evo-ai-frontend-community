import { useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@evoapi/design-system';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ListCheck,
  Settings,
  X,
} from 'lucide-react';
import NotificationItem from './NotificationItem';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Notification } from '@/services/notifications/NotificationsService';

interface NotificationPanelProps {
  onClose: () => void;
}

const PAGE_SIZE = 15;

export default function NotificationPanel({
  onClose,
}: NotificationPanelProps) {
  const { t } = useLanguage('layout');
  const navigate = useNavigate();
  const { state, actions } = useNotifications();
  const [currentPage, setCurrentPage] = useState(1);

  const totalUnreadCount = state.meta.unreadCount;
  const totalCount = state.meta.count;

  // Show all notifications (read + unread); the visual unread indicator is
  // rendered by NotificationItem so the user can see history after marking
  // everything as read (EVO-977 AC2).
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return state.notifications.slice(startIndex, endIndex);
  }, [state.notifications, currentPage]);

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage >= totalPages;

  const handlePageChange = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
    actions.fetchNotifications({ page: newPage });
  };

  const handleOpenNotification = async (notification: Notification) => {
    try {
      // Mark as read
      await actions.markAsRead(notification);

      // Navigate to conversation
      if (notification.primary_actor?.id) {
        navigate(`/conversations/${notification.primary_actor.id}`);
        onClose();
      }
    } catch (error) {
      console.error('Error opening notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await actions.markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleOpenSettings = () => {
    navigate('/settings/account');
    onClose();
  };

  const getNotificationTypeLabel = (type: string) => {
    const key = `notifications.panel.types.${type}`;
    const translated = t(key);
    // Se a tradução não existir, retornar o tipo original
    return translated !== key ? translated : type;
  };

  return (
    <div className="flex flex-col h-[90vh] max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">{t('notifications.panel.title')}</span>
          {totalUnreadCount > 0 && (
            <span className="px-2 py-1 text-xs font-semibold rounded-md bg-muted text-muted-foreground">
              {totalUnreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalUnreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={state.uiFlags.isUpdating}
              className="text-muted-foreground hover:text-foreground"
            >
              <ListCheck className="h-4 w-4 mr-2" />
              {t('notifications.panel.markAllAsRead')}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenSettings}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Stale-while-revalidate: keep showing the cached list while refetch
            happens in the background. Only show full-screen loader when there
            is no cached data yet. */}
        {state.uiFlags.isFetching && paginatedNotifications.length > 0 && (
          <div
            className="absolute top-2 right-3 w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent z-10"
            aria-label={t('notifications.panel.loading')}
          />
        )}
        {state.uiFlags.isFetching && paginatedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
            <p className="text-muted-foreground">{t('notifications.panel.loading')}</p>
          </div>
        ) : paginatedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ListCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">{t('notifications.panel.emptyTitle')}</h3>
            <p className="text-muted-foreground">
              {t('notifications.panel.emptyDescription')}
            </p>
          </div>
        ) : (
          paginatedNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={handleOpenNotification}
              getTypeLabel={getNotificationTypeLabel}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={isFirstPage}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={isFirstPage}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-sm font-semibold text-muted-foreground">
            {currentPage}{t('notifications.panel.pagination.separator')}{totalPages}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={isLastPage}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={isLastPage}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

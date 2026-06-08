import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type { Notification, NotificationsResponse, UnreadCountResponse, NotificationDeleteResponse } from '@/types/notifications';

export type { Notification, NotificationsResponse, UnreadCountResponse, NotificationDeleteResponse };

class NotificationsService {
  private get baseUrl(): string {
    return '/notifications';
  }

  // Get notifications with pagination and filters
  async getNotifications(params: {
    page?: number;
    status?: string;
    type?: string;
    sortOrder?: string;
  } = {}): Promise<NotificationsResponse> {
    const { page = 1, status, type, sortOrder } = params;

    const includesFilter = [status, type].filter(value => !!value);

    const response = await api.get(this.baseUrl, {
      params: {
        page,
        sort_order: sortOrder,
        includes: includesFilter,
      },
    });

    return extractResponse<Notification>(response) as NotificationsResponse;
  }

  // Get unread notifications count
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await api.get(`${this.baseUrl}/unread_count`);
    if (typeof response.data === 'number') {
      return { count: response.data };
    }
    // Standard backend shape: { success, data: { unread_count: N }, meta, message }
    if (response.data?.data?.unread_count !== undefined) {
      return { count: response.data.data.unread_count };
    }
    // Legacy flat shape: { unread_count: N }
    if (response.data?.unread_count !== undefined) {
      return { count: response.data.unread_count };
    }
    return extractData<any>(response);
  }

  // Mark notification as read
  async markAsRead(primaryActorType: string, primaryActorId: string): Promise<void> {
    await api.post(`${this.baseUrl}/read_all`, {
      primary_actor_type: primaryActorType,
      primary_actor_id: primaryActorId,
    });
  }

  // Mark notification as unread
  async markAsUnread(id: string): Promise<void> {
    await api.post(`${this.baseUrl}/${id}/unread`);
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await api.post(`${this.baseUrl}/read_all`);
  }

  // Delete notification
  async deleteNotification(id: string): Promise<NotificationDeleteResponse> {
    const response = await api.delete(`${this.baseUrl}/${id}`);
    return extractData<NotificationDeleteResponse>(response);
  }

  // Delete all notifications
  async deleteAll(type: 'all' | 'read' = 'all'): Promise<NotificationDeleteResponse> {
    const response = await api.post(`${this.baseUrl}/destroy_all`, {
      type,
    });
    return extractData<NotificationDeleteResponse>(response);
  }

  // Snooze notification
  async snoozeNotification(id: string, snoozedUntil?: string): Promise<{ snoozed_until: string | null }> {
    const response = await api.post(`${this.baseUrl}/${id}/snooze`, {
      snoozed_until: snoozedUntil || null,
    });

    return extractData<any>(response);
  }
}

export default new NotificationsService();

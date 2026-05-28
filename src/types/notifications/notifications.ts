// Notification metadata
export interface NotificationMeta {
  assignee?: {
    name: string;
    thumbnail: string;
  };
}

export interface NotificationSender {
  id: string;
  name: string;
  avatar_url: string | null;
  type: string;
}

// Notification entity
export interface Notification {
  id: string;
  notification_type: string;
  primary_actor_id: string;
  primary_actor: {
    id: string;
    display_id?: number;
    type?: string;
    channel?: string;
    contact?: { id: string; name: string; avatar_url: string | null };
  } | null;
  secondary_actor?: { id: string; type: string; sender?: NotificationSender } | null;
  push_message_title: string;
  push_message_body?: string;
  last_activity_at: string;
  read_at: string | null;
  primary_actor_meta?: NotificationMeta | null;
  sender?: NotificationSender | null;
}

// Shape of the pagination object nested inside meta by paginated_response helper
interface NotificationsPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

// Notification list response — mirrors the actual backend JSON shape
export interface NotificationsResponse {
  data: Notification[];
  meta: {
    count: number;
    unread_count: number;
    pagination: NotificationsPagination;
  };
}

// Unread count response
export interface UnreadCountResponse {
  count: number;
}

// Notification settings
export interface NotificationSettings {
  id: string;
  user_id: string;
  all_email_flags: string[];
  selected_email_flags: string[];
  all_push_flags: string[];
  selected_push_flags: string[];
}

// Response types
import type { StandardResponse } from '@/types/core';

export interface NotificationDeleteResponse extends StandardResponse<{ message: string }> {}

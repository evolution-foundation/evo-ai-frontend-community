import type { Inbox } from './api';

export type SearchScope = 'all' | 'conversations' | 'contacts' | 'messages';

export interface SearchContactResult {
  id: number | string;
  name: string;
  email: string | null;
  phone_number: string | null;
  identifier: string | null;
}

export interface SearchMessageSender {
  id: number;
  name: string;
  type: string;
  available_name?: string;
  avatar_url?: string;
  availability_status?: string;
  thumbnail?: string;
}

export interface SearchMessageResult {
  id: number | string;
  content: string | null;
  message_type: number;
  content_type: string;
  source_id: string | null;
  inbox_id: number;
  conversation_id: number | null;
  created_at: number;
  sender?: SearchMessageSender | null;
  inbox?: Pick<Inbox, 'id' | 'name'> | null;
}

export interface SearchConversationAgent {
  id: number;
  name: string;
  email?: string;
  available_name?: string;
  avatar_url?: string;
}

export interface SearchConversationResult {
  id: string;
  display_id: number;
  created_at: number;
  message: SearchMessageResult | null;
  contact: SearchContactResult | null;
  inbox: Pick<Inbox, 'id' | 'name' | 'channel_type'> | null;
  agent: SearchConversationAgent | null;
  additional_attributes: Record<string, unknown>;
}

export interface SearchAllResult {
  conversations: SearchConversationResult[];
  contacts: SearchContactResult[];
  messages: SearchMessageResult[];
}

export interface SearchConversationsResult {
  conversations: SearchConversationResult[];
}

export interface SearchContactsResult {
  contacts: SearchContactResult[];
}

export interface SearchMessagesResult {
  messages: SearchMessageResult[];
}

export interface SearchRequestParams {
  q: string;
  page?: number;
}

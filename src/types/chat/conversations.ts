import { Conversation, ConversationListParams, Contact, ConversationsQuery } from './api';
import { PaginationMeta } from '@/types/core';

export interface ConversationsState {
  // Conversations list
  conversations: Conversation[];
  hiddenConversations: Conversation[];
  selectedConversationId: string | null;
  selectedConversationData: Conversation | null; // Manter conversa selecionada independente da lista
  conversationsLoading: boolean;
  conversationsError: string | null;
  conversationsPagination: PaginationMeta | null;

  // Real-time State
  unreadCounts: Record<string, number>;
}

export type ConversationsAction =
  | { type: 'SET_CURRENT_ACCOUNT'; payload: string }
  | {
      type: 'SET_CONVERSATIONS';
      payload: { conversations: Conversation[]; pagination: PaginationMeta };
    }
  | {
      type: 'APPEND_CONVERSATIONS';
      payload: { conversations: Conversation[]; pagination: PaginationMeta };
    }
  | { type: 'SET_CONVERSATIONS_LOADING'; payload: boolean }
  | { type: 'SET_CONVERSATIONS_ERROR'; payload: string | null }
  | { type: 'SELECT_CONVERSATION'; payload: string | null }
  | { type: 'SET_SELECTED_CONVERSATION_DATA'; payload: Conversation | null }
  | { type: 'UPDATE_CONVERSATION'; payload: Conversation }
  | { type: 'UPDATE_CONTACT_IN_CONVERSATIONS'; payload: Contact }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'REMOVE_CONVERSATION'; payload: string }
  | { type: 'CLEANUP_DUPLICATES' }
  | { type: 'UPDATE_UNREAD_COUNT'; payload: { conversationId: string; count: number } }
  | {
      type: 'UPDATE_CONVERSATION_LAST_ACTIVITY';
      payload: { conversationId: string; lastActivityAt: string };
    }
  | {
      type: 'INCREMENT_UNREAD_COUNT';
      payload: { conversationId: string };
    }
  | {
      type: 'MARK_CONVERSATION_AS_READ';
      payload: string;
    }
  | { type: 'ADD_HIDDEN_CONVERSATION'; payload: Conversation }
  | { type: 'REVEAL_HIDDEN_CONVERSATIONS' };

export interface ConversationsContextValue {
  state: ConversationsState;
  // Conversation actions
  loadConversations: (params?: ConversationListParams) => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  setConversations: (
    conversations: Conversation[],
    pagination: PaginationMeta,
    query?: ConversationsQuery,
  ) => void;
  loadSpecificConversation: (conversationId: string) => Promise<Conversation | null>;
  selectConversation: (conversationId: string | null) => void;
  updateConversationStatus: (
    conversationId: string,
    status: 'open' | 'resolved' | 'pending' | 'snoozed',
    onFilterReload?: () => Promise<void>,
  ) => Promise<Conversation>;
  updateConversationPriority: (
    conversationId: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' | null,
    onFilterReload?: () => Promise<void>,
  ) => Promise<Conversation>;
  pinConversation: (
    conversationId: string,
    onFilterReload?: () => Promise<void>,
  ) => Promise<Conversation>;
  unpinConversation: (
    conversationId: string,
    onFilterReload?: () => Promise<void>,
  ) => Promise<Conversation>;
  archiveConversation: (
    conversationId: string,
    onFilterReload?: () => Promise<void>,
  ) => Promise<Conversation>;
  unarchiveConversation: (
    conversationId: string,
    onFilterReload?: () => Promise<void>,
  ) => Promise<Conversation>;

  // Direct state manipulation (for WebSocket integration)
  updateConversation: (conversation: Conversation) => void;
  updateContactInConversations: (updatedContact: Contact) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  cleanupDuplicates: () => void;
  updateUnreadCount: (conversationId: string, count: number) => void;
  updateConversationLastActivity: (conversationId: string, lastActivityAt: string) => void;
  incrementUnreadCount: (conversationId: string) => void;
  addHiddenConversation: (conversation: Conversation) => void;
  revealHiddenConversations: () => void;

  // Computed values
  selectedConversation: Conversation | null;
  getConversation: (conversationId: string) => Conversation | null;
  getUnreadCount: (conversationId: string) => number;

  // Context menu actions
  deleteConversation: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  markAsUnread: (conversationId: string) => Promise<void>;
  markAsResolved: (conversationId: string) => Promise<void>;
  markAsPending: (conversationId: string) => Promise<void>;
  assignAgent: (conversationId: string, assigneeId: string | null) => Promise<void>;
  assignTeam: (conversationId: string, teamId: string | null) => Promise<void>;
  assignLabels: (conversationId: string, labels: string[]) => Promise<void>;
}

export const initialState: ConversationsState = {
  conversations: [],
  hiddenConversations: [],
  selectedConversationId: null,
  selectedConversationData: null,
  conversationsLoading: false,
  conversationsError: null,
  conversationsPagination: null,
  unreadCounts: {},
};

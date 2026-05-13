import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Input } from '@evoapi/design-system/input';
import { Badge } from '@evoapi/design-system/badge';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@evoapi/design-system/context-menu';
import {
  Search,
  Filter,
  Mail,
  MailOpen,
  MessageCircle,
  CheckCircle,
  Clock,
  Pause,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  User as UserIcon,
  Users,
  Tag,
  Trash2,
  X,
  FileText,
  Pin,
  Archive,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { Conversation, ConversationFilter } from '@/types/chat/api';
import {
  attachmentLabel,
  mediaTypeFromAttributes,
  senderNameFromAttributes,
} from '@/utils/chat/mediaLabels';
import { formatConversationTime, formatDetailedTime } from '@/utils/time/timeHelpers';
import { ConversationSkeleton } from '../loading-states';
import { NoConversations } from '../empty-states';
import ContactAvatar from '../contact/ContactAvatar';
import ConversationBadges from '../conversation/ConversationBadges';
import ConversationsFilter from '../conversation/ConversationsFilter';
import GlobalSearchPanel from '../search/GlobalSearchPanel';
import { BaseFilter } from '@/types/core';
import { useLanguage } from '@/hooks/useLanguage';
import { useDebounce } from '@/hooks/useDebounce';
import chatService from '@/services/chat/chatService';
import api from '@/services/core/api';
import type {
  SearchConversationResult,
  SearchContactResult,
  SearchMessageResult,
} from '@/types/chat/search';

interface ChatSidebarProps {
  mobileView: 'list' | 'chat';
  searchInput: string;
  onSearchChange: (value: string) => void;
  onConversationSelect: (conversation: Conversation) => void;
  onFilterApply: (filters: BaseFilter[]) => void;
  onFilterClear: () => void;
  // Context menu handlers
  onMarkAsRead: (conversation: Conversation) => void;
  onMarkAsUnread: (conversation: Conversation) => void;
  onMarkAsOpen: (conversation: Conversation) => void;
  onMarkAsResolved: (conversation: Conversation) => void;
  onPostpone: (conversation: Conversation) => void;
  onMarkAsSnoozed: (conversation: Conversation) => void;
  onSetPriority: (
    conversation: Conversation,
    priority: 'low' | 'medium' | 'high' | 'urgent' | null,
  ) => void;
  onPinConversation: (conversation: Conversation) => void;
  onUnpinConversation: (conversation: Conversation) => void;
  onArchiveConversation: (conversation: Conversation) => void;
  onUnarchiveConversation: (conversation: Conversation) => void;
  onAssignAgent: (conversation: Conversation) => void;
  onAssignTeam: (conversation: Conversation) => void;
  onAssignTag: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
}

const ChatSidebar = ({
  mobileView,
  searchInput,
  onSearchChange,
  onConversationSelect,
  onFilterApply,
  onFilterClear,
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAsOpen,
  onMarkAsResolved,
  onPostpone,
  onMarkAsSnoozed,
  onSetPriority,
  onPinConversation,
  onUnpinConversation,
  onArchiveConversation,
  onUnarchiveConversation,
  onAssignAgent,
  onAssignTeam,
  onAssignTag,
  onDeleteConversation,
}: ChatSidebarProps) => {
  const { t } = useLanguage('chat');
  const chatContext = useChatContext();
  // Explicitly type conversations to ensure TypeScript recognizes it has 'state'
  const conversations = chatContext.conversations as typeof chatContext.conversations & {
    state: {
      conversations: Conversation[];
      conversationsLoading: boolean;
      conversationsError: string | null;
      selectedConversationId: string | null;
      conversationsPagination: {
        page?: number;
        total_pages?: number;
        has_next_page?: boolean;
      } | null;
    };
    getUnreadCount: (conversationId: string) => number;
    loadConversations: (params?: unknown) => Promise<void>;
    loadMoreConversations: () => Promise<void>;
  };
  const filters = chatContext.filters;
  const [conversationFilters, setConversationFilters] = useState<BaseFilter[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'resolved'>('open');
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // Carregar conversas quando a aba muda
  useEffect(() => {
    conversations.loadConversations({ status: activeTab, page: 1 });
  }, [activeTab]);

  // ðŸŽ¯ SYNC: Sincronizar local state com FiltersContext para compatibilidade com o modal
  useEffect(() => {
    // Quando filters.state.activeFilters mudar (ex: por applyFilters chamado diretamente),
    // atualizar o local state tambÃ©m para que o modal mostre os filtros corretos
    // ConversationFilter (API format) -> BaseFilter (UI format)
    const currentLocal = JSON.stringify(conversationFilters);
    const currentContext = JSON.stringify(
      filters.state.activeFilters.map((f: ConversationFilter) => ({
        attributeKey: f.attribute_key,
        filterOperator: f.filter_operator,
        values: Array.isArray(f.values) ? f.values.join(',') : String(f.values[0] || ''),
        queryOperator: f.query_operator,
        attributeModel: 'standard' as const,
      })),
    );

    if (currentLocal !== currentContext) {
      setConversationFilters(
        filters.state.activeFilters.map((f: ConversationFilter) => ({
          attributeKey: f.attribute_key,
          filterOperator: f.filter_operator,
          values: Array.isArray(f.values) ? f.values.join(',') : String(f.values[0] || ''),
          queryOperator: f.query_operator,
          attributeModel: 'standard' as const,
        })),
      );
    }
  }, [filters.state.activeFilters, conversationFilters]);

  const navigate = useNavigate();
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchInput, 500);

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (value.trim().length > 0) {
      setIsSearchPanelOpen(true);
    }
  };

  const handleSearchFocus = () => {
    if (searchInput.trim().length > 0) {
      setIsSearchPanelOpen(true);
    }
  };

  const handleSelectConversation = useCallback(
    (item: SearchConversationResult) => {
      navigate(`/conversations/${item.id}`);
      onSearchChange('');
      setIsSearchPanelOpen(false);
    },
    [navigate, onSearchChange],
  );

  const handleSelectContact = useCallback(
    (item: SearchContactResult) => {
      navigate(`/contacts/${item.id}`);
      onSearchChange('');
      setIsSearchPanelOpen(false);
    },
    [navigate, onSearchChange],
  );

  const handleSelectMessage = useCallback(
    async (item: SearchMessageResult) => {
      setIsSearchPanelOpen(false);
      onSearchChange('');

      if (item.conversation_id == null) return;

      try {
        const raw = await chatService.getConversation(String(item.conversation_id));
        const envelope = raw as { data?: { uuid?: string; id?: string }; uuid?: string; id?: string } | null;
        const conv = envelope?.data?.id ? envelope.data : envelope;
        const uuid = conv?.uuid || conv?.id;
        if (uuid) {
          navigate(`/conversations/${uuid}`, {
            state: { scrollToMessageId: item.id },
          });
        }
      } catch (error) {
        console.error('Failed to load conversation from message result:', error);
      }
    },
    [navigate, onSearchChange],
  );

  const handleApplyFilters = async (newFilters: BaseFilter[]) => {
    setConversationFilters(newFilters);
    onFilterApply(newFilters);
  };

  const handleClearFilters = async () => {
    setConversationFilters([]);
    onFilterClear();
  };

  const pagination = conversations.state.conversationsPagination;
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.total_pages || 1;
  const hasNextPage = pagination?.has_next_page ?? currentPage < totalPages;

  const handleSidebarScroll = useCallback(async () => {
    const container = sidebarScrollRef.current;
    if (!container || loadingMoreRef.current) return;

    const pagination = conversations.state.conversationsPagination;
    if (!pagination) return;

    const currentPage = pagination.page || 1;
    const totalPages = pagination.total_pages || 1;
    const hasNextPage = pagination.has_next_page ?? currentPage < totalPages;
    if (!hasNextPage) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceToBottom > 120) return;

    loadingMoreRef.current = true;
    setIsLoadingMoreConversations(true);
    try {
      await conversations.loadMoreConversations();
    } finally {
      setIsLoadingMoreConversations(false);
      loadingMoreRef.current = false;
    }
  }, [conversations]);

  const handleLoadMoreClick = useCallback(async () => {
    if (loadingMoreRef.current || isLoadingMoreConversations || !hasNextPage) return;

    loadingMoreRef.current = true;
    setIsLoadingMoreConversations(true);
    try {
      await conversations.loadMoreConversations();
    } finally {
      setIsLoadingMoreConversations(false);
      loadingMoreRef.current = false;
    }
  }, [conversations, hasNextPage, isLoadingMoreConversations]);

  const visibleConversations = useMemo(() => {
    const filtered = conversations.state.conversations.filter(conversation => {
      // Exibe apenas as conversas que batem com a aba atual
      return conversation.status === activeTab;
    });

    const getSortTimestamp = (conversation: Conversation) => {
      if (typeof conversation.timestamp === 'number') {
        return conversation.timestamp;
      }
      const activityTime = Date.parse(conversation.last_activity_at || '');
      if (!Number.isNaN(activityTime)) {
        return activityTime;
      }
      const updatedTime = Date.parse(conversation.updated_at || '');
      if (!Number.isNaN(updatedTime)) {
        return updatedTime;
      }
      const createdTime = Date.parse(conversation.created_at || '');
      if (!Number.isNaN(createdTime)) {
        return createdTime;
      }
      return 0;
    };

    return [...filtered].sort((a, b) => {
      const aPinned = Boolean(a.custom_attributes?.pinned);
      const bPinned = Boolean(b.custom_attributes?.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      return getSortTimestamp(b) - getSortTimestamp(a);
    });
  }, [conversations.state.conversations, activeTab]);

  const stripHtml = (html: string): string => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
  };

  const getLastMessage = (conversation: Conversation) => {
    const msg = conversation.last_non_activity_message;
    const rawText = stripHtml(msg?.processed_message_content || msg?.content || '');
    // Media-only messages come with empty content; surface a typed placeholder.
    // Prefer the attachment file_type; fall back to backend-tagged media_type.
    const firstAttachmentType = msg?.attachments?.[0]?.file_type;
    const fallbackMediaType = mediaTypeFromAttributes(msg?.content_attributes);
    const cleanContent =
      rawText ||
      (firstAttachmentType ? attachmentLabel(firstAttachmentType) : '') ||
      (fallbackMediaType ? attachmentLabel(fallbackMediaType) : '');
    // Group conversations: prepend the participant who actually spoke.
    const senderName =
      msg && msg.message_type === 'incoming'
        ? senderNameFromAttributes(msg.content_attributes)
        : undefined;
    const preview = senderName ? `${senderName}: ${cleanContent}` : cleanContent;
    return preview.length > 60 ? preview.substring(0, 60) + '...' : preview;
  };

  // Render conversation context menu
  const renderConversationContextMenu = (conversation: Conversation, children: React.ReactNode) => {
    const currentStatus = conversation.status;
    const hasUnreadMessages =
      (conversations.getUnreadCount(conversation.id) ?? conversation.unread_count ?? 0) > 0;
    const isPinned = Boolean(conversation.custom_attributes?.pinned);
    const isArchived = Boolean(conversation.custom_attributes?.archived);

    return (
      <ContextMenu key={conversation.id}>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {/* Read/Unread Actions */}
          {hasUnreadMessages ? (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsRead(conversation);
              }}
              className="flex items-center gap-2"
            >
              <MailOpen className="h-4 w-4" />
              {t('chatHeader.actions.markAsRead')}
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsUnread(conversation);
              }}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {t('chatHeader.actions.markAsUnread')}
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          {/* Status Actions */}
          {currentStatus !== 'open' && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsOpen(conversation);
              }}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {t('chatHeader.actions.markAsOpen')}
            </ContextMenuItem>
          )}

          {currentStatus !== 'resolved' && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsResolved(conversation);
              }}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {t('chatHeader.actions.markAsResolved')}
            </ContextMenuItem>
          )}

          {currentStatus !== 'pending' && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onPostpone(conversation);
              }}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {t('chatHeader.actions.markAsPending')}
            </ContextMenuItem>
          )}

          {currentStatus !== 'snoozed' && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onMarkAsSnoozed(conversation);
              }}
              className="flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              {t('chatHeader.actions.pauseConversation')}
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          {/* Priority Actions */}
          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onSetPriority(conversation, 'urgent');
            }}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-red-600" />
            {t('chatHeader.actions.priorityUrgent')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onSetPriority(conversation, 'high');
            }}
            className="flex items-center gap-2"
          >
            <ArrowUp className="h-4 w-4 text-orange-600" />
            {t('chatHeader.actions.priorityHigh')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onSetPriority(conversation, 'medium');
            }}
            className="flex items-center gap-2"
          >
            <Minus className="h-4 w-4 text-blue-600" />
            {t('chatHeader.actions.priorityMedium')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onSetPriority(conversation, 'low');
            }}
            className="flex items-center gap-2"
          >
            <ArrowDown className="h-4 w-4 text-gray-600" />
            {t('chatHeader.actions.priorityLow')}
          </ContextMenuItem>

          {conversation.priority && (
            <ContextMenuItem
              onClick={e => {
                e.stopPropagation();
                onSetPriority(conversation, null);
              }}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              {t('chatHeader.actions.removePriority')}
            </ContextMenuItem>
          )}

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              if (isPinned) {
                onUnpinConversation(conversation);
              } else {
                onPinConversation(conversation);
              }
            }}
            className="flex items-center gap-2"
          >
            <Pin className="h-4 w-4" />
            {isPinned
              ? t('chatHeader.actions.unpinConversation')
              : t('chatHeader.actions.pinConversation')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              if (isArchived) {
                onUnarchiveConversation(conversation);
              } else {
                onArchiveConversation(conversation);
              }
            }}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {isArchived
              ? t('chatHeader.actions.unarchiveConversation')
              : t('chatHeader.actions.archiveConversation')}
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onAssignAgent(conversation);
            }}
            className="flex items-center gap-2"
          >
            <UserIcon className="h-4 w-4" />
            {t('chatHeader.actions.assignAgent')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onAssignTeam(conversation);
            }}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            {t('chatHeader.actions.assignTeam')}
          </ContextMenuItem>

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onAssignTag(conversation);
            }}
            className="flex items-center gap-2"
          >
            <Tag className="h-4 w-4" />
            {t('chatHeader.actions.assignTag')}
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuItem
            onClick={e => {
              e.stopPropagation();
              onDeleteConversation(conversation);
            }}
            className="flex items-center gap-2"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t('chatHeader.actions.deleteConversation')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div
      data-tour="chat-sidebar"
      className={`
        ${mobileView === 'list' ? 'flex' : 'hidden'} md:flex
        w-full md:w-80 border-r bg-card/50 flex-col h-full
      `}
    >
      {/* Search and Filter Header */}
      <div className="p-4 border-b space-y-3">
        {/* Search */}
        <div className="relative" data-tour="chat-search">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder={t('chatSidebar.searchPlaceholder')}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={handleSearchFocus}
            className="pl-10"
          />
          <GlobalSearchPanel
            isOpen={isSearchPanelOpen && searchInput.trim().length > 0}
            searchTerm={debouncedSearchTerm}
            rawInputValue={searchInput}
            onClose={() => setIsSearchPanelOpen(false)}
            onSelectConversation={handleSelectConversation}
            onSelectContact={handleSelectContact}
            onSelectMessage={handleSelectMessage}
          />
        </div>

  const [tabCounts, setTabCounts] = useState({ open: 0, pending: 0, resolved: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [openRes, pendingRes, resolvedRes] = await Promise.all([
          api.get('/conversations/meta', { params: { status: 'open' } }),
          api.get('/conversations/meta', { params: { status: 'pending' } }),
          api.get('/conversations/meta', { params: { status: 'resolved' } })
        ]);
        
        setTabCounts({
          open: openRes.data?.data?.count || openRes.data?.meta?.total_count || 0,
          pending: pendingRes.data?.data?.count || pendingRes.data?.meta?.total_count || 0,
          resolved: resolvedRes.data?.data?.count || resolvedRes.data?.meta?.total_count || 0
        });
      } catch (err) {
        console.error('Failed to fetch conversation counts:', err);
      }
    };
    
    fetchCounts();
    // Re-fetch when conversations change (like when one is resolved or new one arrives)
  }, [conversations.state.conversations]);

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={activeTab === 'open' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 cursor-pointer"
            aria-pressed={activeTab === 'open'}
            onClick={() => setActiveTab('open')}
          >
            Atendendo {tabCounts.open > 0 ? `(${tabCounts.open})` : ''}
          </Button>
          <Button
            type="button"
            variant={activeTab === 'pending' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 cursor-pointer"
            aria-pressed={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
          >
            Aguardando {tabCounts.pending > 0 ? `(${tabCounts.pending})` : ''}
          </Button>
          <Button
            type="button"
            variant={activeTab === 'resolved' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 cursor-pointer"
            aria-pressed={activeTab === 'resolved'}
            onClick={() => setActiveTab('resolved')}
          >
            Fechados {tabCounts.resolved > 0 ? `(${tabCounts.resolved})` : ''}
          </Button>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {visibleConversations.length}{' '}
            {visibleConversations.length === 1
              ? t('chatSidebar.conversation')
              : t('chatSidebar.conversations')}
          </span>
          <div className="flex items-center gap-2">
            {/* Indicador de filtros ativos */}
            {filters.state.activeFilters.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filters.state.activeFilters.length}{' '}
                {filters.state.activeFilters.length === 1
                  ? t('chatSidebar.filter')
                  : t('chatSidebar.filters')}
              </Badge>
            )}

            {/* Botão de filtros */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterModalOpen(true)}
              disabled={filters.state.isApplyingFilters}
              className="h-8 px-2 cursor-pointer"
              data-tour="chat-filter-button"
            >
              <Filter className="h-4 w-4" />
              {t('chatSidebar.filtersButton')}
            </Button>
          </div>
        </div>
        {activeTab === 'resolved' && (
          <p className="text-xs text-muted-foreground">Mostrando conversas fechadas.</p>
        )}
      </div>

      {/* Conversations List */}
      <div
        ref={sidebarScrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleSidebarScroll}
        data-tour="chat-conversations-list"
      >
        {!conversations ? (
          <ConversationSkeleton count={8} />
        ) : conversations.state.conversationsLoading || filters.state.isApplyingFilters ? (
          <ConversationSkeleton count={8} />
        ) : conversations.state.conversationsError ? (
          <div className="p-4 text-center">
            <div className="text-destructive mb-2">{t('chatSidebar.errors.loadConversations')}</div>
            <p className="text-sm text-muted-foreground mb-4">
              {conversations.state.conversationsError}
            </p>
            <Button variant="outline" size="sm" onClick={() => conversations.loadConversations({})}>
              {t('chatSidebar.errors.tryAgain')}
            </Button>
          </div>
        ) : visibleConversations.length === 0 ? (
          <div className="p-4 text-center">
            {searchInput ? (
              <NoConversations
                searchTerm={searchInput}
                onCreateNew={() => console.log('Create new conversation')}
              />
            ) : (
              <div className="py-8">
                <div className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {activeTab === 'resolved'
                    ? t('chatSidebar.emptyArchived.title')
                    : activeTab === 'pending'
                    ? 'Nenhuma conversa aguardando'
                    : t('chatSidebar.empty.title')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'resolved'
                    ? t('chatSidebar.emptyArchived.description')
                    : activeTab === 'pending'
                    ? 'Não há conversas com status pendente no momento.'
                    : t('chatSidebar.empty.description')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {visibleConversations.map((conversation: Conversation) => {
              const isSelected =
                String(conversations.state.selectedConversationId) === String(conversation.id);

              // Usar channel da conversa diretamente, com fallback para inbox
              const channelType =
                conversation.inbox?.channel_type || conversation.inbox?.channel_type;
              const channelProvider = conversation.inbox?.provider;

              return renderConversationContextMenu(
                conversation,
                <div
                  key={conversation.id}
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'border-b border-border/50'
                  }`}
                  onClick={() => onConversationSelect(conversation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <ContactAvatar
                        contact={conversation.contact}
                        channelType={channelType}
                        channelProvider={channelProvider}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {conversation.contact?.name || t('chatSidebar.contactNoName')}
                            </p>
                            {Boolean(conversation.custom_attributes?.pinned) && (
                              <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            )}
                            {/* ðŸ“Œ Indicador de Post do Facebook */}
                            {conversation.additional_attributes?.conversation_type === 'post' && (
                              <Badge
                                variant="outline"
                                className="h-4 px-1.5 text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700 flex-shrink-0"
                                title="Facebook Post"
                              >
                                <FileText className="h-2.5 w-2.5 mr-0.5" />
                                Post
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {/* Timestamp */}
                            <span
                              className="text-xs text-muted-foreground"
                              title={formatDetailedTime(conversation.timestamp)}
                            >
                              {formatConversationTime(conversation.timestamp)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground truncate">
                          {getLastMessage(conversation)}
                        </p>

                        {/* Badges da conversa */}
                        <ConversationBadges conversation={conversation} maxLabels={2} />

                        {/* Assignee indicator badge */}
                        {conversation?.assignee && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 dark:bg-primary/20">
                              <UserIcon className="h-3 w-3 flex-shrink-0 text-primary dark:text-primary" />
                              <span
                                className="truncate max-w-32 text-primary dark:text-primary/90"
                                title={conversation.assignee?.name}
                              >
                                {conversation.assignee?.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {(() => {
                        // ðŸ”µ INDICADOR PADRÃƒO: Bolinha pequena seguindo padrÃ£o do sistema
                        const hasUnreadMessages =
                          (conversations.getUnreadCount(conversation.id) || 0) > 0;

                        return hasUnreadMessages ? (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>,
              );
            })}

            {isLoadingMoreConversations && (
              <div className="border-t border-border/40">
                <ConversationSkeleton count={1} />
              </div>
            )}

            {!isLoadingMoreConversations && hasNextPage && (
              <div className="p-3 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleLoadMoreClick}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Conversations Filter Modal */}
      <ConversationsFilter
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={conversationFilters}
        onFiltersChange={setConversationFilters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
};

export default ChatSidebar;



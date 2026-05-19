import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Checkbox } from '@evoapi/design-system/checkbox';
import { Input } from '@evoapi/design-system/input';
import { Badge } from '@evoapi/design-system/badge';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuLabel,
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
  GitBranch,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { Conversation, ConversationFilter } from '@/types/chat/api';
import type { Pipeline, PipelineStage } from '@/types/analytics';
import {
  attachmentLabel,
  mediaTypeFromAttributes,
  senderNameFromAttributes,
} from '@/utils/chat/mediaLabels';
import { formatConversationTime, formatDetailedTime } from '@/utils/time/timeHelpers';
import { isPhoneBearingChannel } from '@/utils/channelUtils';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import { ConversationSkeleton } from '../loading-states';
import { NoConversations } from '../empty-states';
import ContactAvatar from '../contact/ContactAvatar';
import ConversationBadges from '../conversation/ConversationBadges';
import ConversationsFilter from '../conversation/ConversationsFilter';
import ConversationActionsDropdown from '../conversation/ConversationActionsDropdown';
import GlobalSearchPanel from '../search/GlobalSearchPanel';
import { BaseFilter } from '@/types/core';
import { useLanguage } from '@/hooks/useLanguage';
import { useDebounce } from '@/hooks/useDebounce';
import chatService from '@/services/chat/chatService';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { toast } from 'sonner';
import type {
  SearchConversationResult,
  SearchContactResult,
  SearchMessageResult,
} from '@/types/chat/search';
import { findItemInPipeline } from '@/utils/chat/pipelineUtils';

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
  selectedConversationIds: Set<string>;
  onToggleSelect: (displayId: string) => void;
  onClearSelection: () => void;
  onBulkResolve: () => Promise<void>;
  isBulkResolving?: boolean;
  canBulkResolve?: boolean;
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
  selectedConversationIds,
  onToggleSelect,
  onClearSelection,
  onBulkResolve,
  isBulkResolving = false,
  canBulkResolve = true,
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
  const [showArchived, setShowArchived] = useState(false);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    onClearSelection();
  }, [showArchived, onClearSelection]);

  // Pipeline state
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [isPipelinesLoaded, setIsPipelinesLoaded] = useState(false);
  const [pipelinesLoadFailed, setPipelinesLoadFailed] = useState(false);
  const [convPipelineStates, setConvPipelineStates] = useState<Map<string, Pipeline[]>>(new Map());
  const [loadingConvPipelines, setLoadingConvPipelines] = useState<Set<string>>(new Set());
  const pipelineFetchCountRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await pipelinesService.getPipelines({ is_active: true });
        if (!cancelled) {
          setAllPipelines(resp.data ?? []);
          setIsPipelinesLoaded(true);
        }
      } catch {
        if (!cancelled) setPipelinesLoadFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadConversationPipelineState = useCallback(async (convId: string) => {
    const current = pipelineFetchCountRef.current.get(convId) ?? 0;
    const fetchId = current + 1;
    pipelineFetchCountRef.current.set(convId, fetchId);

    setLoadingConvPipelines(prev => new Set([...prev, convId]));
    try {
      const pipelines = await pipelinesService.getPipelinesByConversation(convId);
      if (pipelineFetchCountRef.current.get(convId) !== fetchId) return;
      setConvPipelineStates(prev => {
        const next = new Map(prev);
        next.set(convId, pipelines);
        return next;
      });
    } catch {
      if (pipelineFetchCountRef.current.get(convId) === fetchId) {
        setConvPipelineStates(prev => {
          const next = new Map(prev);
          next.set(convId, []);
          return next;
        });
      }
    } finally {
      if (pipelineFetchCountRef.current.get(convId) === fetchId) {
        setLoadingConvPipelines(prev => {
          const next = new Set(prev);
          next.delete(convId);
          return next;
        });
      }
    }
  }, []);

  const refreshConversationBadge = useCallback(async (convId: string) => {
    try {
      const raw = await chatService.getConversation(convId);
      const envelope = raw as unknown as { data?: Conversation } | null;
      const updated: Conversation | null = envelope?.data ?? (raw as unknown as Conversation);
      if (updated) {
        chatContext.conversations.updateConversation(updated);
      }
    } catch {
      // badge refresh is best-effort
    }
  }, [chatContext]);

  const handlePipelineStageSelect = useCallback(
    async (conversation: Conversation, pipeline: Pipeline, stage: PipelineStage) => {
      const convId = String(conversation.id);
      const currentPipelines = convPipelineStates.get(convId) ?? [];
      const existingInSamePipeline = currentPipelines.find(p => p.id === pipeline.id);
      const existingInOtherPipelines = currentPipelines.filter(p => p.id !== pipeline.id);

      if (existingInSamePipeline) {
        const item = findItemInPipeline(existingInSamePipeline, convId);
        const itemId = item?.id;
        if (!itemId) { toast.error(t('pipeline.moveError')); return; }
        try {
          await pipelinesService.moveItem({
            pipeline_id: pipeline.id,
            item_id: itemId,
            from_stage_id: item.stage_id,
            to_stage_id: stage.id,
          });
          toast.success(t('pipeline.moveSuccess'));
          setConvPipelineStates(prev => {
            const next = new Map(prev);
            next.delete(convId);
            return next;
          });
          await Promise.all([
            loadConversationPipelineState(convId),
            refreshConversationBadge(convId),
          ]);
        } catch {
          toast.error(t('pipeline.moveError'));
        }
      } else {
        if (existingInOtherPipelines.length > 0) {
          const removeResults = await Promise.allSettled(
            existingInOtherPipelines.map(p => {
              const item = findItemInPipeline(p, convId);
              return item?.id
                ? pipelinesService.removeItemFromPipeline(p.id, item.id)
                : Promise.resolve();
            }),
          );
          if (removeResults.some(r => r.status === 'rejected')) {
            toast.error(t('pipeline.removeError'));
            void loadConversationPipelineState(convId);
            return;
          }
        }
        try {
          await pipelinesService.addItemToPipeline(pipeline.id, {
            item_id: convId,
            type: 'conversation',
            pipeline_stage_id: stage.id,
          });
          toast.success(t('pipeline.addSuccess'));
          setConvPipelineStates(prev => {
            const next = new Map(prev);
            next.delete(convId);
            return next;
          });
          await Promise.all([
            loadConversationPipelineState(convId),
            refreshConversationBadge(convId),
          ]);
        } catch {
          toast.error(t('pipeline.addError'));
        }
      }
    },
    [convPipelineStates, t, loadConversationPipelineState, refreshConversationBadge],
  );

  const handleRemoveFromPipeline = useCallback(
    async (conversation: Conversation, pipeline: Pipeline) => {
      const convId = String(conversation.id);
      const item = findItemInPipeline(pipeline, convId);
      const itemId = item?.id;
      if (!itemId) { toast.error(t('pipeline.removeError')); return; }
      try {
        await pipelinesService.removeItemFromPipeline(pipeline.id, itemId);
        toast.success(t('pipeline.removeSuccess'));
        setConvPipelineStates(prev => {
          const next = new Map(prev);
          next.delete(convId);
          return next;
        });
        await Promise.all([
          loadConversationPipelineState(convId),
          refreshConversationBadge(convId),
        ]);
      } catch {
        toast.error(t('pipeline.removeError'));
      }
    },
    [t, loadConversationPipelineState, refreshConversationBadge],
  );

  const renderPipelineSubContent = useCallback(
    (conversation: Conversation) => {
      if (pipelinesLoadFailed) {
        return (
          <ContextMenuLabel
            className="text-destructive text-xs cursor-pointer"
            onClick={async () => {
              setPipelinesLoadFailed(false);
              try {
                const resp = await pipelinesService.getPipelines({ is_active: true });
                setAllPipelines(resp.data ?? []);
                setIsPipelinesLoaded(true);
              } catch {
                setPipelinesLoadFailed(true);
              }
            }}
          >
            {t('pipeline.loadError')}
          </ContextMenuLabel>
        );
      }

      if (!isPipelinesLoaded) {
        return <ContextMenuLabel className="text-xs">{t('pipeline.loading')}</ContextMenuLabel>;
      }

      if (allPipelines.length === 0) {
        return (
          <ContextMenuLabel className="text-xs">{t('pipeline.noPipelines')}</ContextMenuLabel>
        );
      }

      const convId = String(conversation.id);
      const isConvLoading = loadingConvPipelines.has(convId);
      const currentPipelines = convPipelineStates.get(convId) ?? [];

      return (
        <>
          {allPipelines.map(pipeline => {
            const convInThisPipeline = currentPipelines.find(p => p.id === pipeline.id);
            const currentItem = convInThisPipeline
              ? findItemInPipeline(convInThisPipeline, convId)
              : undefined;
            return (
              <ContextMenuSub key={pipeline.id}>
                <ContextMenuSubTrigger className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  {pipeline.name}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {isConvLoading ? (
                    <ContextMenuLabel className="text-xs">{t('pipeline.loading')}</ContextMenuLabel>
                  ) : (
                    <>
                      {(pipeline.stages ?? []).map(stage => {
                        const isCurrentStage = currentItem?.stage_id === stage.id;

                        return (
                          <ContextMenuItem
                            key={stage.id}
                            onClick={e => {
                              e.stopPropagation();
                              handlePipelineStageSelect(conversation, pipeline, stage);
                            }}
                            className="flex items-center gap-2"
                          >
                            {isCurrentStage && <Check className="h-3 w-3 text-primary" />}
                            {!isCurrentStage && <span className="w-3" />}
                            {stage.name}
                          </ContextMenuItem>
                        );
                      })}
                      {convInThisPipeline && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveFromPipeline(conversation, convInThisPipeline);
                            }}
                            className="flex items-center gap-2 text-destructive focus:text-destructive"
                          >
                            <X className="h-4 w-4" />
                            {t('pipeline.removeFrom')}
                          </ContextMenuItem>
                        </>
                      )}
                    </>
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
            );
          })}
        </>
      );
    },
    [
      pipelinesLoadFailed,
      isPipelinesLoaded,
      allPipelines,
      convPipelineStates,
      loadingConvPipelines,
      t,
      handlePipelineStageSelect,
      handleRemoveFromPipeline,
    ],
  );

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

    // Save scroll position before loading — the re-sort in visibleConversations
    // causes a DOM restructure that resets scrollTop to 0.
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;

    try {
      await conversations.loadMoreConversations();
    } finally {
      setIsLoadingMoreConversations(false);
      loadingMoreRef.current = false;

      // Restore scroll position after React re-renders the appended list
      requestAnimationFrame(() => {
        if (sidebarScrollRef.current) {
          const newScrollHeight = sidebarScrollRef.current.scrollHeight;
          sidebarScrollRef.current.scrollTop = scrollTop + (newScrollHeight - scrollHeight);
        }
      });
    }
  }, [conversations]);

  const handleLoadMoreClick = useCallback(async () => {
    if (loadingMoreRef.current || isLoadingMoreConversations || !hasNextPage) return;

    const container = sidebarScrollRef.current;
    const savedScrollTop = container?.scrollTop ?? 0;
    const savedScrollHeight = container?.scrollHeight ?? 0;

    loadingMoreRef.current = true;
    setIsLoadingMoreConversations(true);
    try {
      await conversations.loadMoreConversations();
    } finally {
      setIsLoadingMoreConversations(false);
      loadingMoreRef.current = false;

      requestAnimationFrame(() => {
        if (sidebarScrollRef.current) {
          const newScrollHeight = sidebarScrollRef.current.scrollHeight;
          sidebarScrollRef.current.scrollTop = savedScrollTop + (newScrollHeight - savedScrollHeight);
        }
      });
    }
  }, [conversations, hasNextPage, isLoadingMoreConversations]);

  const visibleConversations = useMemo(() => {
    const filtered = conversations.state.conversations.filter(conversation => {
      const isArchived = Boolean(conversation.custom_attributes?.archived);
      return showArchived ? isArchived : !isArchived;
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
  }, [conversations.state.conversations, showArchived]);

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
      <ContextMenu
        key={conversation.id}
        onOpenChange={open => {
          if (open) loadConversationPipelineState(String(conversation.id));
        }}
      >
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

          {/* Pipeline Actions */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              {t('pipeline.addTo')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {renderPipelineSubContent(conversation)}
            </ContextMenuSubContent>
          </ContextMenuSub>

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
        w-full ${selectedConversationIds.size > 0 ? 'md:w-96' : 'md:w-80'} border-r bg-card/50 flex-col h-full
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showArchived ? 'ghost' : 'secondary'}
            size="sm"
            className="h-8 cursor-pointer"
            aria-pressed={!showArchived}
            onClick={() => setShowArchived(false)}
          >
            {t('chatSidebar.view.active')}
          </Button>
          <Button
            type="button"
            variant={showArchived ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 cursor-pointer"
            aria-pressed={showArchived}
            onClick={() => setShowArchived(true)}
          >
            {t('chatSidebar.view.archived')}
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
        {showArchived && (
          <p className="text-xs text-muted-foreground">{t('chatSidebar.archivedNotice')}</p>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      {selectedConversationIds.size > 0 && (
        <div className="px-3 py-2 border-b bg-primary/5 flex flex-col gap-1.5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {t('chatSidebar.selectedCount', { count: selectedConversationIds.size })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 cursor-pointer"
              onClick={onClearSelection}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            size="sm"
            className="h-7 w-full cursor-pointer"
            onClick={onBulkResolve}
            disabled={isBulkResolving || !canBulkResolve}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            {t('chatHeader.actions.markAsResolved')}
          </Button>
        </div>
      )}

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
                  {showArchived
                    ? t('chatSidebar.emptyArchived.title')
                    : t('chatSidebar.empty.title')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {showArchived
                    ? t('chatSidebar.emptyArchived.description')
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
              const phoneDisplay = isPhoneBearingChannel(channelType)
                ? formatContactPhone(conversation.contact?.phone_number)
                : null;

              return renderConversationContextMenu(
                conversation,
                <div
                  key={conversation.id}
                  className={`group p-4 hover:bg-accent cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'border-b border-border/50'
                  }`}
                  onClick={() => onConversationSelect(conversation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className="mt-1 flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedConversationIds.has(String(conversation.display_id))}
                          onCheckedChange={(checked: boolean | 'indeterminate') => {
                            const isSelected = selectedConversationIds.has(String(conversation.display_id));
                            if ((checked === true && !isSelected) || (checked === false && isSelected)) {
                              onToggleSelect(String(conversation.display_id));
                            }
                          }}
                          aria-label={t('chatSidebar.selectConversation')}
                          className="bg-white dark:bg-zinc-700 border-2 border-zinc-400 dark:border-zinc-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
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
                            {/* ðŸ"Œ Indicador de Post do Facebook */}
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

                        {phoneDisplay && (
                          <p
                            className="text-xs text-muted-foreground truncate"
                            title={t('chatSidebar.phoneNumber')}
                            aria-label={`${t('chatSidebar.phoneNumber')}: ${phoneDisplay}`}
                          >
                            {phoneDisplay}
                          </p>
                        )}

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
                    <div
                      className="flex flex-col items-end gap-1 flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <ConversationActionsDropdown
                        conversation={conversation}
                        allPipelines={allPipelines}
                        pipelinesForConversation={convPipelineStates.get(String(conversation.id)) ?? []}
                        pipelinesLoadFailed={pipelinesLoadFailed}
                        isLoadingPipelines={loadingConvPipelines.has(String(conversation.id))}
                        onPipelineStageSelect={(pipeline, stage) =>
                          handlePipelineStageSelect(conversation, pipeline, stage)
                        }
                        onRemoveFromPipeline={pipeline =>
                          handleRemoveFromPipeline(conversation, pipeline)
                        }
                        onDropdownOpen={() =>
                          loadConversationPipelineState(String(conversation.id))
                        }
                        onRetryLoadPipelines={async () => {
                          setPipelinesLoadFailed(false);
                          try {
                            const resp = await pipelinesService.getPipelines({ is_active: true });
                            setAllPipelines(resp.data ?? []);
                            setIsPipelinesLoaded(true);
                          } catch {
                            setPipelinesLoadFailed(true);
                          }
                        }}
                        onMarkAsRead={() => onMarkAsRead(conversation)}
                        onMarkAsUnread={() => onMarkAsUnread(conversation)}
                        onAssignAgent={() => onAssignAgent(conversation)}
                        onAssignTeam={() => onAssignTeam(conversation)}
                        onAssignTag={() => onAssignTag(conversation)}
                        onDeleteConversation={() => onDeleteConversation(conversation)}
                      />
                      </div>
                      {(conversations.getUnreadCount(conversation.id) || 0) > 0 && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
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

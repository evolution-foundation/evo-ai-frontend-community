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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@evoapi/design-system/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@evoapi/design-system/alert-dialog';
import {
  Search,
  Filter,
  Mail,
  MailOpen,
  MoreVertical,
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
  ArrowLeft,
  GitBranch,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { usePermissions } from '@/contexts/PermissionsContext';
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
import { findItemInPipeline } from '@/utils/chat/pipelineUtils';
import { UnreadBadge } from '@/components/shared';
import { ConversationSkeleton } from '../loading-states';
import { NoConversations } from '../empty-states';
import ContactAvatar from '../contact/ContactAvatar';
import ConversationBadges from '../conversation/ConversationBadges';
import ConversationsFilter from '../conversation/ConversationsFilter';
import ConversationSegments from './ConversationSegments';
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
  // Status em lote (resolver/reabrir/pendente) usa o endpoint dedicado
  // /bulk_actions (1 request, 1 toast, reconcilia via reloadCurrentFilters).
  // NÃO tem undo: mudar status é deliberado e dispara automações/webhooks/
  // atividade no backend.
  onBulkSetStatus: (status: 'open' | 'pending' | 'resolved') => Promise<void>;
  isBulkUpdatingStatus?: boolean;
  canBulkUpdateStatus?: boolean;
}

// Prefetch the next page well before the user reaches the end so the loading
// state is not perceived while scrolling. Anticipated by ~2.5 viewport heights
// (EVO-1672: 1.5 was outrun by fast scrolling / slow connections), with a
// floor for short viewports. loadMore stays sequential via loadingMoreRef.
const PREFETCH_VIEWPORT_FACTOR = 2.5;
const MIN_PREFETCH_DISTANCE_PX = 1000;

// Atributos que são SÓ navegação por chip (Não lidas / Grupos) e NÃO existem no
// catálogo do modal avançado (CONVERSATION_FILTER_TYPES). Precisam ser excluídos
// do sync activeFilters -> modal, senão o modal renderiza uma linha quebrada
// (dropdowns em branco) ao abrir com um desses ativos.
const CHIP_ONLY_FILTER_KEYS = ['unread', 'is_group'];

// Eixos que são navegação por chip (status + unread + is_group) — não contam
// como "filtro avançado aplicado" no badge "N filtros".
const CHIP_NAV_KEYS = ['status', ...CHIP_ONLY_FILTER_KEYS];

// Snapshot mínimo p/ o undo das ações SEM efeito colateral no backend (ler/
// não-ler). Capturado ANTES de aplicar — o store muta a conversa em seguida,
// então guardamos só os primitivos (id + estado de leitura anterior).
interface BulkSnapshot {
  id: string;
  wasUnread: boolean;
}

// Converte um ConversationFilter (estado global) para o BaseFilter do modal
// avançado. Usado no sync activeFilters->modal e ao remesclar a navegação por
// chip no apply do modal.
const conversationFilterToBaseFilter = (f: ConversationFilter): BaseFilter => ({
  attributeKey: f.attribute_key,
  filterOperator: f.filter_operator,
  values: Array.isArray(f.values) ? f.values.join(',') : String(f.values[0] || ''),
  queryOperator: f.query_operator,
  attributeModel: 'standard' as const,
});

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
  onBulkSetStatus,
  isBulkUpdatingStatus = false,
  canBulkUpdateStatus = true,
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
        total?: number;
      } | null;
    };
    getUnreadCount: (conversationId: string) => number;
    loadConversations: (params?: unknown) => Promise<void>;
    loadMoreConversations: () => Promise<void>;
  };
  const filters = chatContext.filters;
  const { can } = usePermissions();
  const [conversationFilters, setConversationFilters] = useState<BaseFilter[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // Modo de seleção em lote: default OFF (lista limpa, sem checkbox). O botão
  // "Selecionar" liga; "Concluir" desliga. Só nesse modo os checkboxes aparecem
  // e o click na row alterna seleção (em vez de abrir a conversa).
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const lastScrollTimeRef = useRef<number>(0);

  useEffect(() => {
    onClearSelection();
    setSelectionMode(false);
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
      const samePipeline = currentPipelines.find(p => p.id === pipeline.id);
      const existingInOtherPipelines = currentPipelines.filter(p => p.id !== pipeline.id);
      // MOVER vs ADICIONAR é decidido por ITEM ATIVO encontrável, NÃO por presença
      // do pipeline: um pipeline com jornada COMPLETED ainda volta em by_conversation
      // (que não filtra completed_at) mas sem item ativo no serializer → o branch
      // antigo (`if pipeline presente`) caía no MOVER e morria em moveError. A
      // reentrada em pipeline com jornada concluída (o backend permite) tem que
      // cair no ADICIONAR.
      const existingItem = samePipeline ? findItemInPipeline(samePipeline, convId) : undefined;

      if (existingItem?.id) {
        try {
          await pipelinesService.moveItem({
            pipeline_id: pipeline.id,
            item_id: existingItem.id,
            from_stage_id: existingItem.stage_id,
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
      // O `pipeline` vem do allPipelines (estrutura global, SEM o item desta
      // conversa). O item vive na state por-conversa (convPipelineStates, do
      // by_conversation) — buscar lá, senão findItemInPipeline volta undefined e
      // dá removeError mesmo com a conversa no pipeline. (Mesma fonte que o assign.)
      const currentPipelines = convPipelineStates.get(convId) ?? [];
      const statePipeline = currentPipelines.find(p => p.id === pipeline.id);
      const item = statePipeline ? findItemInPipeline(statePipeline, convId) : undefined;
      const itemId = item?.id;
      if (!itemId) {
        toast.error(t('pipeline.removeError'));
        return;
      }
      try {
        await pipelinesService.removeItemFromPipeline(pipeline.id, itemId);
        toast.success(t('pipeline.removeSuccess'));
        // Update otimista LOCAL — remover é determinístico, então evitamos o
        // refetch pesado do by_conversation (payload gigante: conversa+contato+
        // mensagens+tasks por item) que deixava uma requisição em pending. Tira o
        // pipeline da state por-conversa (checkmark do submenu) e do badge
        // (conversation.pipelines). Reload real acontece ao reabrir o menu.
        setConvPipelineStates(prev => {
          const next = new Map(prev);
          next.set(convId, (next.get(convId) ?? []).filter(p => p.id !== pipeline.id));
          return next;
        });
        // Payload MÍNIMO: UPDATE_CONVERSATION faz merge sobre a state atual, então
        // mandar só {id, pipelines} atualiza o badge sem sobrescrever campos que um
        // eco de WS concorrente possa ter mudado (não espalhar o objeto do render).
        chatContext.conversations.updateConversation({
          id: conversation.id,
          pipelines: (conversation.pipelines ?? []).filter(p => p.id !== pipeline.id),
        } as Conversation);
      } catch {
        toast.error(t('pipeline.removeError'));
      }
    },
    [t, convPipelineStates, chatContext],
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
          {allPipelines.map(pipeline => (
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
                      const convInThisPipeline = currentPipelines.find(p => p.id === pipeline.id);
                      const currentItem = convInThisPipeline
                        ? findItemInPipeline(convInThisPipeline, convId)
                        : undefined;
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
                    {currentPipelines.some(p => p.id === pipeline.id) && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveFromPipeline(conversation, pipeline);
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
          ))}
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

  // 🎯 SYNC: activeFilters (global) -> estado local do modal avançado.
  // Exclui TODA navegação por chip (status/unread/is_group): status é dirigido
  // pelos chips, não pelo modal. Sem isso o default "Ativas" (status != resolved)
  // abriria uma linha confusa no modal ("Status ... Resolved"). O apply do modal
  // remescla a navegação (handleApplyAdvancedFilters), então nada se perde.
  useEffect(() => {
    const modalFilters = filters.state.activeFilters
      .filter((f: ConversationFilter) => !CHIP_NAV_KEYS.includes(f.attribute_key))
      .map(conversationFilterToBaseFilter);

    if (JSON.stringify(conversationFilters) !== JSON.stringify(modalFilters)) {
      setConversationFilters(modalFilters);
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

  // Apply do MODAL avançado: status/unread/is_group são navegação por chip e NÃO
  // aparecem no modal. Preserva SÓ o `status` ao aplicar filtros avançados, pois é
  // a única navegação por chip que TAMBÉM é atributo válido no POST /filter.
  // unread/is_group são GET-only (CHIP_ONLY) — incluí-los no POST daria 400; são
  // descartados ao aplicar um filtro avançado (comportamento original). Se o
  // usuário adicionou o mesmo atributo no modal, o do modal vence.
  const handleApplyAdvancedFilters = async (advancedFilters: BaseFilter[]) => {
    setConversationFilters(advancedFilters);
    const advancedKeys = new Set(advancedFilters.map(f => f.attributeKey));
    const chipNav = filters.state.activeFilters
      .filter(
        (f: ConversationFilter) =>
          CHIP_NAV_KEYS.includes(f.attribute_key) &&
          !CHIP_ONLY_FILTER_KEYS.includes(f.attribute_key) &&
          !advancedKeys.has(f.attribute_key),
      )
      .map(conversationFilterToBaseFilter);
    onFilterApply([...chipNav, ...advancedFilters]);
  };

  const handleClearFilters = async () => {
    setConversationFilters([]);
    onFilterClear();
  };

  const pagination = conversations.state.conversationsPagination;
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.total_pages || 1;
  const hasNextPage = pagination?.has_next_page ?? currentPage < totalPages;

  // Os eixos de chip (status / unread / is_group) são navegação, não filtro
  // avançado — não contam no badge. Só filtros de verdade (prioridade, data,
  // label, inbox, canal…) acendem. (Estende a exclusão do EVO-1939.)
  const appliedFilterCount = filters.state.activeFilters.filter(
    f => !CHIP_NAV_KEYS.includes(f.attribute_key),
  ).length;

  const handleSidebarScroll = useCallback(async () => {
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 150) return;

    const container = sidebarScrollRef.current;
    if (!container || loadingMoreRef.current) return;

    const pagination = conversations.state.conversationsPagination;
    if (!pagination) return;

    const currentPage = pagination.page || 1;
    const totalPages = pagination.total_pages || 1;
    const hasNextPage = pagination.has_next_page ?? currentPage < totalPages;
    if (!hasNextPage) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const prefetchThreshold = Math.max(
      MIN_PREFETCH_DISTANCE_PX,
      container.clientHeight * PREFETCH_VIEWPORT_FACTOR,
    );
    if (distanceToBottom > prefetchThreshold) return;

    // Update throttle timestamp only after confirming we are near the bottom
    lastScrollTimeRef.current = now;
    loadingMoreRef.current = true;
    setIsLoadingMoreConversations(true);

    try {
      await conversations.loadMoreConversations();
    } finally {
      // EVO-1672: no forced scrollTop restore here. It compensated for the
      // full-list remount (now gone — the list stays mounted during loadMore)
      // and, with the wider prefetch, it yanked the user back to wherever the
      // trigger fired if they kept scrolling during the request. Appending
      // below the viewport does not move scrollTop natively.
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
      const isArchived = Boolean(conversation.custom_attributes?.archived);
      return showArchived ? isArchived : !isArchived;
    });

    // Ordena por last_activity_at (autoritativo: avança em status/atendente/label/
    // mensagem e é mantido em sincronia pelo WS). NÃO usa conversation.timestamp
    // como chave primária — o conversation.updated do WS o deixa defasado, e a
    // conversa não subia ("bump que não reordena"). Tudo normalizado em ms para
    // não misturar segundos (timestamp) com milissegundos (Date.parse).
    const getSortTimestamp = (conversation: Conversation): number => {
      const activityMs = Date.parse(conversation.last_activity_at || '');
      if (!Number.isNaN(activityMs)) return activityMs;
      const updatedMs = Date.parse(conversation.updated_at || '');
      if (!Number.isNaN(updatedMs)) return updatedMs;
      const createdMs = Date.parse(conversation.created_at || '');
      if (!Number.isNaN(createdMs)) return createdMs;
      if (typeof conversation.timestamp === 'number') return conversation.timestamp * 1000;
      return 0;
    };

    return [...filtered].sort((a, b) => {
      const aPinned = Boolean(a.custom_attributes?.pinned);
      const bPinned = Boolean(b.custom_attributes?.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      const diff = getSortTimestamp(b) - getSortTimestamp(a);
      if (diff !== 0) return diff;
      // Tiebreaker determinístico: evita swaps/duplicatas na borda de página
      // quando last_activity_at empata.
      return String(b.id).localeCompare(String(a.id));
    });
  }, [conversations.state.conversations, showArchived]);

  // Best-effort: contagem de arquivadas entre as conversas já carregadas.
  const archivedCount = useMemo(
    () =>
      conversations.state.conversations.filter(c => Boolean(c.custom_attributes?.archived)).length,
    [conversations.state.conversations],
  );

  // Conversas selecionadas (map display_id -> conversa) para as ações em lote.
  const selectedConversations = useMemo(
    () =>
      conversations.state.conversations.filter(c =>
        selectedConversationIds.has(String(c.display_id)),
      ),
    [conversations.state.conversations, selectedConversationIds],
  );

  const exitSelection = useCallback(() => {
    onClearSelection();
    setSelectionMode(false);
  }, [onClearSelection]);

  // Roda uma ação por-conversa em todas as selecionadas (loop no client — v1;
  // o endpoint bulk dedicado fica como otimização futura). Quando `revert` é
  // passado (só ler/não-ler, ações sem efeito colateral no backend), captura o
  // estado de leitura ANTES de aplicar e, ao final, mostra um toast "Desfazer"
  // (5s) que reaplica o inverso por conversa (cobre seleção mista). O toast e o
  // undo cobrem APENAS as conversas que a ação aplicou com sucesso. Ações sem
  // `revert` (arquivar/excluir) não mostram toast nem undo.
  const runBulk = useCallback(
    async (
      action: (conv: Conversation) => Promise<unknown>,
      revert?: (item: BulkSnapshot) => Promise<unknown>,
    ) => {
      if (selectedConversations.length === 0) return;
      const convs = selectedConversations.slice();
      // Snapshot dos primitivos que o undo precisa, antes do store mutar as rows.
      const items: BulkSnapshot[] = convs.map(c => ({
        id: c.id,
        wasUnread: (conversations.getUnreadCount(c.id) ?? c.unread_count ?? 0) > 0,
      }));
      setBulkRunning(true);
      let results: PromiseSettledResult<unknown>[] = [];
      try {
        results = await Promise.allSettled(convs.map(c => action(c)));
      } finally {
        setBulkRunning(false);
        exitSelection();
      }
      if (revert) {
        // Não oferecer undo (nem o toast de sucesso) para o que falhou.
        const applied = items.filter((_, i) => results[i]?.status === 'fulfilled');
        if (applied.length > 0) {
          toast(t('chatSidebar.bulkApplied', { count: applied.length }), {
            duration: 5000,
            action: {
              label: t('chatSidebar.undo'),
              onClick: () => {
                void Promise.allSettled(applied.map(it => revert(it)));
              },
            },
          });
        }
      }
    },
    [selectedConversations, exitSelection, conversations, t],
  );

  // Undo só dos eixos SEM efeito colateral no backend: ler/não-ler usam
  // update_column (sem automação/webhook/atividade). Restaura o estado de
  // leitura anterior de cada conversa (cobre seleção mista). Status e
  // arquivamento NÃO têm undo — re-disparariam eventos no backend.
  const revertRead = (item: BulkSnapshot) =>
    item.wasUnread
      ? conversations.markAsUnread(item.id)
      : conversations.markAsRead(item.id, { silent: true });

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
        w-full md:w-96 border-r bg-card/50 flex-col h-full
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

        {/* Segments (lab Experimento #1): WhatsApp-style primary views.
            Reversible — remove this block to restore the prior UX. */}
        {!showArchived && !selectionMode && (
          <ConversationSegments
            activeFilters={filters.state.activeFilters}
            onSelectSegment={handleApplyFilters}
            disabled={filters.state.isApplyingFilters}
          />
        )}

        {/* Ações e filtro (apenas na visão normal) */}
        {!showArchived && !selectionMode && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {(conversations.state.conversationsPagination?.total || visibleConversations.length)}{' '}
              {(conversations.state.conversationsPagination?.total || visibleConversations.length) === 1
                ? t('chatSidebar.conversation')
                : t('chatSidebar.conversations')}
            </span>
            <div className="flex items-center gap-2">
              {/* Indicador de filtros ativos (status é navegação, não conta) */}
              {appliedFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {appliedFilterCount}{' '}
                  {appliedFilterCount === 1
                    ? t('chatSidebar.filter')
                    : t('chatSidebar.filters')}
                </Badge>
              )}

              {/* Botão "Selecionar" — entra no modo de seleção em lote */}
              {!selectionMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  className="h-8 px-2 cursor-pointer"
                >
                  {t('chatSidebar.select')}
                </Button>
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
        )}

        {/* Entrada única de Arquivados (visão normal) → abre a "aba" de arquivados */}
        {!showArchived && !selectionMode && (
          <button
            type="button"
            onClick={() => {
              setShowArchived(true);
              // Busca no backend só as arquivadas (archived=true, todos os status),
              // per_page 100 (cap do backend) = carrega todas numa tacada, sem botão.
              void conversations.loadConversations({ status: 'all', archived: true, per_page: 100 });
            }}
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted cursor-pointer"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Archive className="h-4 w-4" />
              {t('chatSidebar.view.archived')}
            </span>
            {archivedCount > 0 && (
              <span className="text-xs text-muted-foreground">{archivedCount}</span>
            )}
          </button>
        )}

        {/* "Aba" de arquivados aberta → cabeçalho com voltar à visão normal */}
        {showArchived && !selectionMode && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowArchived(false);
                  // Volta pra visão normal reaplicando o filtro ativo (default/chip).
                  void filters.applyFilters(
                    filters.state.activeFilters,
                    (c, p, q) => conversations.setConversations(c, p, q),
                    () => {},
                  );
                }}
                className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('chatSidebar.view.archived')}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectionMode(true)}
                className="h-8 px-2 cursor-pointer"
              >
                {t('chatSidebar.select')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Barra de ações em lote (estilo WhatsApp: ✕ N selecionadas + kebab ⋮) */}
      {selectionMode && (
        <div className="px-3 py-2 border-b bg-muted/40 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer"
              onClick={exitSelection}
              aria-label={t('chatSidebar.doneSelection')}
            >
              <X className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium truncate">
              {t('chatSidebar.selectedCount', { count: selectedConversationIds.size })}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
                disabled={selectedConversationIds.size === 0 || bulkRunning}
                aria-label={t('chatSidebar.bulkActions')}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canBulkUpdateStatus && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={isBulkUpdatingStatus}
                    onClick={() => {
                      void onBulkSetStatus('resolved').finally(() => setSelectionMode(false));
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('chatHeader.actions.markAsResolved')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={isBulkUpdatingStatus}
                    onClick={() => {
                      void onBulkSetStatus('open').finally(() => setSelectionMode(false));
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t('chatHeader.actions.markAsOpen')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={isBulkUpdatingStatus}
                    onClick={() => {
                      void onBulkSetStatus('pending').finally(() => setSelectionMode(false));
                    }}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {t('chatHeader.actions.markAsPending')}
                  </DropdownMenuItem>
                </>
              )}
              {showArchived ? (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => void runBulk(c => conversations.unarchiveConversation(c.id))}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {t('chatHeader.actions.unarchiveConversation')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => void runBulk(c => conversations.archiveConversation(c.id))}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {t('chatHeader.actions.archiveConversation')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() =>
                  void runBulk(c => conversations.markAsRead(c.id, { silent: true }), revertRead)
                }
              >
                <MailOpen className="h-4 w-4 mr-2" />
                {t('chatHeader.actions.markAsRead')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => void runBulk(c => conversations.markAsUnread(c.id), revertRead)}
              >
                <Mail className="h-4 w-4 mr-2" />
                {t('chatHeader.actions.markAsUnread')}
              </DropdownMenuItem>
              {can('conversations', 'delete') && (
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('chatHeader.actions.deleteConversation')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Confirmação de exclusão em lote */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('chatSidebar.bulkDeleteDescription', { count: selectedConversationIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runBulk(c => conversations.deleteConversation(c.id))}>
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conversations List */}
      <div
        ref={sidebarScrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleSidebarScroll}
        data-tour="chat-conversations-list"
      >
        {!conversations ? (
          <ConversationSkeleton count={8} />
        ) : (conversations.state.conversationsLoading && visibleConversations.length === 0) ||
          filters.state.isApplyingFilters ? (
          // EVO-1672: the full-list skeleton is for the EMPTY/initial load only.
          // loadMore flips the shared conversationsLoading flag too, and swapping
          // the whole list mid-scroll loses the user's position (flicker + jump);
          // with items on screen the bottom cushion is the loading feedback.
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
              const isBulkSelected =
                selectionMode && selectedConversationIds.has(String(conversation.display_id));

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
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    isBulkSelected
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : isSelected
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'border-b border-border/50'
                  }`}
                  onClick={() =>
                    selectionMode
                      ? onToggleSelect(String(conversation.display_id))
                      : onConversationSelect(conversation)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {selectionMode && (
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
                            className="border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </div>
                      )}
                      <ContactAvatar
                        contact={conversation.contact}
                        channelType={channelType}
                        channelProvider={channelProvider}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0 mb-1">
                          <p className="font-medium truncate">
                            {conversation.contact?.name || t('chatSidebar.contactNoName')}
                          </p>
                          {Boolean(conversation.custom_attributes?.pinned) && (
                            <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
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
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                      <span
                        className="text-xs text-muted-foreground leading-none"
                        title={formatDetailedTime(conversation.timestamp)}
                      >
                        {formatConversationTime(conversation.timestamp)}
                      </span>
                      <UnreadBadge
                        count={conversations.getUnreadCount(conversation.id) || 0}
                        ariaLabel={t('unreadBadge.ariaLabel', {
                          count: conversations.getUnreadCount(conversation.id) || 0,
                        })}
                      />
                    </div>
                  </div>
                </div>,
              );
            })}

            {/* EVO-1672: proportional cushion (~half a viewport) so fast
                scroll / slow networks read as a deliberate "loading more"
                affordance instead of a blank gap with pop-in. */}
            {isLoadingMoreConversations && (
              <div className="border-t border-border/40">
                <ConversationSkeleton count={5} />
              </div>
            )}

            {!isLoadingMoreConversations && hasNextPage && !showArchived && (
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
        onApplyFilters={handleApplyAdvancedFilters}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
};

export default ChatSidebar;

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getContactColor } from '@/utils/avatar';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@evoapi/design-system';
import { Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system/popover';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ArrowUpDown,
  User,
  CalendarClock,
  AlertCircle,
  Search,
  X,
  ChevronDown,
  Check,
  CircleDot,
  Calendar,
  Lock,
  Star,
  Filter,
  ArrowLeftRight,
  MessageSquare,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

import { pipelinesService } from '@/services/pipelines';
import { useAppDataStore } from '@/store/appDataStore';
import {
  Pipeline,
  PipelineStage,
  PipelineItem,
  UpdatePipelineData,
  CreateStageData,
  DealStatusFilter,
} from '@/types/analytics';
import EditPipelineModal from '@/components/pipelines/EditPipelineModal';
import CreateStageModal from '@/components/pipelines/CreateStageModal';
import AddItemModal from '@/components/pipelines/AddItemModal';
import RemoveItemModal from '@/components/pipelines/RemoveItemModal';
import EditStageModal from '@/components/pipelines/EditStageModal';
import DeleteStageModal from '@/components/pipelines/DeleteStageModal';
import DeletePipelineModal from '@/components/pipelines/DeletePipelineModal';
import ReorderStagesModal from '@/components/pipelines/ReorderStagesModal';
import PipelineCaptureFormsModal from '@/components/pipelines/PipelineCaptureFormsModal';
import { ScheduleActionModal } from '@/components/scheduledActions';
import ConfiguredDealCard from './ConfiguredDealCard';
import CardConfigurationPanel from './CardConfigurationPanel';
import PipelineBoardLoading from './PipelineBoardLoading';
import { rememberStageCount } from './pipelineStageCount';
import { configurationFor, nativeFields, stageTotal } from './cardConfiguration';
import { invalidateDeal, prefetchDeal } from './deal/dealCache';
import { isDealTab, type DealTabId } from './deal/dealContext';
import type { Deal, DealConversationSummary } from '@/types/analytics';
import { usePermissions } from '@/contexts/PermissionsContext';

// O modal é um chunk à parte, carregado sob demanda. Guardamos o componente já resolvido em estado
// (em vez de React.lazy): lazy dentro de uma navegação seguraria a abertura por ~300 ms.
const loadConversationDrawer = () => import('./deal/DealConversationDrawer');
const loadDealModal = () => import('./deal/DealModal');
type DealModalComponent = Awaited<ReturnType<typeof loadDealModal>>['default'];

// Status/priority badge styles use the design system's semantic Tailwind classes
// (same palette Chat/Contacts use), with dark-mode variants — NOT arbitrary hex.
// Small indicator dots in the Filtros popover still use these hexes for a compact
// swatch; the cards use the class maps below.
const STATUS_HEX: Record<string, string> = {
  open: '#359558',
  pending: '#F59E0B',
  resolved: '#9aa3b2',
  snoozed: '#8B5CF6',
};
const statusColorHex = (status?: string) => STATUS_HEX[status ?? ''] ?? '#9aa3b2';

// Chatwoot priority → mockup 3-bucket key.
const priorityBucket = (priority?: string | null): string => {
  const p = (priority ?? '').toLowerCase();
  if (p === 'urgent' || p === 'high') return 'alta';
  if (p === 'medium') return 'media';
  if (p === 'low') return 'baixa';
  return '';
};
const PRIORITY_HEX: Record<string, string> = {
  alta: '#EF4444',
  media: '#F59E0B',
  baixa: '#359558',
};
export default function PipelineKanban() {
  const { t } = useLanguage('pipelines');
  const { can } = usePermissions();
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') ?? '';
  const assigneeFilter = searchParams.get('assignee') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  // Status do NEGÓCIO (aberto/ganho/perdido) vai ao servidor; padrão "aberto" não polui a URL.
  const dealStatusParam = searchParams.get('deal_status');
  const dealStatus: DealStatusFilter = dealStatusParam === 'won' || dealStatusParam === 'lost' || dealStatusParam === 'all' ? dealStatusParam : 'open';
  const setDealStatus = (next: DealStatusFilter) => setSearchParams(prev => {
    const n = new URLSearchParams(prev);
    if (next === 'open') n.delete('deal_status'); else n.set('deal_status', next);
    n.delete('deal'); n.delete('tab');
    return n;
  }, { replace: true });
  const isOpenDeal = (item: PipelineItem) => (item.deal_status ?? 'open') === 'open';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const labelFilter = searchParams.get('label') ?? '';
  const priorityFilter = searchParams.get('priority') ?? '';
  const originFilter = searchParams.get('origin') ?? '';
  const originLower = originFilter.toLowerCase();
  // Período preset bucket ('today' | '7d' | '30d' | 'month'); drives dateFrom/dateTo.
  const periodFilter = searchParams.get('period') ?? '';
  // Negócio aberto como modal sobre o quadro: ?deal=<id>&tab=<aba> (deep link e voltar do navegador)
  const dealParam = searchParams.get('deal') ?? '';
  const tabParam = searchParams.get('tab');
  const dealTab: DealTabId = isDealTab(tabParam) ? tabParam : 'activities';

  // Local state for the search input (immediate UI feedback; URL update is debounced)
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '');
  // useRef<T>() with no initial argument requires T to admit `undefined` on
  // newer @types/react. Passing `undefined` explicitly + widening the type
  // keeps the existing semantics (ref is unset until the first debounce fires).
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync input if URL changes externally (browser back/forward).
  // We compare before setting to avoid clobbering keystrokes the user just typed
  // while a debounce was still pending — those will be flushed by the timeout.
  const urlSearch = searchParams.get('search') ?? '';
  useEffect(() => {
    setSearchInput(prev => (prev === urlSearch ? prev : urlSearch));
  }, [urlSearch]);

  // Cancel any pending debounce on unmount to avoid setState on unmounted tree.
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const { agents, fetchAgents } = useAppDataStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [personalizingCards, setPersonalizingCards] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const sortKey = (searchParams.get('sort') ?? '') as '' | 'age_desc' | 'age_asc' | 'value_desc' | 'title';
  const [density, setDensityState] = useState<'comfortable' | 'compact'>(() => {
    try { return localStorage.getItem('evo.kanban.density') === 'compact' ? 'compact' : 'comfortable'; } catch { return 'comfortable'; }
  });
  const setDensity = (next: 'comfortable' | 'compact') => { setDensityState(next); try { localStorage.setItem('evo.kanban.density', next); } catch { /* ignore */ } };
  const setSort = (next: string) => setSearchParams(prev => { const n = new URLSearchParams(prev); if (next) n.set('sort', next); else n.delete('sort'); return n; }, { replace: true });
  const personalizeButtonRef = useRef<HTMLButtonElement>(null);
  const movingIds = useRef(new Set<string>());
  const touchDrag = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number; active: boolean } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
  const [draggedItem, setDraggedItem] = useState<PipelineItem | null>(null);
  const isDraggingRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  // Modal states
  const [showEditPipelineModal, setShowEditPipelineModal] = useState(false);
  const [isUpdatingPipeline, setIsUpdatingPipeline] = useState(false);
  const [showCreateStageModal, setShowCreateStageModal] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedStageForItem, setSelectedStageForItem] = useState<PipelineStage | null>(null);
  const [showRemoveItemModal, setShowRemoveItemModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<PipelineItem | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
  const [stageToEdit, setStageToEdit] = useState<PipelineStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null);
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [isDeletingStage, setIsDeletingStage] = useState(false);
  const [showDeletePipelineModal, setShowDeletePipelineModal] = useState(false);
  const [showReorderStagesModal, setShowReorderStagesModal] = useState(false);
  const [showCaptureFormsModal, setShowCaptureFormsModal] = useState(false);
  const [isDeletingPipeline, setIsDeletingPipeline] = useState(false);
  const [isReorderingStages, setIsReorderingStages] = useState(false);
  const [scheduleActionOpen, setScheduleActionOpen] = useState(false);
  const [selectedConversationForSchedule, setSelectedConversationForSchedule] =
    useState<PipelineItem | null>(null);
  const scheduleActionContactId =
    selectedConversationForSchedule?.conversation?.contact?.id ??
    selectedConversationForSchedule?.contact?.id;

  // Load pipeline data
  const [conversationPanel, setConversationPanel] = useState<{ id: string; title: string } | null>(null);
  const [DrawerComponent, setDrawerComponent] = useState<Awaited<ReturnType<typeof loadConversationDrawer>>['default'] | null>(null);
  const [editPipelineTab, setEditPipelineTab] = useState<'details' | 'whatsapp'>('details');
  const [ModalComponent, setModalComponent] = useState<DealModalComponent | null>(null);
  const ensureModal = useCallback(() => {
    void loadDealModal().then(module => setModalComponent(() => module.default)).catch(() => undefined);
  }, []);
  // Aquece o código do modal quando o quadro fica ocioso: o primeiro clique não paga o download.
  useEffect(() => {
    const timer = window.setTimeout(ensureModal, 1200);
    return () => window.clearTimeout(timer);
  }, [ensureModal]);
  useEffect(() => {
    if (dealParam) ensureModal();
  }, [dealParam, ensureModal]);
  // Ao fechar (Esc, botão, voltar do navegador) o foco volta ao título do cartão que abriu o modal.
  const lastOpenedDeal = useRef('');
  useEffect(() => {
    if (dealParam) {
      lastOpenedDeal.current = dealParam;
      return;
    }
    const id = lastOpenedDeal.current;
    lastOpenedDeal.current = '';
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>('[data-deal-id]')).find(node => node.dataset.dealId === id)?.querySelector<HTMLElement>('.deal-title');
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [dealParam]);

  const loadPipelineData = useCallback(async (background = false) => {
    if (!pipelineId) return;

    if (!background) setLoading(true);
    setLoadError(false);
    try {
      // Load pipeline with all data (stages, items, tasks_info, services_info)
      const pipelineData = await pipelinesService.getPipeline(pipelineId, dealStatus);

      setPipeline(pipelineData);
      setStages(pipelineData.stages || []);
      rememberStageCount(pipelineId, pipelineData.stages?.length ?? 0);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [pipelineId, dealStatus]);

  // Load all pipelines for selector
  const loadAllPipelines = useCallback(async () => {
    try {
      const response = await pipelinesService.getPipelines();
      const pipelinesData = response.data || [];
      setAllPipelines(pipelinesData);
    } catch (error) {
      console.error('Error loading pipelines:', error);
    }
  }, []);

  useEffect(() => {
    loadPipelineData();
    loadAllPipelines();
  }, [loadPipelineData, loadAllPipelines]);

  useEffect(() => {
    if (loading || !pipelineId || !boardScrollRef.current) return;
    const stored = sessionStorage.getItem(`pipeline-scroll:${pipelineId}`);
    if (stored) {
      boardScrollRef.current.scrollLeft = Number(stored);
      sessionStorage.removeItem(`pipeline-scroll:${pipelineId}`);
    }
  }, [loading, pipelineId]);

  // Handle pipeline change
  const handlePipelineChange = (newPipelineId: string) => {
    if (newPipelineId !== pipelineId) {
      navigate(`/pipelines/${newPipelineId}`);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (item: PipelineItem) => {
    setDraggedItem(item);
    isDraggingRef.current = true;
    suppressClickUntilRef.current = Date.now() + 200;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const board = boardScrollRef.current;
    if (board) {
      const rect = board.getBoundingClientRect();
      const delta = e.clientX < rect.left + 32 ? -16 : e.clientX > rect.right - 32 ? 16 : 0;
      if (delta) board.scrollLeft += delta;
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const item = draggedItem;
    setDraggedItem(null); setDropTarget(null); isDraggingRef.current = false;
    if (item) await moveItemToStage(item, targetStageId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
    isDraggingRef.current = false;
    suppressClickUntilRef.current = Date.now() + 200;
  };

  // Search & filter helpers
  const updateFilters = useCallback(
    (updates: {
      search?: string;
      assignee?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      label?: string;
      priority?: string;
      period?: string;
      origin?: string;
    }) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        const keys = [
          'search',
          'assignee',
          'status',
          'dateFrom',
          'dateTo',
          'label',
          'priority',
          'period',
          'origin',
        ] as const;
        for (const key of keys) {
          if (key in updates) {
            const val = updates[key as keyof typeof updates];
            if (val) next.set(key, val);
            else next.delete(key);
          }
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  // Período bucket → concrete dateFrom/dateTo (YYYY-MM-DD, local). Sets both the
  // preset key (for the UI) and the derived date range (which drives filterItems).
  const applyPeriod = useCallback(
    (bucket: string) => {
      if (!bucket) {
        updateFilters({ period: undefined, dateFrom: undefined, dateTo: undefined });
        return;
      }
      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let from = today;
      if (bucket === '7d') from = new Date(today.getTime() - 6 * 86400000);
      else if (bucket === '30d') from = new Date(today.getTime() - 29 * 86400000);
      else if (bucket === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
      updateFilters({ period: bucket, dateFrom: fmt(from), dateTo: fmt(today) });
    },
    [updateFilters],
  );

  const clearFilters = useCallback(() => {
    // Cancel any pending debounce so it doesn't resurrect the search query
    // a few hundred ms after the user clicked "clear filters".
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchInput('');
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      ['search', 'assignee', 'status', 'dateFrom', 'dateTo', 'label', 'priority', 'period', 'origin'].forEach(
        k => next.delete(k),
      );
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (value) next.set('search', value);
        else next.delete('search');
        return next;
      }, { replace: true });
    }, 250);
  }, [setSearchParams]);

  // All team agents from the store (full team, not just those with pipeline cards)
  const uniqueAssignees = useMemo(
    () => agents.map(a => ({ id: String(a.id), name: a.name, avatar_url: a.avatar_url })),
    [agents],
  );

  const filterItems = useCallback(
    (items: PipelineItem[]) => {
      const q = searchQuery.toLowerCase();
      // Parse YYYY-MM-DD as local time so the filter matches the operator's
      // calendar day. `new Date('2026-05-04')` would be interpreted as UTC
      // midnight, which drops the last 3h of the day for BRT users.
      const toLocalStartTs = (s: string) => {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d).getTime() / 1000;
      };
      const dateFromTs = dateFrom ? toLocalStartTs(dateFrom) : 0;
      const dateToTs = dateTo ? toLocalStartTs(dateTo) + 86399 : Infinity;

      return items.filter(item => {
        const matchesSearch =
          !q ||
          item.title?.toLowerCase().includes(q) ||
          item.contact?.name?.toLowerCase().includes(q) ||
          item.contact?.phone_number?.includes(q) ||
          item.contact?.email?.toLowerCase().includes(q) ||
          String(item.conversation?.display_id ?? '').includes(q);

        const matchesAssignee =
          !assigneeFilter || String(item.conversation?.assignee?.id) === assigneeFilter;

        const matchesStatus =
          !statusFilter || item.conversation?.status === statusFilter;

        const enteredAt = item.entered_at ?? 0;
        const matchesDateRange =
          (!dateFrom || enteredAt >= dateFromTs) &&
          (!dateTo || enteredAt <= dateToTs);

        const matchesLabel =
          !labelFilter ||
          (item.conversation?.labels ?? []).some(l => l.title === labelFilter) ||
          (item.labels ?? []).some(l => l.name === labelFilter);

        // Chatwoot priority (urgent/high/medium/low) collapsed into the mockup's
        // 3 buckets: urgent+high → alta, medium → media, low → baixa.
        const matchesPriority =
          !priorityFilter || priorityBucket(item.conversation?.priority) === priorityFilter;

        return (
          matchesSearch &&
          matchesAssignee &&
          matchesStatus &&
          matchesDateRange &&
          matchesLabel &&
          matchesPriority &&
          (!originFilter || [item.channel_origin?.channel, item.channel_origin?.origin, ...['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].map(key => item.custom_fields?.[key])].some(value => String(value ?? '').toLowerCase().includes(originLower)))
        );
      });
    },
    [searchQuery, assigneeFilter, statusFilter, dateFrom, dateTo, labelFilter, priorityFilter, originFilter, originLower],
  );

  const hasActiveFilters =
    searchQuery !== '' ||
    assigneeFilter !== '' ||
    statusFilter !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    labelFilter !== '' ||
    priorityFilter !== '' || originFilter !== '';

  // Number of active filters shown on the "Filtros" chip badge (search excluded — it
  // has its own box). Date range counts as one regardless of period vs raw dates.
  const activeFilterCount =
    (assigneeFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (priorityFilter ? 1 : 0) + (originFilter ? 1 : 0) + (labelFilter ? 1 : 0);

  // Consolidated "Filtros" popover (mockup) + which accordion section is expanded.
  const [filtersPopoverOpen, setFiltersPopoverOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<string | null>('assignee');

  // Memoize filtered items per stage to avoid recomputing 3× per stage per render
  const filteredItemsByStage = useMemo(() => {
    const map = new Map<string, PipelineItem[]>();
    for (const stage of stages) {
      const list = filterItems(stage.items || []);
      const ts = (item: PipelineItem) => { const v = item.entered_at as unknown; const d = typeof v === 'number' ? v * (v < 1e12 ? 1000 : 1) : new Date(String(v ?? '')).getTime(); return Number.isFinite(d) ? d : 0; };
      map.set(stage.id, !sortKey ? list : [...list].sort((a, b) => sortKey === 'age_desc' ? ts(a) - ts(b) : sortKey === 'age_asc' ? ts(b) - ts(a) : sortKey === 'value_desc' ? Number(b.value || 0) - Number(a.value || 0) : String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR')));
    }
    return map;
  }, [stages, filterItems, sortKey]);

  const totalFilteredCount = useMemo(
    () => Array.from(filteredItemsByStage.values()).reduce((t, items) => t + items.length, 0),
    [filteredItemsByStage],
  );

  const totalItemCount = useMemo(
    () => stages.reduce((total, stage) => total + (stage.items?.length || 0), 0),
    [stages],
  );

  // Move a card to a target stage from the card menu (mirrors the drag-and-drop
  // moveItem path; both call pipelinesService.moveItem then reload).
  const moveItemToStage = async (item: PipelineItem, targetStageId: string) => {
    if (!pipelineId || item.stage_id === targetStageId || movingIds.current.size > 0 || !isOpenDeal(item)) return;
    movingIds.current.add(item.id);
    const previous = stages;
    setStages(current => current.map(stage => ({ ...stage, items: stage.id === targetStageId
      ? [...(stage.items || []), { ...item, stage_id: targetStageId }]
      : (stage.items || []).filter(entry => entry.id !== item.id) })));
    try {
      await pipelinesService.moveItem({ item_id: item.id, pipeline_id: pipelineId, from_stage_id: item.stage_id, to_stage_id: targetStageId });
      invalidateDeal(item.deal_id || item.id);
      await loadPipelineData(true);
      setMoveAnnouncement(`Negócio movido para ${stages.find(stage => stage.id === targetStageId)?.name || 'outra etapa'}`);
      toast.success(t('kanban.messages.itemMoved'));
    } catch {
      setStages(previous);
      setMoveAnnouncement('Não foi possível mover. Tente novamente');
      toast.error('Não foi possível mover. Tente novamente');
    } finally {
      movingIds.current.delete(item.id);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-deal-id="${item.id}"] .deal-move-handle`)?.focus());
    }
  };

  // Pipeline management handlers
  const handleEditPipeline = () => {
    setEditPipelineTab('details');
    setShowEditPipelineModal(true);
  };

  const handleUpdatePipeline = async (data: UpdatePipelineData) => {
    if (!pipeline) return;

    setIsUpdatingPipeline(true);
    try {
      await pipelinesService.updatePipeline(pipeline.id, data);
      toast.success(t('messages.updateSuccess'));
      setShowEditPipelineModal(false);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error(t('messages.updateError'));
    } finally {
      setIsUpdatingPipeline(false);
    }
  };

  const handleDeletePipeline = () => {
    setShowDeletePipelineModal(true);
  };

  const handleConfirmDeletePipeline = async () => {
    if (!pipeline) return;

    setIsDeletingPipeline(true);
    try {
      await pipelinesService.deletePipeline(pipeline.id);
      toast.success(t('messages.deleteSuccess'));
      setShowDeletePipelineModal(false);
      navigate('/pipelines');
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setIsDeletingPipeline(false);
    }
  };

  const handleReorderStages = () => {
    setShowReorderStagesModal(true);
  };

  const handleUpdateStageOrder = async (orderedStages: PipelineStage[]) => {
    if (!pipelineId) return;

    setIsReorderingStages(true);
    try {
      // Backend expects just an array of stage IDs in the correct order
      const stageOrders = orderedStages.map(stage => stage.id);

      await pipelinesService.reorderPipelineStages(pipelineId, stageOrders);

      toast.success(t('kanban.messages.stageReordered'));
      setShowReorderStagesModal(false);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error reordering stages:', error);
      toast.error(t('kanban.messages.stageReorderError'));
    } finally {
      setIsReorderingStages(false);
    }
  };

  // Stage management handlers
  const handleCreateStage = async (data: CreateStageData) => {
    if (!pipeline) return;

    setIsCreatingStage(true);
    try {
      await pipelinesService.createPipelineStage(pipeline.id, data);
      toast.success(t('kanban.messages.stageCreated'));
      setShowCreateStageModal(false);
      // Reload pipeline data to show new stage
      await loadPipelineData();
    } catch (error) {
      console.error('Error creating stage:', error);
      toast.error(t('kanban.messages.stageCreateError'));
    } finally {
      setIsCreatingStage(false);
    }
  };

  // Item management handlers
  const handleAddItem = (stage?: PipelineStage) => {
    setSelectedStageForItem(stage || stages[0] || null);
    setShowAddItemModal(true);
  };

  const handleItemAdded = async () => {
    toast.success(t('kanban.messages.itemAdded'));
    // Reload pipeline data to show new item
    await loadPipelineData();
    // Warn if active filters may hide the newly added card
    if (hasActiveFilters) {
      toast.info(t('kanban.messages.newItemMayBeHidden'), {
        action: { label: t('kanban.search.clearFilters'), onClick: clearFilters },
      });
    }
  };

  const handleRemoveItem = (item: PipelineItem) => {
    setItemToRemove(item);
    setShowRemoveItemModal(true);
  };

  const handleConfirmRemoveItem = async () => {
    if (!itemToRemove || !pipelineId) return;

    setIsRemovingItem(true);
    try {
      await pipelinesService.removeItemFromPipeline(pipelineId, itemToRemove.id);
      toast.success(t('kanban.messages.itemRemoved'));
      setShowRemoveItemModal(false);
      setItemToRemove(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error removing item from pipeline:', error);
      toast.error(t('kanban.messages.itemRemoveError'));
    } finally {
      setIsRemovingItem(false);
    }
  };

  const dealIdOf = (item: PipelineItem) => item.deal_id || item.id;
  const openDeal = (item: PipelineItem, tab: DealTabId = 'activities') => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.set('deal', dealIdOf(item));
        next.set('tab', tab);
        return next;
      },
      { state: { dealModal: true } },
    );
  };
  const handleEditItem = (item: PipelineItem) => openDeal(item);
  // Anterior/próximo negócio na mesma etapa, na ordem exibida (filtros e ordenação respeitados)
  const dealNeighbors = useMemo(() => {
    if (!dealParam) return undefined;
    for (const stage of stages) {
      const list = filteredItemsByStage.get(stage.id) || [];
      const index = list.findIndex(entry => dealIdOf(entry) === dealParam || entry.id === dealParam);
      if (index >= 0) return { prev: list[index - 1], next: list[index + 1], position: `${index + 1} de ${list.length}`, stageName: stage.name };
    }
    return undefined;
  }, [dealParam, stages, filteredItemsByStage]);
  const closeDeal = () => {
    // Abriu por clique no quadro: voltar do histórico desfaz exatamente a abertura.
    if ((location.state as { dealModal?: boolean } | null)?.dealModal) {
      navigate(-1);
      return;
    }
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('deal');
        next.delete('tab');
        return next;
      },
      { replace: true },
    );
  };
  const changeDealTab = (tab: DealTabId) =>
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true, state: location.state },
    );
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warmDeal = (item: PipelineItem, immediate = false) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    ensureModal();
    if (immediate) prefetchDeal(dealIdOf(item));
    else hoverTimer.current = setTimeout(() => prefetchDeal(dealIdOf(item)), 100);
  };
  const handleDealChange = useCallback((deal: Deal, info: { stageChanged: boolean; statusChanged?: boolean }) => {
    const sameDeal = (entry: PipelineItem) => (entry.deal_id || entry.id) === deal.id;
    setStages(current => current.map(stage => ({
      ...stage,
      items: (stage.items || []).map(entry => {
        if (!sameDeal(entry)) return entry;
        const merged: PipelineItem = { ...entry };
        const assign = <K extends keyof PipelineItem>(key: K, value: PipelineItem[K] | undefined) => { if (value !== undefined) merged[key] = value; };
        assign('deal_status', deal.deal_status);
        assign('lost_reason', deal.lost_reason);
        assign('title', deal.title);
        assign('value', deal.value);
        assign('currency', deal.currency);
        assign('labels', deal.labels);
        assign('notes', deal.notes);
        assign('custom_fields', deal.custom_fields);
        assign('owner', deal.owner);
        assign('primary_contact', deal.primary_contact);
        assign('contact', deal.primary_contact ? { ...(entry.contact || {}), ...deal.primary_contact } as PipelineItem['contact'] : entry.contact);
        assign('contact_count', deal.contact_count);
        assign('conversation_count', deal.conversation_count);
        assign('file_count', deal.file_count);
        assign('conversation_summary', deal.conversation_summary);
        return merged;
      }),
    })));
    if (info.stageChanged || info.statusChanged) void loadPipelineData(true);
  }, [loadPipelineData]);

  const openConversationPanel = useCallback((item: PipelineItem, conversationId: string, displayId?: number | string | null) => {
    void loadConversationDrawer().then(module => setDrawerComponent(() => module.default));
    const name = item.primary_contact?.name || item.contact?.name || item.title || '';
    setConversationPanel({ id: conversationId, title: displayId ? `#${displayId} · ${name}` : name });
  }, []);
  const updateConversationSummary = useCallback((dealId: string, summary: DealConversationSummary) => {
    setStages(current => current.map(stage => ({
      ...stage,
      items: (stage.items || []).map(entry => ((entry.deal_id || entry.id) === dealId ? { ...entry, conversation_summary: summary } : entry)),
    })));
  }, []);
  const configureNumbers = useCallback(() => {
    setEditPipelineTab('whatsapp');
    setShowEditPipelineModal(true);
  }, []);

  const openedItem = useMemo(() => {
    if (!dealParam) return undefined;
    for (const stage of stages) {
      const hit = (stage.items || []).find(entry => (entry.deal_id || entry.id) === dealParam || entry.id === dealParam);
      if (hit) return hit;
    }
    return undefined;
  }, [dealParam, stages]);

  // Stage management handlers
  const handleEditStage = (stage: PipelineStage) => {
    setStageToEdit(stage);
    setShowEditStageModal(true);
  };

  const handleUpdateStage = async (data: {
    name: string;
    color: string;
    stage_type: string;
    automation_rules?: { description?: string };
    custom_fields?: Record<string, unknown>;
  }) => {
    if (!stageToEdit || !pipelineId) return;

    setIsEditingStage(true);
    try {
      await pipelinesService.updatePipelineStage(pipelineId, stageToEdit.id, {
        name: data.name,
        color: data.color,
        stage_type: data.stage_type,
        automation_rules: data.automation_rules,
        custom_fields: data.custom_fields,
      });
      toast.success(t('kanban.messages.stageUpdated'));
      setShowEditStageModal(false);
      setStageToEdit(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error(t('kanban.messages.stageUpdateError'));
    } finally {
      setIsEditingStage(false);
    }
  };

  const handleDeleteStage = (stage: PipelineStage) => {
    setStageToDelete(stage);
    setShowDeleteStageModal(true);
  };

  const handleConfirmDeleteStage = async () => {
    if (!stageToDelete || !pipelineId) return;

    setIsDeletingStage(true);
    try {
      await pipelinesService.deletePipelineStage(pipelineId, stageToDelete.id);
      toast.success(t('kanban.messages.stageDeleted'));
      setShowDeleteStageModal(false);
      setStageToDelete(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error(t('kanban.messages.stageDeleteError'));
    } finally {
      setIsDeletingStage(false);
    }
  };

  if (loading) return <PipelineBoardLoading pipelineId={pipelineId} />;
  if (!pipeline || loadError) return (
    <div className="pipeline-board-root board-page-state" role="alert">
      <span className="board-state-icon board-state-error"><AlertCircle size={20} /></span>
      <h1>{t('kanban.board.loadError', { defaultValue: 'Não foi possível carregar o quadro' })}</h1>
      <Button variant="outline" onClick={() => loadPipelineData()}>{t('kanban.board.retry', { defaultValue: 'Tentar novamente' })}</Button>
    </div>
  );

  return (
    <div className={`pipeline-board-root flex w-full h-full min-w-0 overflow-hidden ${personalizingCards ? "is-personalizing" : ""}`} onKeyDown={event => { if (event.key === "Escape") { setDraggedItem(null); setDropTarget(null); isDraggingRef.current = false; } }}>
      <span className="sr-only" role="status" aria-live="polite">{moveAnnouncement}</span>
      {personalizingCards && pipeline ? <CardConfigurationPanel pipeline={pipeline} onClose={() => { setPersonalizingCards(false); requestAnimationFrame(() => personalizeButtonRef.current?.focus()); }} onSaved={saved => { setPipeline(current => current ? { ...current, card_configuration: saved.card_configuration, card_configuration_revision: saved.card_configuration_revision } : current); toast.success("Cartões atualizados para a equipe"); }} /> : null}
      <div className="flex-1 h-full flex flex-col bg-muted/30 min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-background border-b border-border">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="kanban-header-summary flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:py-3">
              {/* Navigation and Pipeline Info */}
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/pipelines')}
                  aria-label="Voltar aos pipelines" className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>

                <div className="min-w-0">
                  <nav aria-label="Caminho" className="kanban-breadcrumb"><Link to="/pipelines">Todos os pipelines</Link></nav>
                  <div className="flex items-center gap-2">
                    {pipeline?.visibility === 'private' && (
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" aria-label={t('kanban.header.private')} />
                    )}
                    {/* Name + switch-pipeline dropdown arrow */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 min-w-0 rounded-md hover:bg-muted px-1 -mx-1 transition-colors"
                        >
                          <h1 title={pipeline?.name} className="kanban-title text-foreground truncate">
                            {pipeline?.name}
                          </h1>
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto w-56">
                        {allPipelines.map(p => (
                          <DropdownMenuItem
                            key={p.id}
                            onClick={() => handlePipelineChange(p.id)}
                            className={p.id === pipeline?.id ? 'bg-primary/10 text-[var(--primary-text)]' : ''}
                          >
                            {p.visibility === 'private' && (
                              <Lock className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{p.name}</span>
                            {p.id === pipeline?.id && <Check className="h-3.5 w-3.5 ml-auto" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {pipeline && !pipeline.is_active && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground shrink-0">
                        {t('pipelinesTable.status.inactive')}
                      </span>
                    )}
                    {pipeline?.is_default && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        {t('pipelinesTable.default')}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditPipeline}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-[var(--primary-text)] shrink-0"
                      aria-label={t('kanban.header.editPipeline')}
                    >
                      <Edit className="w-[15px] h-[15px]" />
                    </Button>
                  </div>
                  <p className="kanban-description text-xs text-muted-foreground truncate">
                    {pipeline?.description || t('kanban.header.noDescription')}
                  </p>
                </div>
              </div>

              <div className="kanban-summary-actions">
                <dl className="kanban-kpis">
                  <div><dd>{totalItemCount}</dd><dt>{t('kanban.board.deals', { defaultValue: 'Negócios' })}</dt></div>
                  <div><dd>{stages.length}</dd><dt>{t('kanban.header.stages')}</dt></div>
                  <div><dd>{stageTotal(stages.flatMap(stage => stage.items || []))}</dd><dt>{t('kanban.header.totalValue')}</dt></div>
                </dl>
                {/* Pipeline Options Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" aria-label="Opções do pipeline">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleEditPipeline}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('kanban.header.editPipeline')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!pipeline?.id) return;
                        await navigator.clipboard.writeText(String(pipeline.id));
                        toast.success(t('kanban.idCopied'));
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t('kanban.copyId')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleReorderStages}>
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      {t('kanban.header.reorderStages')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowCaptureFormsModal(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      {t('kanban.header.captureForms')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={handleDeletePipeline}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('kanban.header.deletePipeline')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search & consolidated Filtros bar */}
            <div className="kanban-actions-wrap border-t border-border/50 py-2.5">
              <div className={`kanban-actions flex items-center gap-3 ${mobileSearchOpen ? "search-expanded" : ""}`}>
                <select className="kanban-mobile-pipeline" aria-label="Pipeline" value={pipelineId} onChange={event => handlePipelineChange(event.target.value)}>{allPipelines.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
                {/* Search input */}
                <div className="kanban-search relative w-[320px] shrink-0">
                  <button className="mobile-search-toggle" aria-label="Buscar negócios" onClick={() => setMobileSearchOpen(true)}><Search className="w-4 h-4" /></button>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t('kanban.search.placeholder')}
                    value={searchInput}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                  {(searchInput || mobileSearchOpen) && (
                    <button
                      className="kanban-search-close absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Fechar busca" onClick={() => { handleSearchChange(''); setMobileSearchOpen(false); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status do negócio: Abertos (padrão) / Ganhos / Perdidos / Todos */}
                <div className="kanban-deal-status" role="group" aria-label={t('kanban.dealStatus.label')}>
                  {(['open', 'won', 'lost', 'all'] as const).map(option => {
                    const counts = pipeline?.deal_status_counts;
                    const count = counts ? (option === 'all' ? counts.open + counts.won + counts.lost : counts[option]) : undefined;
                    return (
                      <button key={option} type="button" data-deal-status={option} aria-pressed={dealStatus === option} onClick={() => setDealStatus(option)}>
                        {t(`kanban.dealStatus.${option}`)}{count !== undefined && <span className="kanban-deal-status-count">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Consolidated Filtros popover */}
                <Popover open={filtersPopoverOpen} onOpenChange={setFiltersPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Filtros" className={`kanban-filter-button h-8 gap-2 whitespace-nowrap ${activeFilterCount > 0 ? 'border-primary/40 bg-primary/5 text-[var(--primary-text)]' : ''}`}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="kanban-action-label">{t('kanban.search.filters')}</span>
                      {activeFilterCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-primary text-primary-foreground text-[11px] font-semibold">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="kanban-filter-popover w-[300px] p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">
                        {t('kanban.search.filters')}
                      </span>

                    </div>

                    <div className="max-h-[380px] overflow-y-auto p-2 space-y-1.5">
                      <label className="block p-2 text-sm font-medium">
                        {t('kanban.board.origin', { defaultValue: 'Origem e campanha' })}
                        <Input className="mt-2" value={originFilter} onChange={event => updateFilters({ origin: event.target.value })} placeholder="Canal, origem ou UTM" />
                      </label>
                      {/* Responsável */}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <button
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                          onClick={() => setFilterSection(s => (s === 'assignee' ? null : 'assignee'))}
                        >
                          <span className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[var(--primary-text)]" />
                            {t('kanban.search.assigneeFilter')}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${filterSection === 'assignee' ? 'rotate-180' : ''}`} />
                        </button>
                        {filterSection === 'assignee' && (
                          <div className="px-2 pb-2 max-h-40 overflow-y-auto space-y-0.5">
                            <button
                              onClick={() => updateFilters({ assignee: undefined })}
                              className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                              <span className="text-foreground">{t('kanban.search.all')}</span>
                              {!assigneeFilter && <Check className="w-4 h-4 text-[var(--primary-text)]" />}
                            </button>
                            {uniqueAssignees.map(a => (
                              <button
                                key={a.id}
                                onClick={() => updateFilters({ assignee: a.id })}
                                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                              >
                                {a.avatar_url ? (
                                  <img src={a.avatar_url} alt={a.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: getContactColor(a.name) }}>
                                    {a.name?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                )}
                                <span className="flex-1 text-left truncate text-foreground">{a.name}</span>
                                {assigneeFilter === a.id && <Check className="w-4 h-4 text-[var(--primary-text)] shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <button
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                          onClick={() => setFilterSection(s => (s === 'status' ? null : 'status'))}
                        >
                          <span className="flex items-center gap-2">
                            <CircleDot className="w-4 h-4 text-[var(--primary-text)]" />
                            {t('kanban.search.statusFilter')}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${filterSection === 'status' ? 'rotate-180' : ''}`} />
                        </button>
                        {filterSection === 'status' && (
                          <div className="px-2 pb-2 space-y-0.5">
                            <button
                              onClick={() => updateFilters({ status: undefined })}
                              className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                              <span className="text-foreground">{t('kanban.search.all')}</span>
                              {!statusFilter && <Check className="w-4 h-4 text-[var(--primary-text)]" />}
                            </button>
                            {(['open', 'pending', 'resolved', 'snoozed'] as const).map(s => (
                              <button
                                key={s}
                                onClick={() => updateFilters({ status: s })}
                                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColorHex(s) }} />
                                <span className="flex-1 text-left text-foreground">{t(`kanban.search.status.${s}`)}</span>
                                {statusFilter === s && <Check className="w-4 h-4 text-[var(--primary-text)] shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Período */}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <button
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                          onClick={() => setFilterSection(s => (s === 'period' ? null : 'period'))}
                        >
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[var(--primary-text)]" />
                            {t('kanban.search.periodFilter')}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${filterSection === 'period' ? 'rotate-180' : ''}`} />
                        </button>
                        {filterSection === 'period' && (
                          <div className="px-2 pb-2 space-y-0.5">
                            {([
                              { key: '', label: t('kanban.search.period.all') },
                              { key: 'today', label: t('kanban.search.period.today') },
                              { key: '7d', label: t('kanban.search.period.last7') },
                              { key: '30d', label: t('kanban.search.period.last30') },
                              { key: 'month', label: t('kanban.search.period.month') },
                            ]).map(p => (
                              <button
                                key={p.key || 'all'}
                                onClick={() => applyPeriod(p.key)}
                                className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                              >
                                <span className="text-foreground">{p.label}</span>
                                {(periodFilter === p.key || (!periodFilter && !p.key)) && <Check className="w-4 h-4 text-[var(--primary-text)]" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Prioridade */}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <button
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                          onClick={() => setFilterSection(s => (s === 'priority' ? null : 'priority'))}
                        >
                          <span className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-[var(--primary-text)]" />
                            {t('kanban.search.priorityFilter')}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${filterSection === 'priority' ? 'rotate-180' : ''}`} />
                        </button>
                        {filterSection === 'priority' && (
                          <div className="px-2 pb-2 space-y-0.5">
                            <button
                              onClick={() => updateFilters({ priority: undefined })}
                              className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                              <span className="text-foreground">{t('kanban.search.all')}</span>
                              {!priorityFilter && <Check className="w-4 h-4 text-[var(--primary-text)]" />}
                            </button>
                            {(['alta', 'media', 'baixa'] as const).map(p => (
                              <button
                                key={p}
                                onClick={() => updateFilters({ priority: p })}
                                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_HEX[p] }} />
                                <span className="flex-1 text-left text-foreground">{t(`kanban.search.priority.${p}`)}</span>
                                {priorityFilter === p && <Check className="w-4 h-4 text-[var(--primary-text)] shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 px-3 py-2.5 border-t border-border">
                      <Button variant="outline" size="sm" onClick={() => setFiltersPopoverOpen(false)}>
                        {t('kanban.search.apply')}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button ref={personalizeButtonRef} className="kanban-customize-button" aria-label="Personalizar cartões" variant="outline" onClick={() => setPersonalizingCards(true)}><SlidersHorizontal className="w-4 h-4" /><span className="kanban-action-label">Personalizar cartões</span></Button>
                <div className="kanban-toolbar-end">
                  {hasActiveFilters && <span className="kanban-results-count" aria-live="polite">{totalFilteredCount} de {totalItemCount} negócios</span>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={`kanban-sort-button h-8 gap-2 ${sortKey ? 'border-primary/40 bg-primary/5 text-[var(--primary-text)]' : ''}`} aria-label="Ordenar negócios"><ArrowUpDown className="w-4 h-4" /><span className="kanban-action-label">{({ age_desc: 'Mais tempo na etapa', age_asc: 'Menos tempo na etapa', value_desc: 'Maior valor', title: 'Nome (A–Z)' } as Record<string, string>)[sortKey] || 'Ordenar'}</span></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {([['', 'Posição na etapa'], ['age_desc', 'Mais tempo na etapa'], ['age_asc', 'Menos tempo na etapa'], ['value_desc', 'Maior valor'], ['title', 'Nome (A–Z)']] as const).map(([key, label]) => (
                        <DropdownMenuItem key={key || 'none'} onClick={() => setSort(key)}>{label}{sortKey === key && <Check className="h-3.5 w-3.5 ml-auto" />}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="kanban-density" role="group" aria-label="Densidade dos cartões">
                    <button type="button" aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')} title="Confortável">Confortável</button>
                    <button type="button" aria-pressed={density === 'compact'} onClick={() => setDensity('compact')} title="Compacto">Compacto</button>
                  </div>
                </div>



                {/* Inline clear when any filter active */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="kanban-clear-filters h-8 text-[var(--primary-text)] hover:bg-primary/10"
                    onClick={clearFilters}
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    {t('kanban.search.clearFilters')}
                  </Button>
                )}

                {/* Results summary */}
                {hasActiveFilters && (
                  <span className="kanban-results text-xs text-muted-foreground">
                    {totalFilteredCount} de {totalItemCount} negócios
                  </span>
                )}
                <Button className="kanban-add-button" aria-label="Adicionar negócio" disabled={!stages.length} onClick={() => { if (stages[0]) handleAddItem(stages[0]); }}><Plus className="w-4 h-4" /><span className="kanban-action-label">Adicionar negócio</span></Button>
              </div>

            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div
            ref={boardScrollRef}
            aria-label="Quadro de negócios"
            className="kanban-scroll h-full overflow-x-auto overflow-y-hidden p-4 sm:p-6" data-density={density}
            onPointerDown={event => {
              // arrastar no fundo do quadro (fora de colunas/cartões) rola na horizontal
              const target = event.target as HTMLElement;
              if (event.pointerType !== 'mouse' || event.button !== 0 || target.closest('.kanban-column')) return;
              const board = event.currentTarget;
              const startX = event.clientX;
              const startLeft = board.scrollLeft;
              board.classList.add('is-panning');
              const move = (moveEvent: PointerEvent) => { board.scrollLeft = startLeft - (moveEvent.clientX - startX); };
              const stop = () => { board.classList.remove('is-panning'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', stop);
              window.addEventListener('pointercancel', stop);
            }}
            onKeyDown={event => {
              // Alt+←/→ rola o quadro uma coluna por vez (atalho de rolagem lateral)
              if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                event.preventDefault();
                event.currentTarget.scrollBy({ left: event.key === 'ArrowLeft' ? -320 : 320, behavior: 'smooth' });
              }
            }}
          >
            {/* Kanban Content */}
            <div
              className="flex gap-4 h-full"
              style={{ width: 'fit-content', minWidth: '100%' }}
            >
              {/* Stage Columns */}
              {stages.map((stage: PipelineStage) => {
                const moveTargets = stages.filter(target => target.id !== stage.id);
                const stageItems = filteredItemsByStage.get(stage.id) || [];
                const stageSum = stageTotal(stageItems);
                return (
                <section aria-label={stage.name} key={stage.id} data-stage-id={stage.id} className="kanban-column">
                  <div className="kanban-column-surface h-full min-h-0 flex flex-col overflow-hidden">
                    {/* Stage Header — clean: color only on the top border + dot */}
                    <div
                      className="kanban-column-header flex-shrink-0 flex items-start justify-between gap-2 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} /><h3 title={stage.name} className="text-sm font-semibold truncate">{stage.name}</h3><span className="text-xs text-muted-foreground">{hasActiveFilters ? `${stageItems.length} de ${stage.items?.length || 0}` : stageItems.length}</span></div>
                        <p className="mt-1 text-xs text-muted-foreground tabular-nums">{stageSum}</p>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-[var(--primary-text)]"
                          onClick={() => handleAddItem(stage)}
                          aria-label={t('kanban.header.addItem')}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditStage(stage)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('kanban.stage.editStage')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                await navigator.clipboard.writeText(String(stage.id));
                                toast.success(t('kanban.idCopied'));
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              {t('kanban.copyId')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteStage(stage)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('kanban.stage.deleteStage')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Items Drop Zone */}
                    <div
                      className={`kanban-dropzone flex-1 min-h-0 overflow-y-auto p-2 space-y-2 ${dropTarget === stage.id ? "is-drop-target" : ""}`}
                      onDragOver={event => { handleDragOver(event); setDropTarget(stage.id); }}
                      onDrop={e => handleDrop(e, stage.id)}
                    >
                      {stageItems.map(item => {
                        return (
                        <div
                          key={item.id}
                          data-deal-id={item.id}
                          className={`deal-card-shell group relative min-w-0 ${draggedItem?.id === item.id ? "is-dragging" : ""}`}
                          draggable={!movingIds.current.has(item.id) && isOpenDeal(item)}
                          onDragStart={() => handleDragStart(item)}
                          onDragEnd={handleDragEnd}
                          onPointerEnter={() => warmDeal(item)}
                          onPointerLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }}
                          onFocus={() => warmDeal(item, true)}
                          onClick={event => {
                            if (Date.now() < suppressClickUntilRef.current || isDraggingRef.current) return;
                            if ((event.target as HTMLElement).closest('a,button,summary,details,input,select,textarea,[role="menuitem"]')) return;
                            openDeal(item);
                          }}

                        >
                          {isOpenDeal(item) && <button className="deal-move-handle" aria-label={`Arrastar ${item.title || 'negócio'}`} draggable
                            onDragStart={event => { event.stopPropagation(); if (event.currentTarget.parentElement) event.dataTransfer.setDragImage(event.currentTarget.parentElement, 16, 16); handleDragStart(item); }}
                            onPointerDown={event => {
                              if (event.pointerType === 'mouse') return;
                              const element = event.currentTarget;
                              const state = { x: event.clientX, y: event.clientY, active: false, timer: setTimeout(() => { state.active = true; handleDragStart(item); element.setPointerCapture(event.pointerId); }, 300) };
                              touchDrag.current = state;
                            }}
                            onPointerMove={event => {
                              const state = touchDrag.current; if (!state) return;
                              if (!state.active) { if (Math.hypot(event.clientX - state.x, event.clientY - state.y) > 8) { clearTimeout(state.timer); touchDrag.current = null; } return; }
                              const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-stage-id]');
                              setDropTarget(target?.dataset.stageId || null);
                              const board = boardScrollRef.current; if (board) { const rect = board.getBoundingClientRect(); if (event.clientX < rect.left + 32) board.scrollLeft -= 16; if (event.clientX > rect.right - 32) board.scrollLeft += 16; }
                            }}
                            onPointerUp={event => {
                              const state = touchDrag.current; if (!state) return; clearTimeout(state.timer);
                              if (state.active && draggedItem && dropTarget) void moveItemToStage(item, dropTarget);
                              touchDrag.current = null; handleDragEnd(); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                            }}
                            onPointerCancel={() => { if (!touchDrag.current) return; clearTimeout(touchDrag.current.timer); touchDrag.current = null; handleDragEnd(); }}>⠿</button>}
                          {/* Card menus: move + ⋮ */}
                          <div
                            className="absolute top-2 right-2 flex items-center gap-0.5 opacity-100"
                            onClick={e => e.stopPropagation()}
                          >
                            {moveTargets.length > 0 && isOpenDeal(item) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-auto p-1 text-muted-foreground hover:bg-muted" aria-label={t('kanban.item.moveCard')}>
                                    <ArrowLeftRight className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                    {t('kanban.item.moveTo')}
                                  </div>
                                  {moveTargets.map(target => (
                                    <DropdownMenuItem key={target.id} onClick={() => moveItemToStage(item, target.id)}>
                                      <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: target.color }} />
                                      {target.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-auto p-1 text-muted-foreground hover:bg-muted">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('kanban.item.editItem')}
                                </DropdownMenuItem>
                                {item.conversation?.uuid && (
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/conversations/${item.conversation!.uuid}`)}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    {t('kanban.item.openConversation')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(String(item.id));
                                    toast.success(t('kanban.idCopied'));
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  {t('kanban.copyId')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedConversationForSchedule(item);
                                    setScheduleActionOpen(true);
                                  }}
                                >
                                  <CalendarClock className="h-4 w-4 mr-2" />
                                  {t('kanban.item.scheduleAction')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveItem(item)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('kanban.item.removeFromPipeline')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <ConfiguredDealCard onFilterLabel={name => updateFilters({ label: labelFilter === name ? '' : name })} activeLabel={labelFilter} item={item} configuration={configurationFor(pipeline!)} definitions={pipeline!.card_field_definitions || nativeFields} onOpen={openDeal} onOpenConversation={openConversationPanel} onConversationChanged={(entry, summary) => updateConversationSummary(dealIdOf(entry), summary)} canConfigureNumbers={can('pipelines', 'update')} onConfigureNumbers={configureNumbers} />
                        </div>
                        );
                      })}

                      {/* Empty note */}
                      {stageItems.length === 0 && (
                        <div className="kanban-stage-empty">
                          <span>{hasActiveFilters ? t('kanban.board.noResults', { defaultValue: 'Nenhum negócio com esses filtros' }) : dealStatus === 'won' ? t('kanban.dealStatus.emptyWon') : dealStatus === 'lost' ? t('kanban.dealStatus.emptyLost') : t('kanban.board.emptyStage', { defaultValue: 'Nenhum negócio nesta etapa' })}</span>
                          {dealStatus === 'open' && <button onClick={() => handleAddItem(stage)}><Plus size={16} />{t('kanban.board.addDeal', { defaultValue: 'Adicionar negócio' })}</button>}
                        </div>
                      )}

                      {/* '+' ghost add row */}
                      {stageItems.length > 0 && dealStatus === 'open' && <button
                        type="button"
                        onClick={() => handleAddItem(stage)}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-primary/10 hover:text-[var(--primary-text)] hover:border-primary/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {t('kanban.board.addDeal', { defaultValue: 'Adicionar negócio' })}
                      </button>}
                    </div>
                  </div>
                </section>
                );
              })}

              {/* Add Stage Column */}
              {stages.length > 0 && <div className="kanban-column">
                <button type="button"
                  className="kanban-add-stage bg-muted/50 rounded-xl p-6 h-full w-full flex flex-col items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setShowCreateStageModal(true)}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-[var(--primary-text)]" />
                  </div>
                  <h3 className="text-sm font-medium mb-1">{t('kanban.stage.addStage')}</h3>
                  <p className="text-xs text-center">{t('kanban.stage.addStageDescription')}</p>
                </button>
              </div>}

              {stages.length === 0 && (
                <div className="board-page-state flex-1">
                  <span className="board-state-icon"><Plus size={20} /></span>
                  <h2 className="text-base font-semibold">{t('kanban.board.noStagesTitle', { defaultValue: 'Crie a primeira etapa' })}</h2>
                  <p className="text-sm text-muted-foreground max-w-[360px] text-center">{t('kanban.board.noStagesDescription', { defaultValue: 'Organize os negócios conforme avançam no seu processo comercial.' })}</p>
                  <Button variant="outline" onClick={() => setShowCreateStageModal(true)}>{t('kanban.stage.addStage')}</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Pipeline Modal */}
      {pipeline && (
        <EditPipelineModal
          open={showEditPipelineModal}
          onOpenChange={setShowEditPipelineModal}
          pipeline={pipeline}
          defaultTab={editPipelineTab}
          onSubmit={handleUpdatePipeline}
          loading={isUpdatingPipeline}
        />
      )}

      {/* Create Stage Modal */}
      <CreateStageModal
        open={showCreateStageModal}
        onOpenChange={setShowCreateStageModal}
        onSubmit={handleCreateStage}
        loading={isCreatingStage}
      />

      {/* Add Item Modal */}
      {pipeline && (
        <AddItemModal
          open={showAddItemModal}
          onOpenChange={setShowAddItemModal}
          pipelineId={pipeline.id}
          stages={stages}
          preselectedStage={selectedStageForItem}
          onItemAdded={handleItemAdded}
        />
      )}

      {/* Remove Item Modal */}
      <RemoveItemModal
        open={showRemoveItemModal}
        onOpenChange={setShowRemoveItemModal}
        item={itemToRemove}
        onConfirm={handleConfirmRemoveItem}
        loading={isRemovingItem}
      />

      {/* Edit Stage Modal */}
      <EditStageModal
        open={showEditStageModal}
        onOpenChange={setShowEditStageModal}
        stage={stageToEdit}
        onSubmit={handleUpdateStage}
        loading={isEditingStage}
        stages={stages}
        agents={uniqueAssignees}
      />

      {/* Delete Stage Modal */}
      <DeleteStageModal
        open={showDeleteStageModal}
        onOpenChange={setShowDeleteStageModal}
        stage={stageToDelete}
        itemCount={stageToDelete?.item_count || 0}
        onConfirm={handleConfirmDeleteStage}
        loading={isDeletingStage}
      />

      {/* Delete Pipeline Modal */}
      {pipeline && (
        <DeletePipelineModal
          open={showDeletePipelineModal}
          onOpenChange={setShowDeletePipelineModal}
          pipeline={pipeline}
          onConfirm={handleConfirmDeletePipeline}
          loading={isDeletingPipeline}
        />
      )}

      {/* Reorder Stages Modal */}
      <ReorderStagesModal
        open={showReorderStagesModal}
        onOpenChange={setShowReorderStagesModal}
        stages={stages}
        onSubmit={handleUpdateStageOrder}
        loading={isReorderingStages}
      />

      {/* Negócio em modal sobre o quadro (URL: ?deal=<id>&tab=<aba>) */}
      {dealParam && pipelineId && ModalComponent && (
        <>
          <ModalComponent
            key={dealParam}
            neighbors={dealNeighbors}
            onNavigate={item => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('deal', dealIdOf(item)); return n; }, { replace: true, state: location.state })}
            pipelineId={pipelineId}
            dealId={dealParam}
            seed={openedItem}
            pipeline={pipeline}
            tab={dealTab}
            onTabChange={changeDealTab}
            onClose={closeDeal}
            onDealChange={handleDealChange}
            onOpenConversation={openConversationPanel}
            canConfigureNumbers={can('pipelines', 'update')}
            onConfigureNumbers={configureNumbers}
          />
        </>
      )}

      {conversationPanel && DrawerComponent && (
        <DrawerComponent conversationId={conversationPanel.id} title={conversationPanel.title} onClose={() => setConversationPanel(null)} />
      )}

      {/* Schedule Action Modal */}
      {selectedConversationForSchedule && scheduleActionContactId && (
        <ScheduleActionModal
          open={scheduleActionOpen}
          onClose={() => {
            setScheduleActionOpen(false);
            setSelectedConversationForSchedule(null);
          }}
          contactId={scheduleActionContactId}
        />
      )}

      {/* Capture Forms (lead capture) for this pipeline */}
      <PipelineCaptureFormsModal
        open={showCaptureFormsModal}
        onOpenChange={setShowCaptureFormsModal}
        pipeline={pipeline}
        stages={stages}
        allPipelines={allPipelines}
      />
    </div>
  );
}

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getContactColor } from '@/utils/avatar';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Phone,
  User,
  CalendarClock,
  AlertCircle,
  Clock,
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
  GitBranch,
  MessageSquare,
  FileText,
} from 'lucide-react';

import { pipelinesService } from '@/services/pipelines';
import { useAppDataStore } from '@/store/appDataStore';
import {
  Pipeline,
  PipelineStage,
  PipelineItem,
  UpdatePipelineData,
  CreateStageData,
} from '@/types/analytics';
import EditPipelineModal from '@/components/pipelines/EditPipelineModal';
import CreateStageModal from '@/components/pipelines/CreateStageModal';
import AddItemModal from '@/components/pipelines/AddItemModal';
import RemoveItemModal from '@/components/pipelines/RemoveItemModal';
import EditItemModal from '@/components/pipelines/EditItemModal';
import EditStageModal from '@/components/pipelines/EditStageModal';
import DeleteStageModal from '@/components/pipelines/DeleteStageModal';
import DeletePipelineModal from '@/components/pipelines/DeletePipelineModal';
import ReorderStagesModal from '@/components/pipelines/ReorderStagesModal';
import PipelineCaptureFormsModal from '@/components/pipelines/PipelineCaptureFormsModal';
import { ScheduleActionModal } from '@/components/scheduledActions';

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

const STATUS_BADGE_CLASS: Record<string, string> = {
  open: 'bg-primary/10 text-primary',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  resolved: 'bg-muted text-muted-foreground',
  snoozed: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};
const statusBadgeClass = (status?: string) =>
  STATUS_BADGE_CLASS[status ?? ''] ?? 'bg-muted text-muted-foreground';

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
const PRIORITY_BADGE_CLASS: Record<string, string> = {
  alta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  baixa: 'bg-primary/10 text-primary',
};

export default function PipelineKanban() {
  const { t } = useLanguage('pipelines');
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') ?? '';
  const assigneeFilter = searchParams.get('assignee') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';
  const labelFilter = searchParams.get('label') ?? '';
  const priorityFilter = searchParams.get('priority') ?? '';
  // Período preset bucket ('today' | '7d' | '30d' | 'month'); drives dateFrom/dateTo.
  const periodFilter = searchParams.get('period') ?? '';

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
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<PipelineItem | null>(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
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
  const loadPipelineData = useCallback(async () => {
    if (!pipelineId) return;

    setLoading(true);
    try {
      // Load pipeline with all data (stages, items, tasks_info, services_info)
      const pipelineData = await pipelinesService.getPipeline(pipelineId);

      setPipeline(pipelineData);
      setStages(pipelineData.stages || []);
    } catch (error) {
      console.error('Error loading pipeline data:', error);
      toast.error(t('kanban.messages.loadDataError'));
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

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
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();

    if (!draggedItem) return;

    // Don't move if dropping on same stage
    if (draggedItem.stage_id === targetStageId) {
      setDraggedItem(null);
      return;
    }

    // Capture before async operations
    const movedItem = draggedItem;
    const willBeHidden = hasActiveFilters && filterItems([movedItem]).length === 0;

    try {
      await pipelinesService.moveItem({
        item_id: movedItem.id,
        pipeline_id: pipelineId!,
        from_stage_id: movedItem.stage_id,
        to_stage_id: targetStageId,
      });

      // Reload pipeline data to reflect changes
      await loadPipelineData();
      toast.success(t('kanban.messages.itemMoved'));
      if (willBeHidden) {
        toast.info(t('kanban.messages.itemHiddenByFilter'), {
          action: { label: t('kanban.search.clearFilters'), onClick: clearFilters },
        });
      }
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error(t('kanban.messages.itemMoveError'));
    } finally {
      setDraggedItem(null);
      isDraggingRef.current = false;
      suppressClickUntilRef.current = Date.now() + 200;
    }
  };

  const handleDragEnd = () => {
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
      ['search', 'assignee', 'status', 'dateFrom', 'dateTo', 'label', 'priority', 'period'].forEach(
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
          (item.conversation?.labels ?? []).some(l => l.title === labelFilter);

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
          matchesPriority
        );
      });
    },
    [searchQuery, assigneeFilter, statusFilter, dateFrom, dateTo, labelFilter, priorityFilter],
  );

  const hasActiveFilters =
    searchQuery !== '' ||
    assigneeFilter !== '' ||
    statusFilter !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    labelFilter !== '' ||
    priorityFilter !== '';

  // Number of active filters shown on the "Filtros" chip badge (search excluded — it
  // has its own box). Date range counts as one regardless of period vs raw dates.
  const activeFilterCount =
    (assigneeFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (priorityFilter ? 1 : 0);

  // Consolidated "Filtros" popover (mockup) + which accordion section is expanded.
  const [filtersPopoverOpen, setFiltersPopoverOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<string | null>('assignee');

  // Memoize filtered items per stage to avoid recomputing 3× per stage per render
  const filteredItemsByStage = useMemo(() => {
    const map = new Map<string, PipelineItem[]>();
    for (const stage of stages) {
      map.set(stage.id, filterItems(stage.items || []));
    }
    return map;
  }, [stages, filterItems]);

  const totalFilteredCount = useMemo(
    () => Array.from(filteredItemsByStage.values()).reduce((t, items) => t + items.length, 0),
    [filteredItemsByStage],
  );

  const stagesWithResults = useMemo(
    () => Array.from(filteredItemsByStage.values()).filter(items => items.length > 0).length,
    [filteredItemsByStage],
  );

  const totalItemCount = useMemo(
    () => stages.reduce((total, stage) => total + (stage.items?.length || 0), 0),
    [stages],
  );

  // Defined pipeline attribute display-names (from custom_fields.attributes keys +
  // attribute_definitions). Names only — there is no per-pipeline filled value.
  const pipelineAttributeNames = useMemo(() => {
    const cf = pipeline?.custom_fields as
      | {
          attributes?: string[];
          attribute_definitions?: Record<string, { attribute_display_name?: string }>;
        }
      | undefined;
    const keys = cf?.attributes ?? [];
    const defs = cf?.attribute_definitions ?? {};
    return keys.map(k => defs[k]?.attribute_display_name || k);
  }, [pipeline]);


  // Per-column total: sum of the stage's cards' value. item.value === services_info
  // .total_value server-side (both = services_total_value); guard undefined with ?? 0.
  const calculateStageTotal = (items: PipelineItem[] = []) => {
    return items.reduce((total, item) => total + (item.value ?? item.services_info?.total_value ?? 0), 0);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Move a card to a target stage from the card menu (mirrors the drag-and-drop
  // moveItem path; both call pipelinesService.moveItem then reload).
  const moveItemToStage = async (item: PipelineItem, targetStageId: string) => {
    if (!pipelineId || item.stage_id === targetStageId) return;
    try {
      await pipelinesService.moveItem({
        item_id: item.id,
        pipeline_id: pipelineId,
        from_stage_id: item.stage_id,
        to_stage_id: targetStageId,
      });
      await loadPipelineData();
      toast.success(t('kanban.messages.itemMoved'));
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error(t('kanban.messages.itemMoveError'));
    }
  };

  // Pipeline management handlers
  const handleEditPipeline = () => {
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
      const code = (error as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code;
      toast.error(
        code === 'CANNOT_DELETE_PIPELINE_WITH_CONVERSATIONS'
          ? t('messages.deleteBlockedActiveItems')
          : t('messages.deleteError'),
      );
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

  const handleEditItem = (item: PipelineItem) => {
    setItemToEdit(item);
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (data: {
    notes: string;
    stage_id: string;
    services: Array<{ name: string; value: string }>;
    currency: string;
    custom_attributes?: Record<string, unknown>;
  }) => {
    if (!itemToEdit || !pipelineId) return;

    setIsEditingItem(true);
    try {
      await pipelinesService.updateItemInPipeline(pipelineId, itemToEdit.id, {
        pipeline_stage_id: data.stage_id,
        notes: data.notes,
        custom_fields: {
          services: data.services,
          currency: data.currency,
          // Merge custom attributes into custom_fields (backend expects them here)
          ...(data.custom_attributes || {}),
        },
      });
      toast.success(t('kanban.messages.itemUpdated'));
      setShowEditItemModal(false);
      setItemToEdit(null);
      // Reload pipeline data to reflect changes
      await loadPipelineData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(t('kanban.messages.itemUpdateError'));
    } finally {
      setIsEditingItem(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex w-full h-full min-w-0 overflow-hidden">
      <div className="flex-1 h-full flex flex-col bg-muted/30 min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 bg-background border-b border-border shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:py-3">
              {/* Navigation and Pipeline Info */}
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/pipelines')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>

                {/* Pipeline identity: themed icon tile + name (with a switch-pipeline
                    dropdown arrow) + description + badges + edit pencil. */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                  <GitBranch className="w-[19px] h-[19px]" />
                </div>
                <div className="min-w-0">
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
                          <h1 className="text-base font-bold text-foreground truncate">
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
                            className={p.id === pipeline?.id ? 'bg-primary/10 text-primary' : ''}
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
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
                        {t('pipelinesTable.status.inactive')}
                      </span>
                    )}
                    {pipeline?.is_default && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        {t('pipelinesTable.default')}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditPipeline}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary shrink-0"
                      aria-label={t('kanban.header.editPipeline')}
                    >
                      <Edit className="w-[15px] h-[15px]" />
                    </Button>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground truncate">
                    {pipeline?.description || t('kanban.header.noDescription')}
                  </p>
                </div>
              </div>

              {/* Quick Stats and Actions */}
              <div className="flex w-full flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm lg:w-auto">
                <div className="text-center min-w-16">
                  <div className="font-semibold text-foreground">
                    {pipeline?.item_count || pipeline?.conversations_count || 0}
                  </div>
                  <div className="text-muted-foreground">{t('kanban.header.conversations')}</div>
                </div>
                <div className="text-center min-w-14">
                  <div className="font-semibold text-foreground">{stages.length}</div>
                  <div className="text-muted-foreground">{t('kanban.header.stages')}</div>
                </div>
                {/* Header total = SERVER pipeline value (whole pipeline, unfiltered).
                    It can exceed the sum of visible column sums when filters are active
                    — that's intended (header = true total; columns = current view).
                    Always shown (R$ 0,00 when empty), matching the mockup. */}
                <div className="text-center min-w-20">
                  <div className="font-semibold text-primary whitespace-nowrap">
                    R$ {formatCurrency(pipeline?.services_info?.total_value ?? 0)}
                  </div>
                  <div className="text-muted-foreground">{t('kanban.header.totalValue')}</div>
                </div>

                {/* Pipeline Options Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
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

            {/* Green attribute chips (defined pipeline attributes — names only; per-item
                values have no pipeline-scope home). Hidden when none. */}
            {pipelineAttributeNames.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
                {pipelineAttributeNames.map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}

            {/* Search & consolidated Filtros bar */}
            <div className="border-t border-border/50 py-2.5">
              <div className="flex items-center gap-3">
                {/* Search input */}
                <div className="relative w-[300px] shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={t('kanban.search.placeholder')}
                    value={searchInput}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                  {searchInput && (
                    <button
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => handleSearchChange('')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Consolidated Filtros popover */}
                <Popover open={filtersPopoverOpen} onOpenChange={setFiltersPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-9 gap-2 whitespace-nowrap ${activeFilterCount > 0 ? 'border-primary/40 bg-primary/5 text-primary' : ''}`}
                    >
                      <Filter className="w-4 h-4" />
                      {t('kanban.search.filters')}
                      {activeFilterCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[300px] p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">
                        {t('kanban.search.filters')}
                      </span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={clearFilters}
                          className="text-xs font-semibold text-primary hover:text-primary/70 transition-colors"
                        >
                          {t('kanban.search.clearFilters')}
                        </button>
                      )}
                    </div>

                    <div className="max-h-[380px] overflow-y-auto p-2 space-y-1.5">
                      {/* Responsável */}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <button
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                          onClick={() => setFilterSection(s => (s === 'assignee' ? null : 'assignee'))}
                        >
                          <span className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
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
                              {!assigneeFilter && <Check className="w-4 h-4 text-primary" />}
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
                                {assigneeFilter === a.id && <Check className="w-4 h-4 text-primary shrink-0" />}
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
                            <CircleDot className="w-4 h-4 text-primary" />
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
                              {!statusFilter && <Check className="w-4 h-4 text-primary" />}
                            </button>
                            {(['open', 'pending', 'resolved', 'snoozed'] as const).map(s => (
                              <button
                                key={s}
                                onClick={() => updateFilters({ status: s })}
                                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColorHex(s) }} />
                                <span className="flex-1 text-left text-foreground">{t(`kanban.search.status.${s}`)}</span>
                                {statusFilter === s && <Check className="w-4 h-4 text-primary shrink-0" />}
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
                            <Calendar className="w-4 h-4 text-primary" />
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
                                {(periodFilter === p.key || (!periodFilter && !p.key)) && <Check className="w-4 h-4 text-primary" />}
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
                            <AlertCircle className="w-4 h-4 text-primary" />
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
                              {!priorityFilter && <Check className="w-4 h-4 text-primary" />}
                            </button>
                            {(['alta', 'media', 'baixa'] as const).map(p => (
                              <button
                                key={p}
                                onClick={() => updateFilters({ priority: p })}
                                className="flex items-center gap-2.5 w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_HEX[p] }} />
                                <span className="flex-1 text-left text-foreground">{t(`kanban.search.priority.${p}`)}</span>
                                {priorityFilter === p && <Check className="w-4 h-4 text-primary shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 px-3 py-2.5 border-t border-border">
                      <Button variant="outline" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0}>
                        {t('kanban.search.clearFilters')}
                      </Button>
                      <Button size="sm" onClick={() => setFiltersPopoverOpen(false)}>
                        {t('kanban.search.apply')}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Inline clear when any filter active */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-primary hover:bg-primary/10"
                    onClick={clearFilters}
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    {t('kanban.search.clearFilters')}
                  </Button>
                )}

                {/* Results summary */}
                {hasActiveFilters && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {t('kanban.search.resultsCount', {
                      count: totalFilteredCount,
                      total: totalItemCount,
                      stages: stagesWithResults,
                    })}
                  </span>
                )}
              </div>

              {/* Global empty state: all stages empty with active filters */}
              {hasActiveFilters && totalFilteredCount === 0 && (
                <div className="flex items-center gap-3 py-2 px-3 mt-2 rounded-lg bg-muted/60 border border-border/50">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">
                    {t('kanban.search.globalNoResults')}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                    {t('kanban.search.clearFilters')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-x-auto overflow-y-hidden px-4 sm:px-6 lg:px-8 py-6">
            {/* Kanban Content */}
            <div
              className="flex gap-6 h-full pb-6"
              style={{ width: 'fit-content', minWidth: '100%' }}
            >
              {/* Stage Columns */}
              {stages.map((stage: PipelineStage) => {
                const stageItems = filteredItemsByStage.get(stage.id) || [];
                const stageSum = calculateStageTotal(stage.items);
                return (
                <div key={stage.id} className="flex-shrink-0" style={{ flex: '0 0 340px' }}>
                  <div className="bg-background rounded-xl border border-border h-full flex flex-col overflow-hidden">
                    {/* Stage Header — clean: color only on the top border + dot */}
                    <div
                      className="flex-shrink-0 flex items-center justify-between gap-2 px-3.5 py-3 border-b border-border border-t-[3px]"
                      style={{ borderTopColor: stage.color }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-[9px] h-[9px] rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                        <h3 className="text-sm font-bold text-foreground truncate">{stage.name}</h3>
                        <span className="text-[13px] text-muted-foreground shrink-0">
                          {hasActiveFilters
                            ? `${stageItems.length}/${stage.items?.length || stage.item_count || 0}`
                            : (stage.items?.length || stage.item_count || 0)}
                        </span>
                        {stageSum > 0 && (
                          <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
                            R$ {formatCurrency(stageSum)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
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
                      className="flex-1 overflow-y-auto p-3 space-y-3"
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, stage.id)}
                    >
                      {stageItems.map(item => {
                        const pBucket = priorityBucket(item.conversation?.priority);
                        const firstLabel = item.conversation?.labels?.[0]?.title;
                        const moveTargets = stages.filter(s => s.id !== item.stage_id);
                        return (
                        <div
                          key={item.id}
                          className="group relative bg-background rounded-xl p-3.5 border border-border hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer select-none"
                          draggable
                          onDragStart={() => handleDragStart(item)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (isDraggingRef.current || Date.now() <= suppressClickUntilRef.current) return;
                            // Clicking a card ALWAYS opens the detail ficha (mockup §3.5).
                            // "Abrir conversa" lives in the ⋮ menu for conversation items.
                            handleEditItem(item);
                          }}
                        >
                          {/* Card menus: move + ⋮ */}
                          <div
                            className="absolute top-2 right-2 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            onClick={e => e.stopPropagation()}
                          >
                            {moveTargets.length > 0 && (
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

                          {/* Contact header */}
                          <div className="flex items-start gap-3 mb-2.5 pr-14">
                            <div
                              className="w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center text-white text-[13px] font-bold shadow-sm"
                              style={{ backgroundColor: getContactColor(item.contact?.name) }}
                            >
                              {item.contact?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-bold text-foreground truncate">
                                  {item.contact?.name || t('kanban.conversation.unknownUser')}
                                </h4>
                                {item.conversation?.display_id && (
                                  <span className="text-xs text-muted-foreground shrink-0">#{item.conversation.display_id}</span>
                                )}
                              </div>
                              {item.contact?.phone_number && (
                                <div className="flex items-center gap-1 text-[12.5px] text-muted-foreground mt-0.5">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{item.contact.phone_number}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Message preview */}
                          {item.conversation?.last_non_activity_message?.content && (
                            <div className="mb-2.5 p-2.5 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[12.5px] font-bold text-foreground truncate">
                                  {item.conversation.last_non_activity_message.sender?.name || t('kanban.conversation.system')}
                                </span>
                                <span className="text-[11.5px] text-muted-foreground shrink-0">
                                  {new Date(
                                    typeof item.conversation.last_non_activity_message.created_at === 'number'
                                      ? item.conversation.last_non_activity_message.created_at * 1000
                                      : item.conversation.last_non_activity_message.created_at,
                                  ).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p
                                className="text-[12.5px] text-muted-foreground line-clamp-2 leading-relaxed [&_p]:inline [&_br]:hidden"
                                dangerouslySetInnerHTML={{
                                  __html:
                                    item.conversation.last_non_activity_message.processed_message_content ||
                                    item.conversation.last_non_activity_message.content || '',
                                }}
                              />
                            </div>
                          )}

                          {/* Services value */}
                          {item.services_info?.has_services && item.services_info.total_value > 0 && (
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-[11.5px] text-muted-foreground">{t('kanban.conversation.valueLabel')}</span>
                              <span className="text-[12.5px] font-bold text-primary">{item.services_info.formatted_total}</span>
                            </div>
                          )}

                          {/* Footer: tag + priority + status */}
                          {(firstLabel || item.conversation?.status || pBucket) && (
                            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                              {firstLabel && (
                                <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground max-w-[120px] truncate">
                                  {firstLabel}
                                </span>
                              )}
                              {pBucket && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${PRIORITY_BADGE_CLASS[pBucket]}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  {t(`kanban.search.priority.${pBucket}`)}
                                </span>
                              )}
                              {item.conversation?.status && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[11.5px] font-bold px-2 py-0.5 rounded-md ${statusBadgeClass(item.conversation.status)}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  {t(`kanban.conversation.status.${item.conversation.status}`, item.conversation.status)}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Date + assignee */}
                          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.conversation?.last_activity_at
                                ? new Date(item.conversation.last_activity_at * 1000).toLocaleDateString('pt-BR')
                                : new Date((item.entered_at || 0) * 1000).toLocaleDateString('pt-BR')}
                            </span>
                            {item.conversation?.assignee && (
                              <span className="flex items-center gap-1 min-w-0">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-24">{item.conversation.assignee.name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        );
                      })}

                      {/* Empty note */}
                      {stageItems.length === 0 && (
                        <div className="text-center py-8 text-[13px] text-muted-foreground">
                          {hasActiveFilters ? t('kanban.search.noResults') : t('kanban.stage.noConversations')}
                        </div>
                      )}

                      {/* '+' ghost add row */}
                      <button
                        type="button"
                        onClick={() => handleAddItem(stage)}
                        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-[13.5px] font-semibold text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {t('kanban.item.addItemShort')}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}

              {/* Add Stage Column */}
              <div className="w-80 flex-shrink-0">
                <div
                  className="bg-muted/50 rounded-xl p-6 h-full border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                  onClick={() => setShowCreateStageModal(true)}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium mb-1">{t('kanban.stage.addStage')}</h3>
                  <p className="text-xs text-center">{t('kanban.stage.addStageDescription')}</p>
                </div>
              </div>

              {/* Empty state for no stages */}
              {stages.length === 0 && (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="text-center">
                    <div className="text-muted-foreground text-sm">
                      {t('kanban.stage.noStages')}
                    </div>
                  </div>
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

      {/* Edit Item Modal */}
      {itemToEdit && (
        <EditItemModal
          open={showEditItemModal}
          onOpenChange={setShowEditItemModal}
          item={itemToEdit}
          stages={stages}
          pipeline={pipeline}
          onSubmit={handleUpdateItem}
          loading={isEditingItem}
          onSchedule={it => {
            setSelectedConversationForSchedule(it);
            setScheduleActionOpen(true);
          }}
        />
      )}

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

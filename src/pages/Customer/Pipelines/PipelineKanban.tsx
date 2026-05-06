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
  Badge,
  Input,
} from '@evoapi/design-system';
import { Popover, PopoverContent, PopoverTrigger } from '@evoapi/design-system/popover';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  GripVertical,
  Edit,
  Trash2,
  Copy,
  ArrowUpDown,
  Phone,
  Mail,
  MessageSquare,
  User,
  CalendarClock,
  ListTodo,
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  X,
  Users,
  ChevronDown,
  Check,
  Tag,
  CircleDot,
  Calendar,
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
import PipelineSwitcher from '@/components/pipelines/PipelineSwitcher';
import EditPipelineModal from '@/components/pipelines/EditPipelineModal';
import CreateStageModal from '@/components/pipelines/CreateStageModal';
import AddItemModal from '@/components/pipelines/AddItemModal';
import RemoveItemModal from '@/components/pipelines/RemoveItemModal';
import EditItemModal from '@/components/pipelines/EditItemModal';
import EditStageModal from '@/components/pipelines/EditStageModal';
import DeleteStageModal from '@/components/pipelines/DeleteStageModal';
import DeletePipelineModal from '@/components/pipelines/DeletePipelineModal';
import ReorderStagesModal from '@/components/pipelines/ReorderStagesModal';
import { ScheduleActionModal } from '@/components/scheduledActions';

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

  const { agents, fetchAgents, isLoadingAgents } = useAppDataStore();

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
    }) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        const keys = ['search', 'assignee', 'status', 'dateFrom', 'dateTo', 'label'] as const;
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

  const clearFilters = useCallback(() => {
    // Cancel any pending debounce so it doesn't resurrect the search query
    // a few hundred ms after the user clicked "clear filters".
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchInput('');
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      ['search', 'assignee', 'status', 'dateFrom', 'dateTo', 'label'].forEach(k => next.delete(k));
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

        return matchesSearch && matchesAssignee && matchesStatus && matchesDateRange && matchesLabel;
      });
    },
    [searchQuery, assigneeFilter, statusFilter, dateFrom, dateTo, labelFilter],
  );

  const hasActiveFilters =
    searchQuery !== '' ||
    assigneeFilter !== '' ||
    statusFilter !== '' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    labelFilter !== '';

  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false);

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

  // Unique labels collected from all items currently loaded.
  // Always include the active labelFilter so the popover/chip stays interactive
  // even after the last matching card moves out of view.
  const uniqueLabels = useMemo(() => {
    const set = new Set<string>();
    for (const stage of stages) {
      for (const item of stage.items || []) {
        for (const label of item.conversation?.labels ?? []) {
          if (label?.title) set.add(label.title);
        }
      }
    }
    if (labelFilter) set.add(labelFilter);
    return Array.from(set).sort();
  }, [stages, labelFilter]);

  // Calculate stage total value
  const calculateStageTotal = (items: PipelineItem[] = []) => {
    return items.reduce((total, item) => {
      return total + (item.value || 0);
    }, 0);
  };

  // Calculate pipeline total value
  const calculatePipelineTotal = () => {
    return stages.reduce((total, stage) => {
      return total + calculateStageTotal(stage.items);
    }, 0);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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

                <div className="flex-1 min-w-0 max-w-full lg:max-w-2xl">
                  {/* Pipeline Selector */}
                  <PipelineSwitcher
                    pipelines={allPipelines}
                    selectedPipeline={pipeline}
                    onSwitchPipeline={handlePipelineChange}
                  />
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
                {calculatePipelineTotal() > 0 && (
                  <div className="text-center min-w-20">
                    <div className="font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      R$ {formatCurrency(calculatePipelineTotal())}
                    </div>
                    <div className="text-muted-foreground">{t('kanban.header.totalValue')}</div>
                  </div>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleAddItem()}
                  className="whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('kanban.header.addItem')}
                </Button>

                {/* Pipeline Options Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={handleDeletePipeline}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('kanban.header.deletePipeline')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search & Filter bar */}
            <div className="border-t border-border/50 py-2.5 space-y-2">
              <div className="flex items-center gap-2">
                {/* Search input — constrained width, não estica a tela toda */}
                <div className="relative w-64 shrink-0">
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

                {/* Assignee Popover */}
                <Popover
                  open={assigneePopoverOpen}
                  onOpenChange={open => {
                    setAssigneePopoverOpen(open);
                    if (open) fetchAgents(true);
                  }}
                >
                  <PopoverTrigger asChild>
                    {assigneeFilter ? (
                      /* Active state — chip with avatar + name + × to clear */
                      <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer select-none hover:bg-secondary/80 transition-colors">
                        {(() => {
                          const selected = uniqueAssignees.find(a => a.id === assigneeFilter);
                          return selected?.avatar_url ? (
                            <img
                              src={selected.avatar_url}
                              alt={selected.name}
                              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              onClick={() => setAssigneePopoverOpen(true)}
                            />
                          ) : (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: getContactColor(selected?.name) }}
                              onClick={() => setAssigneePopoverOpen(true)}
                            >
                              {selected?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          );
                        })()}
                        <span
                          className="max-w-28 truncate"
                          onClick={() => setAssigneePopoverOpen(true)}
                        >
                          {uniqueAssignees.find(a => a.id === assigneeFilter)?.name}
                        </span>
                        <button
                          className="ml-0.5 text-secondary-foreground/60 hover:text-secondary-foreground transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            updateFilters({ assignee: undefined });
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      /* Idle state — filter button */
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 whitespace-nowrap"
                      >
                        <User className="w-4 h-4" />
                        {t('kanban.search.assigneeFilter')}
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 p-2">
                    <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('kanban.search.assigneeFilter')}
                    </div>

                    {/* Team members list */}
                    {isLoadingAgents ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                        <div className="w-3.5 h-3.5 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        {t('kanban.search.loadingAgents')}
                      </div>
                    ) : uniqueAssignees.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <Users className="w-8 h-8 text-muted-foreground/30" />
                        <span className="text-xs text-muted-foreground">
                          {t('kanban.search.noAgents')}
                        </span>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-0.5">
                        {uniqueAssignees.map(assignee => (
                          <button
                            key={assignee.id}
                            onClick={() => {
                              updateFilters({ assignee: assignee.id });
                              setAssigneePopoverOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                          >
                            {assignee.avatar_url ? (
                              <img
                                src={assignee.avatar_url}
                                alt={assignee.name}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: getContactColor(assignee.name) }}
                              >
                                {assignee.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <span className="flex-1 text-left truncate text-foreground">{assignee.name}</span>
                            {assigneeFilter === assignee.id && (
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Status filter */}
                <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                  <PopoverTrigger asChild>
                    {statusFilter ? (
                      <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer select-none hover:bg-secondary/80 transition-colors">
                        <CircleDot className="w-4 h-4 flex-shrink-0" />
                        <span className="max-w-24 truncate">
                          {t(`kanban.search.status.${statusFilter}`, statusFilter)}
                        </span>
                        <button
                          className="ml-0.5 text-secondary-foreground/60 hover:text-secondary-foreground transition-colors"
                          onClick={e => { e.stopPropagation(); updateFilters({ status: undefined }); }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="h-9 gap-2 whitespace-nowrap">
                        <CircleDot className="w-4 h-4" />
                        {t('kanban.search.statusFilter')}
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-48 p-2">
                    <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('kanban.search.statusFilter')}
                    </div>
                    {(['open', 'resolved', 'pending', 'snoozed'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => { updateFilters({ status: s }); setStatusPopoverOpen(false); }}
                        className="flex items-center justify-between w-full px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                      >
                        <span className="text-foreground">{t(`kanban.search.status.${s}`)}</span>
                        {statusFilter === s && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Date range filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    {(dateFrom || dateTo) ? (
                      <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer select-none hover:bg-secondary/80 transition-colors">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="max-w-32 truncate">
                          {dateFrom && dateTo ? `${dateFrom} — ${dateTo}` : dateFrom ? `≥ ${dateFrom}` : `≤ ${dateTo}`}
                        </span>
                        <button
                          className="ml-0.5 text-secondary-foreground/60 hover:text-secondary-foreground transition-colors"
                          onClick={e => { e.stopPropagation(); updateFilters({ dateFrom: undefined, dateTo: undefined }); }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="h-9 gap-2 whitespace-nowrap">
                        <Calendar className="w-4 h-4" />
                        {t('kanban.search.dateRangeFilter')}
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-3 space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('kanban.search.dateRangeFilter')}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t('kanban.search.dateFrom')}</label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={e => updateFilters({ dateFrom: e.target.value || undefined })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t('kanban.search.dateTo')}</label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={e => updateFilters({ dateTo: e.target.value || undefined })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Label filter — only shown when pipeline items have labels */}
                {uniqueLabels.length > 0 && (
                  <Popover open={labelPopoverOpen} onOpenChange={setLabelPopoverOpen}>
                    <PopoverTrigger asChild>
                      {labelFilter ? (
                        <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer select-none hover:bg-secondary/80 transition-colors">
                          <Tag className="w-4 h-4 flex-shrink-0" />
                          <span className="max-w-24 truncate">{labelFilter}</span>
                          <button
                            className="ml-0.5 text-secondary-foreground/60 hover:text-secondary-foreground transition-colors"
                            onClick={e => { e.stopPropagation(); updateFilters({ label: undefined }); }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-9 gap-2 whitespace-nowrap">
                          <Tag className="w-4 h-4" />
                          {t('kanban.search.labelFilter')}
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-48 p-2">
                      <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('kanban.search.labelFilter')}
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-0.5">
                        {uniqueLabels.map(label => (
                          <button
                            key={label}
                            onClick={() => { updateFilters({ label }); setLabelPopoverOpen(false); }}
                            className="flex items-center justify-between w-full px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                          >
                            <span className="text-foreground truncate">{label}</span>
                            {labelFilter === label && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Clear all filters */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground hover:text-foreground"
                    onClick={clearFilters}
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    {t('kanban.search.clearFilters')}
                  </Button>
                )}
              </div>

              {/* Active filter chips + results summary */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {t('kanban.search.resultsCount', {
                      count: totalFilteredCount,
                      total: totalItemCount,
                      stages: stagesWithResults,
                    })}
                  </span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      &ldquo;{searchQuery}&rdquo;
                      <button onClick={() => handleSearchChange('')} className="hover:text-primary/60 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {assigneeFilter && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {uniqueAssignees.find(a => a.id === assigneeFilter)?.name}
                      <button onClick={() => updateFilters({ assignee: undefined })} className="hover:text-primary/60 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {statusFilter && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {t(`kanban.search.status.${statusFilter}`, statusFilter)}
                      <button onClick={() => updateFilters({ status: undefined })} className="hover:text-primary/60 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {(dateFrom || dateTo) && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      <Calendar className="w-3 h-3" />
                      {dateFrom && dateTo ? `${dateFrom} — ${dateTo}` : dateFrom ? `≥ ${dateFrom}` : `≤ ${dateTo}`}
                      <button onClick={() => updateFilters({ dateFrom: undefined, dateTo: undefined })} className="hover:text-primary/60 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {labelFilter && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      <Tag className="w-3 h-3" />
                      {labelFilter}
                      <button onClick={() => updateFilters({ label: undefined })} className="hover:text-primary/60 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Global empty state: all stages empty with active filters */}
              {hasActiveFilters && totalFilteredCount === 0 && (
                <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/60 border border-border/50">
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
              {stages.map((stage: PipelineStage) => (
                <div key={stage.id} className="w-80 flex-shrink-0">
                  <div className="bg-background rounded-xl shadow-sm border border-border h-full flex flex-col">
                    {/* Stage Header */}
                    <div
                      className="flex-shrink-0 px-4 py-3 border-b border-border bg-muted/50 rounded-t-xl border-t-4"
                      style={{ borderTopColor: stage.color }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <h3 className="text-sm font-medium text-foreground">{stage.name}</h3>
                          <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                            {hasActiveFilters
                              ? `${(filteredItemsByStage.get(stage.id) || []).length}/${stage.items?.length || stage.item_count || 0}`
                              : (stage.items?.length || stage.item_count || 0)}
                          </span>
                          {/* Stage Total Value */}
                          {calculateStageTotal(stage.items) > 0 && (
                            <span className="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-full font-medium">
                              {t('kanban.stage.totalValue', {
                                value: formatCurrency(calculateStageTotal(stage.items)),
                              })}
                            </span>
                          )}
                        </div>

                        {/* Stage Options */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto p-1">
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
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteStage(stage)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('kanban.stage.deleteStage')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Items Drop Zone */}
                    <div
                      className="flex-1 overflow-y-auto p-4 space-y-3"
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, stage.id)}
                    >
                      {/* Items */}
                      {(filteredItemsByStage.get(stage.id) || []).map(item => (
                        <div
                          key={item.id}
                          className="group bg-background rounded-xl p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer select-none relative"
                          draggable
                          onDragStart={() => handleDragStart(item)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            if (isDraggingRef.current || Date.now() <= suppressClickUntilRef.current) {
                              return;
                            }
                            const conversationUuid = item.conversation?.uuid;
                            if (conversationUuid) {
                              navigate(`/conversations/${conversationUuid}`);
                              return;
                            }
                            handleEditItem(item);
                          }}
                        >
                          {/* Card Options Menu */}
                          <div
                            className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center space-x-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-1 hover:bg-muted"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('kanban.item.editItem')}
                                  </DropdownMenuItem>
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
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleRemoveItem(item)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('kanban.item.removeFromPipeline')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Contact Info Header */}
                          <div className="flex items-start space-x-3 mb-3">
                            <div className="relative">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                                style={{
                                  backgroundColor: getContactColor(item.contact?.name),
                                }}
                              >
                                {item.contact?.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              {/* Online indicator */}
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-background rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="text-sm font-semibold text-foreground truncate">
                                  {item.contact?.name || t('kanban.conversation.unknownUser')}
                                </h4>
                                <span className="text-xs text-muted-foreground font-medium">
                                  #{item.conversation?.display_id}
                                </span>
                              </div>
                              {/* Contact details */}
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                {item.contact?.phone_number && (
                                  <span className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3" />
                                    <span className="truncate max-w-20">
                                      {item.contact.phone_number}
                                    </span>
                                  </span>
                                )}
                                {item.contact?.email && (
                                  <span className="flex items-center space-x-1">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate max-w-20">{item.contact?.email}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Last Message Preview */}
                          {item.conversation?.last_non_activity_message?.content && (
                            <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border">
                              <div className="flex items-start space-x-2">
                                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-xs font-medium text-foreground">
                                      {item.conversation.last_non_activity_message.sender?.name ||
                                        t('kanban.conversation.system')}
                                    </span>
                                  </div>
                                  <p
                                    className="text-sm text-foreground line-clamp-2 leading-relaxed [&_p]:inline [&_br]:hidden"
                                    dangerouslySetInnerHTML={{
                                      __html:
                                        item.conversation.last_non_activity_message
                                          .processed_message_content ||
                                        item.conversation.last_non_activity_message.content || '',
                                    }}
                                  />
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        typeof item.conversation.last_non_activity_message
                                          .created_at === 'number'
                                          ? item.conversation.last_non_activity_message.created_at *
                                            1000
                                          : item.conversation.last_non_activity_message.created_at,
                                      ).toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    {item.conversation.last_non_activity_message?.message_type !==
                                      undefined && (
                                      <span className="text-xs text-muted-foreground">
                                        {item.conversation.last_non_activity_message
                                          .message_type === 0
                                          ? t('kanban.conversation.incoming', 'Incoming')
                                          : item.conversation.last_non_activity_message
                                              .message_type === 1
                                          ? t('kanban.conversation.outgoing', 'Outgoing')
                                          : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Inbox and Status Row */}
                          <div className="flex items-center justify-between mb-3">
                            {!item.is_lead && (
                              <div className="flex items-center space-x-2 text-xs">
                                <div className="flex items-center space-x-1 px-2 py-1 bg-muted/50 rounded-md">
                                  <div className="w-3 h-3 text-muted-foreground">
                                    <svg fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                  <span className="text-foreground font-medium truncate max-w-16">
                                    {item.conversation?.inbox?.name ||
                                      t('kanban.conversation.noInbox')}
                                  </span>
                                </div>
                              </div>
                            )}
                            {!item.is_lead && (
                              <div className="flex items-center space-x-2">
                                {/* Status badge */}
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    item.conversation?.status === 'open'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      : item.conversation?.status === 'resolved'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                  }`}
                                >
                                  {item.conversation?.status === 'open'
                                    ? t('kanban.conversation.status.open')
                                    : item.conversation?.status === 'resolved'
                                    ? t('kanban.conversation.status.resolved')
                                    : item.conversation?.status ||
                                      t('kanban.conversation.status.unknown')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Services Total Value */}
                          {item.services_info?.has_services &&
                            item.services_info.total_value > 0 && (
                              <div className="mb-3 pt-2 border-t border-border">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                    <div className="w-3 h-3">
                                      <svg fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                    <span className="font-medium">
                                      {t('kanban.conversation.valueLabel')}
                                    </span>
                                  </div>
                                  <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                                    {item.services_info.formatted_total}
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Tasks Summary - Compact and Visual */}
                          {(item.tasks_info?.pending_count > 0 ||
                            item.tasks_info?.overdue_count > 0 ||
                            item.tasks_info?.due_soon_count > 0 ||
                            item.tasks_info?.completed_count > 0) && (
                            <div className="mb-3 flex items-center gap-1.5 flex-wrap">
                              <div className="text-sm">{t('tasks.title')}</div>
                              {/* Tasks vencidas - Prioridade máxima */}
                              {item.tasks_info?.overdue_count > 0 && (
                                <Badge
                                  title={t('tasks.status.overdue')}
                                  variant="destructive"
                                  className="h-5 px-1.5 text-xs"
                                >
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  {item.tasks_info.overdue_count}
                                </Badge>
                              )}

                              {/* Tasks próximas do vencimento */}
                              {item.tasks_info?.due_soon_count > 0 && (
                                <Badge
                                  title={t('tasks.status.dueSoon')}
                                  className="h-5 px-1.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {item.tasks_info.due_soon_count}
                                </Badge>
                              )}

                              {/* Tasks pendentes (sem urgência) */}
                              {item.tasks_info?.pending_count > 0 &&
                                !item.tasks_info?.overdue_count &&
                                !item.tasks_info?.due_soon_count && (
                                  <Badge
                                    title={t('tasks.status.pending')}
                                    variant="secondary"
                                    className="h-5 px-1.5 text-xs"
                                  >
                                    <ListTodo className="w-3 h-3 mr-1" />
                                    {item.tasks_info.pending_count}
                                  </Badge>
                                )}

                              {/* Tasks concluídas */}
                              {item.tasks_info?.completed_count > 0 && (
                                <Badge
                                  title={t('tasks.status.completed')}
                                  className="h-5 px-1.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {item.tasks_info.completed_count}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Time and assignee info */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1 text-muted-foreground">
                              <div className="w-3 h-3">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                              <span>
                                {item.conversation?.last_activity_at
                                  ? new Date(
                                      item.conversation.last_activity_at * 1000,
                                    ).toLocaleDateString('pt-BR')
                                  : new Date((item.entered_at || 0) * 1000).toLocaleDateString(
                                      'pt-BR',
                                    )}
                              </span>
                            </div>

                            {/* Assignee */}
                            {item.conversation?.assignee && (
                              <div className="flex items-center space-x-1 text-muted-foreground">
                                <User className="w-3 h-3" />
                                <span className="truncate max-w-20">
                                  {item.conversation.assignee.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Empty state */}
                      {(filteredItemsByStage.get(stage.id) || []).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-sm">
                            {hasActiveFilters
                              ? t('kanban.search.noResults')
                              : t('kanban.stage.noConversations')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

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
    </div>
  );
}

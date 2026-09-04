import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import { pipelinesService } from '@/services/pipelines';
import { pipelineDeleteErrorKey } from '@/utils/pipelineDeleteError';
import {
  Pipeline,
  PipelinesState,
  PipelinesListParams,
  PipelineDependents,
  UpdatePipelineData,
} from '@/types/analytics';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

import {
  PipelinesHeader,
  PipelinesTable,
  EditPipelineModal,
  DuplicatePipelineModal,
} from '@/components/pipelines/index';
import { PipelinesTour } from '@/tours';

const INITIAL_STATE: PipelinesState = {
  pipelines: [],
  selectedPipelineIds: [],
  meta: {
    pagination: {
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
      total: 0,
      total_pages: 0,
    },
  },
  loading: {
    list: false,
    create: false,
    update: false,
    delete: false,
    duplicate: false,
  },
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

export default function Pipelines() {
  const { t } = useLanguage('pipelines');
  const { can, isReady: permissionsReady } = usePermissions();
  const navigate = useNavigate();
  const [state, setState] = useState<PipelinesState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState<Pipeline | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [pipelineToDuplicate, setPipelineToDuplicate] = useState<Pipeline | null>(null);
  const [pendingDeactivation, setPendingDeactivation] = useState<{
    pipeline: Pipeline;
    dependents: PipelineDependents | null;
    loading: boolean;
    // Distinct from `dependents: null` on its own: the user must be able to tell "nothing
    // depends on this" from "we could not find out".
    failed: boolean;
  } | null>(null);

  // Load pipelines
  const loadPipelines = useCallback(
    async (params?: Partial<PipelinesListParams>) => {
      if (!can('pipelines', 'read')) {
        toast.error(t('messages.noPermissionRead'));
        return;
      }

      setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

      try {
        const requestParams: PipelinesListParams = {
          page: state.meta.pagination.page,
          per_page: state.meta.pagination.page_size,
          sort: 'name',
          order: 'asc',
          ...params,
          // Not a default a caller may override: this is the management screen, and
          // reactivation (AC3) only exists while the deactivated pipeline stays listed
          // with its badge and its "Activate" action.
          include_inactive: true,
        };

        const response = await pipelinesService.getPipelines(requestParams);

        setState(prev => ({
          ...prev,
          pipelines: response.data,
          meta: {
            pagination: {
              page: response.meta?.pagination?.page || 1,
              page_size: response.meta?.pagination?.page_size || DEFAULT_PAGE_SIZE,
              total: response.meta?.pagination?.total || 0,
              total_pages: response.meta?.pagination?.total_pages || 1,
              has_next_page: response.meta?.pagination?.has_next_page || false,
              has_previous_page: response.meta?.pagination?.has_previous_page || false,
            },
          },
          loading: { ...prev.loading, list: false },
        }));
      } catch (error) {
        console.error('Error loading pipelines:', error);
        toast.error(t('messages.loadError'));
        setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
      }
    },
    [state.meta.pagination.page, state.meta.pagination.page_size, can, t],
  );

  usePermissionGatedLoad({
    resource: 'pipelines',
    load: loadPipelines,
    onDenied: () => toast.error(t('messages.noPermissionRead')),
  });

  // Handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      meta: {
        pagination: {
          ...prev.meta.pagination,
          page: 1,
        },
      },
    }));

    // Reload with new search
    loadPipelines({ page: 1, q: query || undefined });
  };

  const handleCreatePipeline = () => {
    if (!can('pipelines', 'create')) {
      toast.error(t('messages.noPermissionCreate'));
      return;
    }
    navigate('/pipelines/new');
  };

  const handleEditPipeline = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline);
    setEditModalOpen(true);
  };

  const handleDeletePipeline = (pipeline: Pipeline) => {
    setPipelineToDelete(pipeline);
    setDeleteDialogOpen(true);
  };

  const handleDuplicatePipeline = (pipeline: Pipeline) => {
    setPipelineToDuplicate(pipeline);
    setDuplicateModalOpen(true);
  };

  // Deactivating hides the pipeline from every picker while whatever feeds it keeps
  // running. Ask first, naming what we could find (EVO-2200).
  const handleToggleStatus = async (pipeline: Pipeline) => {
    if (!pipeline.is_active) {
      applyToggleStatus(pipeline);
      return;
    }

    setPendingDeactivation({ pipeline, dependents: null, loading: true, failed: false });

    try {
      const dependents = await pipelinesService.getDependents(pipeline.id);
      setPendingDeactivation({ pipeline, dependents, loading: false, failed: false });
    } catch {
      // The confirmation is a courtesy, not a gate: if we cannot list what depends on the
      // pipeline, still let the user decide — but say so, instead of letting the silence
      // read as an all-clear.
      setPendingDeactivation({ pipeline, dependents: null, loading: false, failed: true });
    }
  };

  const applyToggleStatus = async (pipeline: Pipeline) => {
    const requestedState = !pipeline.is_active;

    try {
      const updated = await pipelinesService.togglePipelineStatus(pipeline.id, requestedState);
      await loadPipelines();

      // Success is only reported when the API persisted the state we asked for, and only
      // after the list reflects it. An update the API silently dropped comes back with the
      // old state — that is a failure, not a success for the opposite action (EVO-2122).
      if (updated.is_active !== requestedState) {
        toast.error(t('messages.toggleError'));
        return;
      }

      toast.success(
        requestedState ? t('messages.activateSuccess') : t('messages.deactivateSuccess'),
      );
    } catch (error) {
      console.error('Error toggling pipeline status:', error);
      toast.error(t('messages.toggleError'));
    }
  };

  const handleSetAsDefault = async (pipeline: Pipeline) => {
    if (!can('pipelines', 'update')) {
      toast.error(t('messages.noPermissionUpdate'));
      return;
    }

    try {
      await pipelinesService.setAsDefault(pipeline.id);
      toast.success(t('messages.setAsDefaultSuccess'));
      loadPipelines();
    } catch (error) {
      console.error('Error setting pipeline as default:', error);
      toast.error(t('messages.setAsDefaultError'));
    }
  };

  const handleViewPipeline = (pipeline: Pipeline) => {
    navigate(`/pipelines/${pipeline.id}`);
  };

  // Update pipeline
  const handleUpdatePipelineSubmit = async (data: UpdatePipelineData) => {
    if (!editingPipeline) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, update: true } }));

    try {
      await pipelinesService.updatePipeline(editingPipeline.id, data);
      toast.success(t('messages.updateSuccess'));
      loadPipelines();
      setEditModalOpen(false);
      setEditingPipeline(null);
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error(t('messages.updateError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, update: false } }));
    }
  };

  // Delete pipeline
  const confirmDeletePipeline = async () => {
    if (!pipelineToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await pipelinesService.deletePipeline(pipelineToDelete.id);
      toast.success(t('messages.deleteSuccess'));
      loadPipelines();
      setDeleteDialogOpen(false);
      setPipelineToDelete(null);
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      toast.error(t(pipelineDeleteErrorKey(error)));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Duplicate pipeline
  const handleDuplicatePipelineSubmit = async (data: { name: string; description?: string }) => {
    if (!pipelineToDuplicate) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, duplicate: true } }));

    try {
      const response = await pipelinesService.duplicatePipeline(pipelineToDuplicate.id, data);
      toast.success(t('messages.duplicateSuccess'));

      // Navigate to the new pipeline
      if (response.id) {
        navigate(`/pipelines/${response.id}`);
      } else {
        loadPipelines();
      }

      setDuplicateModalOpen(false);
      setPipelineToDuplicate(null);
    } catch (error) {
      console.error('Error duplicating pipeline:', error);
      toast.error(t('messages.duplicateError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, duplicate: false } }));
    }
  };

  // Filter pipelines by search
  const filteredPipelines = state.searchQuery
    ? state.pipelines.filter(
        pipeline =>
          pipeline.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          pipeline.description?.toLowerCase().includes(state.searchQuery.toLowerCase()),
      )
    : state.pipelines;

  return (
    <div className="h-full flex flex-col p-4">
      <PipelinesTour />
      <div data-tour="pipelines-header">
        <PipelinesHeader
          totalCount={state.meta.pagination.total}
          searchValue={state.searchQuery}
          onSearchChange={handleSearchChange}
          onNewPipeline={handleCreatePipeline}
          canCreate={permissionsReady && can('pipelines', 'create')}
        />
      </div>

      {/* Content — list only (the mockup has no card/grid mode). BaseTable renders
          its own loading + empty states, matching the Contacts screen. */}
      <div className="flex-1 overflow-auto mt-4" data-tour="pipelines-list">
        <PipelinesTable
          pipelines={filteredPipelines}
          loading={state.loading.list}
          onView={handleViewPipeline}
          onEdit={handleEditPipeline}
          onDelete={handleDeletePipeline}
          onDuplicate={handleDuplicatePipeline}
          onToggleStatus={handleToggleStatus}
          onSetAsDefault={handleSetAsDefault}
          onCreate={!state.searchQuery ? handleCreatePipeline : undefined}
          sortBy={state.sortBy}
          sortOrder={state.sortOrder}
          onSort={column => {
            const newOrder =
              state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
            setState(prev => ({ ...prev, sortBy: column, sortOrder: newOrder }));
            loadPipelines({
              sort: column as 'name' | 'created_at' | 'conversations_count',
              order: newOrder,
            });
          }}
        />
      </div>

      {/* Delete Pipeline Dialog */}
      <Dialog
        open={!!pendingDeactivation}
        onOpenChange={v => !v && setPendingDeactivation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.deactivatePipeline.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.deactivatePipeline.description', {
                name: pendingDeactivation?.pipeline.name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>

          {pendingDeactivation?.loading && (
            <p className="text-sm text-muted-foreground">
              {t('dialog.deactivatePipeline.checking')}
            </p>
          )}

          {pendingDeactivation?.failed && (
            <p className="text-sm text-destructive">
              {t('dialog.deactivatePipeline.lookupFailed')}
            </p>
          )}

          {!pendingDeactivation?.loading &&
            !pendingDeactivation?.failed &&
            pendingDeactivation?.dependents && (
              <div className="space-y-2">
                {pendingDeactivation.dependents.count ? (
                  <>
                    <p className="text-sm font-medium">
                      {/* Drafts do not receive submissions, so the alarm counts published
                          forms — but a pipeline fed only by drafts must not read as "0". */}
                      {pendingDeactivation.dependents.published_count > 0
                        ? t('dialog.deactivatePipeline.formsHeading', {
                            count: pendingDeactivation.dependents.published_count,
                          })
                        : t('dialog.deactivatePipeline.draftsHeading', {
                            count: pendingDeactivation.dependents.count,
                          })}
                    </p>

                    {pendingDeactivation.dependents.names_redacted ? (
                      <p className="text-sm text-muted-foreground">
                        {t('dialog.deactivatePipeline.namesRedacted', {
                          count: pendingDeactivation.dependents.count,
                        })}
                      </p>
                    ) : (
                      <ul className="max-h-40 overflow-y-auto space-y-1 text-sm text-muted-foreground">
                        {pendingDeactivation.dependents.crm_forms.map(form => (
                          <li key={form.id}>
                            {form.title || form.name}
                            {form.published
                              ? ` · ${t('dialog.deactivatePipeline.published')}`
                              : ` · ${t('dialog.deactivatePipeline.draft')}`}
                            {form.via === 'routing_rule' &&
                              ` · ${t('dialog.deactivatePipeline.viaRoutingRule')}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('dialog.deactivatePipeline.noForms')}
                  </p>
                )}

                {/* Only capture forms were inspected — state it on every successful
                    lookup, the empty one included, so the silence never reads as an
                    all-clear for automations and journeys (EVO-2199 children). */}
                <p className="text-xs text-muted-foreground">
                  {t('dialog.deactivatePipeline.partialWarning')}
                </p>
              </div>
            )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeactivation(null)}>
              {t('dialog.deactivatePipeline.cancel')}
            </Button>
            <Button
              onClick={() => {
                const target = pendingDeactivation?.pipeline;
                setPendingDeactivation(null);
                if (target) applyToggleStatus(target);
              }}
              disabled={pendingDeactivation?.loading}
            >
              {t('dialog.deactivatePipeline.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.deletePipeline.title')}</DialogTitle>
            <DialogDescription>{t('dialog.deletePipeline.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={state.loading.delete}
            >
              {t('dialog.deletePipeline.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePipeline}
              disabled={state.loading.delete}
            >
              {state.loading.delete
                ? t('dialog.deletePipeline.deleting')
                : t('dialog.deletePipeline.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pipeline Modal */}
      {editingPipeline && (
        <EditPipelineModal
          open={editModalOpen}
          onOpenChange={open => {
            if (!open) {
              setEditModalOpen(false);
              setEditingPipeline(null);
            }
          }}
          pipeline={editingPipeline}
          onSubmit={handleUpdatePipelineSubmit}
          loading={state.loading.update}
        />
      )}

      {/* Duplicate Pipeline Modal */}
      {pipelineToDuplicate && (
        <DuplicatePipelineModal
          open={duplicateModalOpen}
          onOpenChange={open => {
            if (!open) {
              setDuplicateModalOpen(false);
              setPipelineToDuplicate(null);
            }
          }}
          pipeline={pipelineToDuplicate}
          onSubmit={handleDuplicatePipelineSubmit}
          loading={state.loading.duplicate}
        />
      )}
    </div>
  );
}

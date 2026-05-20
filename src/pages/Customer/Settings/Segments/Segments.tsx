import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { Target } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';

import { useUserPermissions } from '@/hooks/useUserPermissions';
import { segmentsService } from '@/services/segments/segmentsService';
import { Segment, SegmentsState } from '@/types/analytics';

import SegmentsHeader from '@/components/segments/SegmentsHeader';
import SegmentsTable from '@/components/segments/SegmentsTable';
import SegmentsPagination from '@/components/segments/SegmentsPagination';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const INITIAL_STATE: SegmentsState = {
  segments: [],
  selectedSegmentIds: [],
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
    bulk: false,
  },
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

export default function Segments() {
  const { t } = useLanguage('segments');
  const { can, isReady: permissionsReady } = useUserPermissions();
  const navigate = useNavigate();
  const [state, setState] = useState<SegmentsState>(INITIAL_STATE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState<Segment | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [contactIdsDialogOpen, setContactIdsDialogOpen] = useState(false);
  const [selectedSegmentForIds, setSelectedSegmentForIds] = useState<Segment | null>(null);
  const [contactIds, setContactIds] = useState<string[]>([]);
  const hasLoaded = useRef(false);

  // Load segments
  const loadSegments = useCallback(async () => {
    if (!can('segments', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }

    setState(prev => ({ ...prev, loading: { ...prev.loading, list: true } }));

    try {
      const response = await segmentsService.getSegments({
        page: state.meta.pagination.page,
        limit: state.meta.pagination.page_size,
        search: state.searchQuery || undefined,
      });

      setState(prev => ({
        ...prev,
        segments: response.data,
        meta: {
          pagination: {
            page: response.meta.pagination.page,
            page_size: response.meta.pagination.page_size,
            total: response.meta.pagination.total,
            total_pages: response.meta.pagination.total_pages,
          },
        },
        loading: { ...prev.loading, list: false },
      }));
    } catch (error) {
      console.error('Error loading segments:', error);
      toast.error(t('messages.loadError'));
      setState(prev => ({ ...prev, loading: { ...prev.loading, list: false } }));
    }
  }, [can, state.meta.pagination.page, state.meta.pagination.page_size, state.searchQuery, t]);

  // Initial load
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady]);

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

    // Debounce search
    const timeoutId = setTimeout(() => {
      loadSegments();
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        pagination: {
          ...prev.meta.pagination,
          page: page,
        },
      },
    }));
    loadSegments();
  };

  const handlePerPageChange = (perPage: number) => {
    setState(prev => ({
      ...prev,
      meta: {
        pagination: {
          ...prev.meta.pagination,
          page_size: perPage,
          page: 1,
        },
      },
    }));
    loadSegments();
  };

  // Segment actions
  const handleCreateSegment = () => {
    if (!can('segments', 'create')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }
    navigate('/settings/segments/new');
  };

  const handleEditSegment = (segment: Segment) => {
    if (!can('segments', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    navigate(`/settings/segments/${segment.id}/edit`);
  };

  const handleDeleteSegment = (segment: Segment) => {
    if (!can('segments', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setSegmentToDelete(segment);
    setDeleteDialogOpen(true);
  };

  const handleRecomputeSegment = async (segment: Segment) => {
    try {
      await segmentsService.recomputeSegment(segment.id);
      toast.success(t('messages.recomputeSuccess'));
      loadSegments(); // Refresh to get updated counts
    } catch (error) {
      console.error('Error recomputing segment:', error);
      toast.error(t('messages.recomputeError'));
    }
  };

  const handleRecomputeAllSegments = async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      const result = await segmentsService.recomputeAllSegments();
      const totalSegments = result.results.length;
      const totalTimeSeconds = (result.totalProcessingTimeMs / 1000).toFixed(2);

      toast.success(
        t('messages.recomputeAllSuccess', { count: totalSegments, time: totalTimeSeconds }),
      );
      loadSegments(); // Refresh to get updated counts
    } catch (error) {
      console.error('Error recomputing all segments:', error);
      toast.error(t('messages.recomputeAllError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  const handleViewContactIds = async (segment: Segment) => {
    setSelectedSegmentForIds(segment);
    setContactIdsDialogOpen(true);

    try {
      const result = await segmentsService.getSegmentContactIds(segment.id, {
        limit: 1000,
        offset: 0,
      });
      setContactIds(result.contactIds);
    } catch (error) {
      console.error('Error loading contact IDs:', error);
      toast.error(t('messages.loadContactIdsError'));
    }
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (!can('segments', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  // Confirm delete single segment
  const confirmDeleteSegment = async () => {
    if (!segmentToDelete) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, delete: true } }));

    try {
      await segmentsService.deleteSegment(segmentToDelete.id);
      toast.success(t('messages.deleteSuccess'));

      // Refresh the list
      loadSegments();

      setDeleteDialogOpen(false);
      setSegmentToDelete(null);
    } catch (error) {
      console.error('Error deleting segment:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, delete: false } }));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (state.selectedSegmentIds.length === 0) return;

    setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: true } }));

    try {
      // Delete each selected segment
      await Promise.all(state.selectedSegmentIds.map(id => segmentsService.deleteSegment(id)));

      toast.success(t('messages.bulkDeleteSuccess', { count: state.selectedSegmentIds.length }));

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedSegmentIds: [] }));
      loadSegments();

      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error bulk deleting segments:', error);
      toast.error(t('messages.bulkDeleteError'));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, bulk: false } }));
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <SegmentsHeader
        totalCount={state.meta.pagination.total}
        selectedCount={state.selectedSegmentIds.length}
        searchValue={state.searchQuery}
        onSearchChange={handleSearchChange}
        onNewSegment={handleCreateSegment}
        onBulkDelete={handleBulkDelete}
        onRecomputeAll={handleRecomputeAllSegments}
        onClearSelection={() => setState(prev => ({ ...prev, selectedSegmentIds: [] }))}
        showBulkActions={state.selectedSegmentIds.length > 0}
        isRecomputingAll={state.loading.bulk}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto mt-6">
        {state.loading.list ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading')}</div>
          </div>
        ) : state.segments.length === 0 ? (
          <EmptyState
            icon={Target}
            title={t('empty.title')}
            description={t('empty.description')}
            action={{
              label: t('empty.action'),
              onClick: handleCreateSegment,
            }}
            className="h-full"
          />
        ) : (
          <SegmentsTable
            segments={state.segments}
            selectedSegments={state.segments.filter(segment =>
              state.selectedSegmentIds.includes(segment.id),
            )}
            loading={state.loading.list}
            onSelectionChange={segments =>
              setState(prev => ({
                ...prev,
                selectedSegmentIds: segments.map(s => s.id),
              }))
            }
            onEditSegment={handleEditSegment}
            onDeleteSegment={handleDeleteSegment}
            onCreateSegment={handleCreateSegment}
            onRecomputeSegment={handleRecomputeSegment}
            onViewContactIds={handleViewContactIds}
            sortBy={state.sortBy}
            sortOrder={state.sortOrder}
            onSort={column => {
              const newOrder =
                state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
              setState(prev => ({
                ...prev,
                sortBy: column as 'name' | 'created_at',
                sortOrder: newOrder,
              }));
              // In production, this would trigger a new API call with sort parameters
            }}
          />
        )}
      </div>

      {/* Pagination */}
      {state.meta.pagination.total > 0 && (
        <SegmentsPagination
          currentPage={state.meta.pagination.page}
          totalPages={state.meta.pagination.total_pages}
          totalCount={state.meta.pagination.total}
          perPage={state.meta.pagination.page_size}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
          loading={state.loading.list}
        />
      )}

      {/* Delete Segment Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.delete.description', { name: segmentToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={state.loading.delete}
            >
              {t('dialog.delete.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSegment}
              disabled={state.loading.delete}
            >
              {state.loading.delete ? t('dialog.delete.deleting') : t('dialog.delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.bulkDelete.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.bulkDelete.description', { count: state.selectedSegmentIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={state.loading.bulk}
            >
              {t('dialog.bulkDelete.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={state.loading.bulk}>
              {state.loading.bulk
                ? t('dialog.bulkDelete.deleting')
                : t('dialog.bulkDelete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact IDs Dialog */}
      <Dialog open={contactIdsDialogOpen} onOpenChange={setContactIdsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {t('dialog.contactIds.title', { name: selectedSegmentForIds?.name })}
            </DialogTitle>
            <DialogDescription>
              {t('dialog.contactIds.description', { count: contactIds.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto border rounded-md">
            <pre className="text-xs bg-gray-900 p-4 whitespace-pre-wrap">
              {JSON.stringify(contactIds, null, 2)}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(contactIds, null, 2));
                toast.success(t('messages.idsCopied'));
              }}
            >
              {t('actions.copyJson')}
            </Button>
            <Button onClick={() => setContactIdsDialogOpen(false)}>{t('actions.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

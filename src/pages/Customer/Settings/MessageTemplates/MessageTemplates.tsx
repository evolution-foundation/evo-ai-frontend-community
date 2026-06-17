import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@evoapi/design-system';
import { Edit, LayoutTemplate, Plus, Search, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { extractError } from '@/utils/apiHelpers';
import BaseTable, { type TableAction, type TableColumn } from '@/components/base/BaseTable';
import BasePagination from '@/components/base/BasePagination';
import GlobalMessageTemplateService, {
  inferTemplateProvider,
  type GlobalTemplateProvider,
} from '@/services/messageTemplates/globalMessageTemplatesService';
import GlobalTemplateFormModal from './components/GlobalTemplateFormModal';
import type { MessageTemplate, TemplateFormData } from '@/types';

export default function MessageTemplates() {
  const { t } = useLanguage('messageTemplates');
  const { can, isReady: permissionsReady } = useUserPermissions();

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MessageTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search: server-side filtering is authoritative (no client re-filter).
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const loadTemplates = useCallback(async () => {
    if (!can('message_templates', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await GlobalMessageTemplateService.getTemplates({
        page,
        per_page: DEFAULT_PAGE_SIZE,
        search: debouncedSearch || undefined,
        sort_by: 'name',
      });
      const pagination = response.meta?.pagination;
      setTemplates(response.data);
      setTotalPages(Math.max(1, Number(pagination?.total_pages) || 1));
      setTotalItems(Number(pagination?.total) || response.data.length);
      setPageSize(Number(pagination?.page_size) || DEFAULT_PAGE_SIZE);
    } catch (e) {
      toast.error(extractError(e).message || t('messages.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [can, t, debouncedSearch, page]);

  // Re-fetch only when permissions are ready or the page/search actually change.
  // Depending on `loadTemplates` would re-run this on every render: `can` from
  // useUserPermissions is a fresh closure each render, so `loadTemplates` (which
  // lists it as a dependency) is never referentially stable — that is what made
  // the screen fetch in an infinite loop. Gating on `permissionsReady` also
  // avoids a spurious "permission denied" toast before the permission cache loads.
  useEffect(() => {
    if (!permissionsReady) return;
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady, page, debouncedSearch]);

  const openCreate = () => {
    if (!can('message_templates', 'create')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (template: MessageTemplate) => {
    if (!can('message_templates', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditing(template);
    setFormOpen(true);
  };

  const handleSave = async (formData: TemplateFormData, provider: GlobalTemplateProvider) => {
    try {
      if (editing?.id) {
        await GlobalMessageTemplateService.updateTemplate(editing.id, formData, provider);
        toast.success(t('messages.updateSuccess'));
      } else {
        await GlobalMessageTemplateService.createTemplate(formData, provider);
        toast.success(t('messages.createSuccess'));
      }
      setEditing(null);
      await loadTemplates();
    } catch (e) {
      // Surface backend validation detail (e.g. duplicate name -> 422).
      toast.error(extractError(e).message || t(editing ? 'messages.updateError' : 'messages.createError'));
    }
  };

  const requestDelete = (template: MessageTemplate) => {
    if (!can('message_templates', 'delete')) {
      toast.error(t('messages.permissionDenied.delete'));
      return;
    }
    setDeleteTarget(template);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      await GlobalMessageTemplateService.deleteTemplate(deleteTarget.id);
      toast.success(t('messages.deleteSuccess'));
      setDeleteTarget(null);
      await loadTemplates();
    } catch (e) {
      toast.error(extractError(e).message || t('messages.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Global (channel-less) templates have no Meta approval flow, so the Meta
  // `status` is always null — show the local Active/Inactive state instead.
  const activeBadge = (template: MessageTemplate) => {
    const isActive = template.active !== false;
    return (
      <Badge className={isActive ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}>
        {t(`status.${isActive ? 'active' : 'inactive'}`)}
      </Badge>
    );
  };

  const columns: TableColumn<MessageTemplate>[] = [
    {
      key: 'name',
      label: t('table.name'),
      render: template => <span className="font-medium">{template.name}</span>,
    },
    {
      key: 'category',
      label: t('table.category'),
      render: template =>
        template.category ? (
          <Badge variant="secondary">{t(`categories.${template.category.toLowerCase()}`)}</Badge>
        ) : (
          '-'
        ),
    },
    {
      key: 'status',
      label: t('table.status'),
      render: template => activeBadge(template),
    },
    {
      key: 'language',
      label: t('table.language'),
      render: template => template.language || '-',
    },
  ];

  const actions: TableAction<MessageTemplate>[] = [
    ...(can('message_templates', 'update')
      ? [
          {
            label: t('table.edit'),
            icon: <Edit className="h-4 w-4" />,
            onClick: openEdit,
          },
        ]
      : []),
    ...(can('message_templates', 'delete')
      ? [
          {
            label: t('table.delete'),
            icon: <Trash2 className="h-4 w-4" />,
            onClick: requestDelete,
            variant: 'destructive' as const,
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('page.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('page.description')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t('newTemplate')}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="pl-10"
        />
      </div>

      <BaseTable
        data={templates}
        columns={columns}
        actions={actions}
        loading={isLoading}
        getRowKey={template => template.id ?? template.name}
        emptyIcon={LayoutTemplate}
        emptyTitle={t('emptyState.title')}
        emptyDescription={debouncedSearch ? t('emptyState.searchEmpty') : t('emptyState.description')}
        emptyAction={
          can('message_templates', 'create')
            ? { label: t('newTemplate'), onClick: openCreate }
            : undefined
        }
      />

      {totalItems > 0 && (
        <BasePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={pageSize}
          onPageChange={setPage}
        />
      )}

      <GlobalTemplateFormModal
        isOpen={formOpen}
        mode={editing ? 'edit' : 'create'}
        template={editing || undefined}
        initialProvider={editing ? inferTemplateProvider(editing) : 'generic'}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              {t('deleteDialog.message', { name: deleteTarget?.name })}
            </p>
            <p className="text-sm text-red-600 mt-2">{t('deleteDialog.warning')}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} loading={isDeleting}>
              {t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

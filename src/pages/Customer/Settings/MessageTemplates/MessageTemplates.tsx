import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@evoapi/design-system';
import { ChevronLeft, ChevronRight, Edit, LayoutTemplate, Plus, Search, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { extractError } from '@/utils/apiHelpers';
import GlobalMessageTemplateService, {
  inferTemplateProvider,
  type GlobalTemplateProvider,
} from '@/services/messageTemplates/globalMessageTemplatesService';
import GlobalTemplateFormModal from './components/GlobalTemplateFormModal';
import type { MessageTemplate, TemplateFormData } from '@/types';

export default function MessageTemplates() {
  const { t } = useLanguage('messageTemplates');
  const { can } = useUserPermissions();

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      setTemplates(response.data);
      setTotalPages(Math.max(1, Number(response.meta?.pagination?.total_pages) || 1));
    } catch (e) {
      toast.error(extractError(e).message || t('messages.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [can, t, debouncedSearch, page]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.name')}</TableHead>
                  <TableHead>{t('table.category')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.language')}</TableHead>
                  <TableHead className="w-28">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map(template => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>
                      {template.category ? (
                        <Badge variant="secondary">
                          {t(`categories.${template.category.toLowerCase()}`)}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{activeBadge(template)}</TableCell>
                    <TableCell>{template.language}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => requestDelete(template)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {templates.length === 0 && (
              <div className="p-8 text-center">
                <LayoutTemplate className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t('emptyState.title')}
                </h3>
                <p className="text-muted-foreground">
                  {debouncedSearch ? t('emptyState.searchEmpty') : t('emptyState.description')}
                </p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 p-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {t('pagination.pageOf', { page, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('pagination.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  {t('pagination.next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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

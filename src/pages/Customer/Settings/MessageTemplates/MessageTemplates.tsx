import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Edit, Eye, LayoutTemplate, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAppDataStore } from '@/store/appDataStore';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { extractError } from '@/utils/apiHelpers';
import BaseTable, { type TableAction, type TableColumn } from '@/components/base/BaseTable';
import BasePagination from '@/components/base/BasePagination';
import { TemplateFormModal, TemplatePreview } from '@/components/channels';
import MessageTemplateService, {
  supportsTemplateSync,
} from '@/services/channels/messageTemplatesService';
import GlobalMessageTemplateService, {
  inferTemplateProvider,
  providerToChannelType,
  type GlobalTemplateProvider,
} from '@/services/messageTemplates/globalMessageTemplatesService';
import { getStatusBadgeKey } from '@/components/chat/message-template/templateStatus';
import type { MessageTemplate, TemplateFormData } from '@/types';
import type { Inbox } from '@/types/channels/inbox';

/**
 * Unified message-templates screen (EVO-1907). A single screen manages templates
 * for every channel via a top scope selector:
 *  - "Global (no channel)" → channel-less templates via GlobalMessageTemplateService.
 *  - one entry per inbox → that channel's templates via the per-inbox
 *    MessageTemplateService (structured WhatsApp components + Meta sync as before).
 * Both reuse the shared <TemplateFormModal> (the former channel form). Email inboxes
 * route to the dedicated EmailTemplateEditor, exactly as the old per-channel tab did.
 */

type Scope = { kind: 'global' } | { kind: 'inbox'; inbox: Inbox };

const STATUS_STYLE: Record<string, string> = {
  approved: 'bg-green-600 dark:bg-green-500 text-white',
  pending: 'bg-yellow-600 dark:bg-yellow-500 text-white',
  rejected: 'bg-red-600 dark:bg-red-500 text-white',
  paused: 'bg-gray-600 dark:bg-gray-500 text-white',
  inactive: 'bg-gray-600 dark:bg-gray-500 text-white',
  unknown: 'bg-gray-400 dark:bg-gray-600 text-white',
};

export default function MessageTemplates() {
  const { t } = useLanguage('messageTemplates');
  // The shared <TemplatePreview> renders `settings.messageTemplates.*` keys, which
  // live in the `channels` namespace (same as the form modal).
  const { t: tChannels } = useLanguage('channels');
  const navigate = useNavigate();
  const { can, isReady: permissionsReady } = useUserPermissions();

  const inboxes = useAppDataStore(state => state.inboxes);
  const fetchInboxes = useAppDataStore(state => state.fetchInboxes);

  const [scope, setScope] = useState<Scope>({ kind: 'global' });

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  // Controlled channelType for the shared modal: the inbox's channel_type, or the
  // synthetic channel for the chosen provider in Global scope.
  const [formChannelType, setFormChannelType] = useState<string>('Channel::Api');

  const [deleteTarget, setDeleteTarget] = useState<MessageTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Read-only inspection (restores the per-channel tab's eye action, EVO-1971).
  const [previewTarget, setPreviewTarget] = useState<MessageTemplate | null>(null);

  // Channel type a row should be previewed/edited as: the inbox's own channel in
  // inbox scope, or the synthetic channel for the template's inferred provider in
  // Global scope.
  const channelTypeFor = useCallback(
    (template: MessageTemplate) =>
      scope.kind === 'inbox'
        ? scope.inbox.channel_type
        : providerToChannelType(inferTemplateProvider(template)),
    [scope],
  );

  useEffect(() => {
    fetchInboxes();
  }, [fetchInboxes]);

  // Debounce search; server-side filtering is authoritative (no client re-filter).
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
      const response =
        scope.kind === 'global'
          ? await GlobalMessageTemplateService.getTemplates({
              page,
              per_page: DEFAULT_PAGE_SIZE,
              search: debouncedSearch || undefined,
              sort_by: 'name',
            })
          : await MessageTemplateService.getTemplates(scope.inbox.id, {
              page,
              per_page: DEFAULT_PAGE_SIZE,
              search: debouncedSearch || undefined,
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
  }, [can, t, debouncedSearch, page, scope]);

  // Re-fetch only when permissions are ready or page/search/scope actually change.
  // Depending on `loadTemplates` would re-run on every render: `can` from
  // useUserPermissions is a fresh closure each render, so `loadTemplates` is never
  // referentially stable — that is what made the screen fetch in an infinite loop.
  useEffect(() => {
    if (!permissionsReady) return;
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady, page, debouncedSearch, scope]);

  const handleScopeChange = (value: string) => {
    if (value === 'global') {
      setScope({ kind: 'global' });
    } else {
      const inbox = inboxes.find(i => String(i.id) === value);
      if (inbox) setScope({ kind: 'inbox', inbox });
    }
    setPage(1);
  };

  const goToEmailEditor = (inbox: Inbox, templateId?: string) => {
    const base = `/settings/email-template-editor?inboxId=${inbox.id}&channelType=${encodeURIComponent(
      'Channel::Email',
    )}`;
    navigate(templateId ? `${base}&templateId=${templateId}` : base);
  };

  const openCreate = () => {
    if (scope.kind === 'inbox' && scope.inbox.channel_type === 'Channel::Email') {
      goToEmailEditor(scope.inbox);
      return;
    }
    if (!can('message_templates', 'create')) {
      toast.error(t('messages.permissionDenied.create'));
      return;
    }
    setEditing(null);
    setFormChannelType(
      scope.kind === 'inbox' ? scope.inbox.channel_type : providerToChannelType('generic'),
    );
    setFormOpen(true);
  };

  const openEdit = (template: MessageTemplate) => {
    if (scope.kind === 'inbox' && scope.inbox.channel_type === 'Channel::Email') {
      goToEmailEditor(scope.inbox, template.id);
      return;
    }
    if (!can('message_templates', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setEditing(template);
    setFormChannelType(
      scope.kind === 'inbox'
        ? scope.inbox.channel_type
        : providerToChannelType(inferTemplateProvider(template)),
    );
    setFormOpen(true);
  };

  const handleSave = async (formData: TemplateFormData) => {
    try {
      if (scope.kind === 'global') {
        const provider: GlobalTemplateProvider =
          formChannelType === 'Channel::Email' ? 'email' : 'generic';
        if (editing?.id) {
          await GlobalMessageTemplateService.updateTemplate(editing.id, formData, provider);
          toast.success(t('messages.updateSuccess'));
        } else {
          await GlobalMessageTemplateService.createTemplate(formData, provider);
          toast.success(t('messages.createSuccess'));
        }
      } else {
        const { inbox } = scope;
        if (editing?.id) {
          await MessageTemplateService.updateTemplate(
            inbox.id,
            editing.id,
            formData,
            inbox.channel_type,
          );
          toast.success(t('messages.updateSuccess'));
        } else {
          await MessageTemplateService.createTemplate(inbox.id, formData, inbox.channel_type);
          toast.success(t('messages.createSuccess'));
        }
      }
      setEditing(null);
      await loadTemplates();
    } catch (e) {
      toast.error(
        extractError(e).message || t(editing ? 'messages.updateError' : 'messages.createError'),
      );
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
      if (scope.kind === 'global') {
        await GlobalMessageTemplateService.deleteTemplate(deleteTarget.id);
      } else {
        await MessageTemplateService.deleteTemplate(scope.inbox.id, deleteTarget.id);
      }
      toast.success(t('messages.deleteSuccess'));
      setDeleteTarget(null);
      await loadTemplates();
    } catch (e) {
      toast.error(extractError(e).message || t('messages.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const canSync = scope.kind === 'inbox' && supportsTemplateSync(scope.inbox.channel_type);

  const handleSync = async () => {
    if (scope.kind !== 'inbox') return;
    setIsSyncing(true);
    try {
      await MessageTemplateService.syncTemplates(scope.inbox.id);
      toast.success(t('messages.syncSuccess'));
      await loadTemplates();
    } catch (e) {
      toast.error(extractError(e).message || t('messages.syncError'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Inbox scope → Meta approval status badge; Global scope → local active/inactive.
  const statusBadge = (template: MessageTemplate) => {
    if (scope.kind === 'inbox') {
      const key = getStatusBadgeKey(template);
      return (
        <Badge className={STATUS_STYLE[key] ?? STATUS_STYLE.unknown}>{t(`status.${key}`)}</Badge>
      );
    }
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
      render: template => statusBadge(template),
    },
    {
      key: 'language',
      label: t('table.language'),
      render: template => template.language || '-',
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      render: template =>
        template.created_at ? new Date(template.created_at).toLocaleDateString() : '-',
    },
  ];

  const actions: TableAction<MessageTemplate>[] = [
    {
      label: t('table.preview'),
      icon: <Eye className="h-4 w-4" />,
      onClick: setPreviewTarget,
    },
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

  const globalChannelOptions = useMemo(
    () => [
      { value: providerToChannelType('generic'), label: t('form.providers.generic') },
      { value: providerToChannelType('email'), label: t('form.providers.email') },
    ],
    [t],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('page.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('page.description')}</p>
        </div>
        <div className="flex gap-2">
          {canSync && (
            <Button variant="outline" onClick={handleSync} loading={isSyncing}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('actions.sync')}
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            {t('newTemplate')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:w-64">
          <label className="block text-sm font-medium mb-2">{t('scope.label')}</label>
          <Select
            value={scope.kind === 'global' ? 'global' : String(scope.inbox.id)}
            onValueChange={handleScopeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('inboxSelector.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">{t('scope.global')}</SelectItem>
              {inboxes.map(inbox => (
                <SelectItem key={inbox.id} value={String(inbox.id)}>
                  {inbox.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-10"
          />
        </div>
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

      <TemplateFormModal
        isOpen={formOpen}
        mode={editing ? 'edit' : 'create'}
        template={editing || undefined}
        channelType={formChannelType}
        defaultLanguage={scope.kind === 'global' ? 'pt_BR' : 'en_US'}
        channelOptions={scope.kind === 'global' ? globalChannelOptions : undefined}
        channelSelectLabel={t('form.provider')}
        categoryResetMessage={t('form.categoryReset')}
        headerNoneLabel={t('form.headerNone')}
        categoryHelp={t('form.categoryHelp')}
        insertEmojiLabel={t('form.insertEmoji')}
        insertVariableLabel={t('form.insertVariable')}
        variableHelpText={t('form.variableHelp')}
        variableSampleName={t('form.variableSample')}
        onChannelTypeChange={setFormChannelType}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      <Dialog open={!!previewTarget} onOpenChange={open => !open && setPreviewTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTarget?.name}</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="py-2">
              <TemplatePreview
                template={MessageTemplateService.transformToFrontendFormat(
                  previewTarget,
                  channelTypeFor(previewTarget),
                )}
                channelType={channelTypeFor(previewTarget)}
                t={tChannels}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

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

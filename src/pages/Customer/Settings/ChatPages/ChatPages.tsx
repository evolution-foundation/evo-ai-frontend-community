import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy, Loader2, MessageSquare } from 'lucide-react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@evoapi/design-system';
import BaseHeader from '@/components/base/BaseHeader';
import BasePagination from '@/components/base/BasePagination';
import EmptyState from '@/components/base/EmptyState';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { chatPagesService } from '@/services/chatPages/chatPagesService';
import type { ChatPage, ChatPagePayload, PaginationMeta, WebWidgetOption } from '@/types/chatPages';
import ChatPageModal from '@/components/chatPages/ChatPageModal';

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function ChatPages() {
  const { t } = useLanguage('chatPages');
  const { can, isReady } = useUserPermissions();
  const canCreate = can('chat_pages', 'create');
  const canUpdate = can('chat_pages', 'update');
  const canDelete = can('chat_pages', 'delete');

  const [pages, setPages] = useState<ChatPage[]>([]);
  const [widgets, setWidgets] = useState<WebWidgetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChatPage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatPage | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await chatPagesService.list({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search: search || undefined,
        published: published === 'all' ? undefined : published === 'true',
      });
      setPages(data);
      setPagination(meta.pagination ?? EMPTY_PAGINATION);
    } catch {
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, search, published, t]);

  const loadWidgets = useCallback(async () => {
    try {
      setWidgets(await chatPagesService.listWebWidgets());
    } catch {
      /* widget select degrades to the page's existing token */
    }
  }, []);

  useEffect(() => {
    if (isReady) loadWidgets();
  }, [isReady, loadWidgets]);

  useEffect(() => {
    if (isReady) loadPages();
  }, [isReady, loadPages]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (chatPage: ChatPage) => {
    setEditing(chatPage);
    setModalOpen(true);
  };

  const handleSave = async (payload: ChatPagePayload) => {
    setSaving(true);
    try {
      if (editing) await chatPagesService.update(editing.id, payload);
      else await chatPagesService.create(payload);
      toast.success(t('messages.saved'));
      setModalOpen(false);
      loadPages();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg || t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await chatPagesService.remove(deleteTarget.id);
      toast.success(t('messages.deleted'));
      setDeleteTarget(null);
      loadPages();
    } catch {
      toast.error(t('messages.deleteError'));
    }
  };

  const copyLink = (chatPage: ChatPage) => {
    const url = `${window.location.origin}/chat/${chatPage.slug}`;
    navigator.clipboard?.writeText(url);
    toast.success(t('actions.linkCopied'));
  };

  const isFiltered = !!search || published !== 'all';

  return (
    <div className="h-full flex flex-col p-4">
      <BaseHeader
        title={t('header.title')}
        subtitle={t('header.subtitle', { count: pagination.total })}
        searchPlaceholder={t('header.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        primaryAction={
          canCreate
            ? { label: t('header.newPage'), icon: <Plus className="h-4 w-4" />, onClick: openCreate }
            : undefined
        }
      />

      <div className="flex items-center gap-2 mt-4">
        <Select
          value={published}
          onValueChange={v => {
            setPublished(v as 'all' | 'true' | 'false');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.all')}</SelectItem>
            <SelectItem value="true">{t('filter.published')}</SelectItem>
            <SelectItem value="false">{t('filter.draft')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={isFiltered ? t('empty.titleFiltered') : t('empty.title')}
            description={isFiltered ? t('empty.descriptionFiltered') : t('empty.description')}
            action={canCreate && !isFiltered ? { label: t('empty.action'), onClick: openCreate } : undefined}
            className="h-full"
          />
        ) : (
          <div className="rounded-md border border-sidebar-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sidebar-border bg-sidebar-accent/50">
                  <th className="px-4 py-3 text-left font-medium text-sidebar-foreground">{t('table.name')}</th>
                  <th className="px-4 py-3 text-left font-medium text-sidebar-foreground hidden md:table-cell">
                    {t('table.publicLink')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-sidebar-foreground hidden md:table-cell">
                    {t('table.widget')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-sidebar-foreground hidden sm:table-cell">
                    {t('table.status')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-sidebar-foreground">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pages.map(chatPage => (
                  <tr
                    key={chatPage.id}
                    className="border-b border-sidebar-border last:border-0 hover:bg-sidebar-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-sidebar-foreground">
                      {chatPage.title || chatPage.display_title || chatPage.slug}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <button
                        onClick={() => copyLink(chatPage)}
                        className="inline-flex items-center gap-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                      >
                        <Copy className="w-3.5 h-3.5" /> /chat/{chatPage.slug}
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sidebar-foreground/70">
                      {chatPage.widget_inbox_name || '—'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={chatPage.published ? 'default' : 'secondary'} className="text-xs">
                        {chatPage.published ? t('status.published') : t('status.draft')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canUpdate && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(chatPage)} aria-label={t('actions.edit')}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(chatPage)}
                          aria-label={t('actions.delete')}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.total > 0 && (
        <BasePagination
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total}
          itemsPerPage={pagination.page_size}
          onPageChange={setPage}
        />
      )}

      <ChatPageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        initial={editing}
        widgets={widgets}
      />

      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('delete.description', { name: deleteTarget?.title || deleteTarget?.slug })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('delete.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy, Loader2, FileText } from 'lucide-react';
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
import { crmFormsService } from '@/services/crmForms/crmFormsService';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CrmForm, CrmFormPayload, FormLead, PaginationMeta } from '@/types/crmForms';
import type { Pipeline } from '@/types/analytics/pipelines';
import type { CustomAttributeDefinition } from '@/types/settings';
import CrmFormModal from '@/components/crmForms/CrmFormModal';

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function CrmForms() {
  const { t } = useLanguage('crmForms');
  const { can, isReady } = useUserPermissions();
  const canCreate = can('crm_forms', 'create');
  const canUpdate = can('crm_forms', 'update');
  const canDelete = can('crm_forms', 'delete');

  const [forms, setForms] = useState<CrmForm[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [contactAttrs, setContactAttrs] = useState<CustomAttributeDefinition[]>([]);
  const [dealAttrs, setDealAttrs] = useState<CustomAttributeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmForm | null>(null);
  const [leadsForm, setLeadsForm] = useState<CrmForm | null>(null);
  const [leads, setLeads] = useState<FormLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

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

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await crmFormsService.list({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search: search || undefined,
        published: published === 'all' ? undefined : published === 'true',
      });
      setForms(data);
      setPagination(meta.pagination ?? EMPTY_PAGINATION);
    } catch {
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, search, published, t]);

  const loadContext = useCallback(async () => {
    try {
      const [pipes, cAttrs, dAttrs] = await Promise.all([
        pipelinesService.getPipelines(),
        customAttributesService.getCustomAttributes('contact_attribute'),
        customAttributesService.getCustomAttributes('pipeline_item_attribute'),
      ]);
      setPipelines(pipes.data);
      setContactAttrs(cAttrs.data);
      setDealAttrs(dAttrs.data);
    } catch {
      /* selectors degrade to standard targets only */
    }
  }, []);

  useEffect(() => {
    if (isReady) loadContext();
  }, [isReady, loadContext]);

  useEffect(() => {
    if (isReady) loadForms();
  }, [isReady, loadForms]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (form: CrmForm) => {
    setEditing(form);
    setModalOpen(true);
  };

  const handleSave = async (payload: CrmFormPayload) => {
    setSaving(true);
    try {
      if (editing) await crmFormsService.update(editing.id, payload);
      else await crmFormsService.create(payload);
      toast.success(t('messages.saved'));
      setModalOpen(false);
      loadForms();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      toast.error(msg || t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await crmFormsService.remove(deleteTarget.id);
      toast.success(t('messages.deleted'));
      setDeleteTarget(null);
      loadForms();
    } catch {
      toast.error(t('messages.deleteError'));
    }
  };

  const copyLink = (form: CrmForm) => {
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard?.writeText(url);
    toast.success(t('actions.linkCopied'));
  };

  const openLeads = async (form: CrmForm) => {
    setLeadsForm(form);
    setLeads([]);
    setLeadsLoading(true);
    try {
      const { leads: list } = await crmFormsService.getLeads(form.id);
      setLeads(list);
    } catch {
      toast.error(t('messages.leadsError'));
    } finally {
      setLeadsLoading(false);
    }
  };

  const stageLabel = (lead: FormLead) => {
    const pipe = pipelines.find(p => p.id === lead.pipeline_id);
    const stage = pipe?.stages?.find(s => s.id === lead.pipeline_stage_id);
    return [pipe?.name, stage?.name].filter(Boolean).join(' › ') || '—';
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
            ? { label: t('header.newForm'), icon: <Plus className="h-4 w-4" />, onClick: openCreate }
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
        ) : forms.length === 0 ? (
          <EmptyState
            icon={FileText}
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
                  <th className="px-4 py-3 text-left font-medium text-sidebar-foreground hidden sm:table-cell">
                    {t('table.status')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-sidebar-foreground hidden sm:table-cell">
                    {t('table.leads')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-sidebar-foreground">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {forms.map(form => (
                  <tr
                    key={form.id}
                    className="border-b border-sidebar-border last:border-0 hover:bg-sidebar-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-sidebar-foreground">{form.title || form.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <button
                        onClick={() => copyLink(form)}
                        className="inline-flex items-center gap-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                      >
                        <Copy className="w-3.5 h-3.5" /> /f/{form.slug}
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={form.published ? 'default' : 'secondary'} className="text-xs">
                        {form.published ? t('status.published') : t('status.draft')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                      <button
                        onClick={() => openLeads(form)}
                        className="text-sidebar-foreground/80 hover:text-sidebar-foreground underline-offset-2 hover:underline"
                      >
                        {form.leads_count ?? 0}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canUpdate && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(form)} aria-label={t('actions.edit')}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(form)}
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

      <CrmFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        initial={editing}
        pipelines={pipelines}
        contactAttrs={contactAttrs}
        dealAttrs={dealAttrs}
      />

      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('delete.description', { name: deleteTarget?.title || deleteTarget?.name })}
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

      <Dialog open={!!leadsForm} onOpenChange={v => !v && setLeadsForm(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('leads.title', { name: leadsForm?.title || leadsForm?.name })}</DialogTitle>
          </DialogHeader>
          {leadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('leads.empty')}</p>
          ) : (
            <div className="rounded-md border border-sidebar-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sidebar-border bg-sidebar-accent/50">
                    <th className="px-4 py-3 text-left font-medium text-sidebar-foreground">{t('leads.contact')}</th>
                    <th className="px-4 py-3 text-left font-medium text-sidebar-foreground">{t('leads.destination')}</th>
                    <th className="px-4 py-3 text-left font-medium text-sidebar-foreground">{t('leads.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-b border-sidebar-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sidebar-foreground">{lead.contact?.name || '—'}</div>
                        <div className="text-xs text-sidebar-foreground/60">{lead.contact?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sidebar-foreground/70">{stageLabel(lead)}</td>
                      <td className="px-4 py-3 text-sidebar-foreground/70">
                        {lead.created_at ? new Date(lead.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

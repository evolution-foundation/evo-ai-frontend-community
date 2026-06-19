import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@evoapi/design-system';
import BaseHeader from '@/components/base/BaseHeader';
import BasePagination from '@/components/base/BasePagination';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
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

  // List controls (server-side filter / search / pagination)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);

  // Debounce the search input into the actual query.
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
      toast.error('Erro ao carregar formulários.');
    } finally {
      setLoading(false);
    }
  }, [page, search, published]);

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
      toast.success('Formulário salvo.');
      setModalOpen(false);
      loadForms();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      toast.error(msg || 'Erro ao salvar formulário.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await crmFormsService.remove(deleteTarget.id);
      toast.success('Formulário excluído.');
      setDeleteTarget(null);
      loadForms();
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  const copyLink = (form: CrmForm) => {
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard?.writeText(url);
    toast.success('Link copiado.');
  };

  const openLeads = async (form: CrmForm) => {
    setLeadsForm(form);
    setLeads([]);
    setLeadsLoading(true);
    try {
      const { leads: list } = await crmFormsService.getLeads(form.id);
      setLeads(list);
    } catch {
      toast.error('Erro ao carregar leads.');
    } finally {
      setLeadsLoading(false);
    }
  };

  const stageLabel = (lead: FormLead) => {
    const pipe = pipelines.find(p => p.id === lead.pipeline_id);
    const stage = pipe?.stages?.find(s => s.id === lead.pipeline_stage_id);
    return [pipe?.name, stage?.name].filter(Boolean).join(' › ') || '—';
  };

  return (
    <div className="h-full flex flex-col p-4">
      <BaseHeader
        title="Formulários de captura"
        subtitle={`${pagination.total} formulário${pagination.total !== 1 ? 's' : ''} · geram leads no pipeline`}
        searchPlaceholder="Buscar por nome, título ou slug…"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        primaryAction={
          canCreate
            ? { label: 'Novo formulário', icon: <Plus className="h-4 w-4" />, onClick: openCreate }
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
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="true">Publicados</SelectItem>
            <SelectItem value="false">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto mt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search || published !== 'all' ? 'Nenhum formulário para esse filtro.' : 'Nenhum formulário ainda.'}
          </div>
        ) : (
          <div className="border border-border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Link público</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map(form => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.title || form.name}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => copyLink(form)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3.5 h-3.5" /> /f/{form.slug}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={form.published ? 'default' : 'secondary'}>
                        {form.published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => openLeads(form)}
                        className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                      >
                        {form.leads_count ?? 0}
                      </button>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {canUpdate && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(form)} aria-label="editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(form)}
                          aria-label="excluir"
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <DialogTitle>Excluir formulário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir “{deleteTarget?.title || deleteTarget?.name}”? Esta ação não pode
            ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!leadsForm} onOpenChange={v => !v && setLeadsForm(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leads — {leadsForm?.title || leadsForm?.name}</DialogTitle>
          </DialogHeader>
          {leadsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum lead capturado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{lead.contact?.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{lead.contact?.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{stageLabel(lead)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.created_at ? new Date(lead.created_at).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

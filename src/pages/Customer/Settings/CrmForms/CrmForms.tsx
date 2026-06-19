import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@evoapi/design-system';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { crmFormsService } from '@/services/crmForms/crmFormsService';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import type { CrmForm, CrmFormPayload } from '@/types/crmForms';
import type { Pipeline } from '@/types/analytics/pipelines';
import CrmFormModal from '@/components/crmForms/CrmFormModal';

export default function CrmForms() {
  const { can, isReady } = useUserPermissions();
  const canCreate = can('crm_forms', 'create');
  const canUpdate = can('crm_forms', 'update');
  const canDelete = can('crm_forms', 'delete');

  const [forms, setForms] = useState<CrmForm[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmForm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, pipes] = await Promise.all([
        crmFormsService.list(),
        pipelinesService.getPipelines(),
      ]);
      setForms(list);
      setPipelines(pipes.data);
    } catch {
      toast.error('Erro ao carregar formulários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isReady) load();
  }, [isReady, load]);

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
      load();
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
      load();
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  const copyLink = (form: CrmForm) => {
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard?.writeText(url);
    toast.success('Link copiado.');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Formulários de captura</h1>
          <p className="text-sm text-muted-foreground">Crie formulários públicos que geram leads no pipeline.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Novo formulário
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum formulário ainda.</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Nome</th>
                <th className="text-left font-medium px-4 py-2">Link público</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {forms.map(form => (
                <tr key={form.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{form.title || form.name}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => copyLink(form)}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3.5 h-3.5" /> /f/{form.slug}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        form.published
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {form.published ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {canUpdate && (
                      <button onClick={() => openEdit(form)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleteTarget(form)} className="p-1 text-destructive" aria-label="excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CrmFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        initial={editing}
        pipelines={pipelines}
      />

      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir formulário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir “{deleteTarget?.title || deleteTarget?.name}”? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

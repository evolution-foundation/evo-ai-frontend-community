import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@evoapi/design-system';
import { Trash2, Plus } from 'lucide-react';
import type { Pipeline } from '@/types/analytics/pipelines';
import type {
  CrmForm,
  CrmFormField,
  CrmFormPayload,
  CrmFieldType,
  FieldMapsTo,
  RoutingOp,
  RoutingRule,
} from '@/types/crmForms';

interface CrmFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CrmFormPayload) => void | Promise<void>;
  saving: boolean;
  initial: CrmForm | null;
  pipelines: Pipeline[];
}

const FIELD_TYPES: CrmFieldType[] = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox'];
const MAPS_TO: FieldMapsTo[] = ['', 'name', 'email', 'phone', 'company'];
const ROUTING_OPS: RoutingOp[] = ['equals', 'not_equals', 'contains'];

const inputClass =
  'w-full p-2 text-sm border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

const emptyField = (): CrmFormField => ({ key: '', label: '', type: 'text', required: false, maps_to: '' });

const CrmFormModal = ({ open, onClose, onSave, saving, initial, pipelines }: CrmFormModalProps) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fields, setFields] = useState<CrmFormField[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [defaultPipelineId, setDefaultPipelineId] = useState('');
  const [defaultStageId, setDefaultStageId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setPublished(initial?.published ?? false);
    setPrimaryColor(initial?.appearance?.primary_color ?? '');
    setLogoUrl(initial?.appearance?.logo_url ?? '');
    setSuccessMessage(initial?.appearance?.success_message ?? '');
    setFields(
      initial?.fields?.length
        ? initial.fields
        : [
            { key: 'name', label: 'Nome', type: 'text', required: true, maps_to: 'name' },
            { key: 'email', label: 'E-mail', type: 'email', required: true, maps_to: 'email' },
          ],
    );
    setRules(initial?.routing_rules ?? []);
    setDefaultPipelineId(initial?.default_pipeline_id ?? '');
    setDefaultStageId(initial?.default_stage_id ?? '');
    setError(null);
  }, [open, initial]);

  const stagesFor = (pipelineId?: string) => pipelines.find(p => p.id === pipelineId)?.stages ?? [];

  const updateField = (idx: number, patch: Partial<CrmFormField>) =>
    setFields(prev => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const updateRule = (idx: number, patch: Partial<RoutingRule>) =>
    setRules(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const handleSave = () => {
    setError(null);
    if (!name.trim()) return setError('Informe o nome do formulário.');
    if (!defaultPipelineId) return setError('Selecione o pipeline padrão.');

    const mapped = fields.map(f => f.maps_to).filter(Boolean);
    if (!mapped.includes('email')) return setError('Inclua um campo mapeado para "email".');
    if (!mapped.includes('name')) return setError('Inclua um campo mapeado para "name".');
    if (fields.some(f => !f.key.trim())) return setError('Todo campo precisa de uma chave (key).');

    const payload: CrmFormPayload = {
      name: name.trim(),
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      published,
      appearance: {
        primary_color: primaryColor || undefined,
        logo_url: logoUrl || undefined,
        success_message: successMessage || undefined,
      },
      fields: fields.map(f => ({
        ...f,
        options:
          f.type === 'select' && typeof (f.options as unknown) === 'string'
            ? String(f.options).split(',').map(o => o.trim()).filter(Boolean)
            : f.options,
      })),
      routing_rules: rules.filter(r => r.pipeline_id),
      default_pipeline_id: defaultPipelineId,
      default_stage_id: defaultStageId || undefined,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar formulário' : 'Novo formulário'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Básico */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Básico</h3>
            <input className={inputClass} placeholder="Nome (interno)" value={name} onChange={e => setName(e.target.value)} />
            <input className={inputClass} placeholder="Título público" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className={inputClass} placeholder="Descrição" value={description} onChange={e => setDescription(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
              Publicado
            </label>
          </section>

          {/* Aparência */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Aparência</h3>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} placeholder="Cor primária (#hex)" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
              <input className={inputClass} placeholder="URL do logo" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
            </div>
            <input className={inputClass} placeholder="Mensagem de sucesso" value={successMessage} onChange={e => setSuccessMessage(e.target.value)} />
          </section>

          {/* Campos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Campos</h3>
              <Button variant="outline" size="sm" onClick={() => setFields(prev => [...prev, emptyField()])}>
                <Plus className="w-4 h-4 mr-1" /> Campo
              </Button>
            </div>
            {fields.map((f, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center border border-border rounded-md p-2">
                <input className={`${inputClass} col-span-2`} placeholder="key" value={f.key} onChange={e => updateField(idx, { key: e.target.value })} />
                <input className={`${inputClass} col-span-3`} placeholder="label" value={f.label ?? ''} onChange={e => updateField(idx, { label: e.target.value })} />
                <select className={`${inputClass} col-span-2`} value={f.type} onChange={e => updateField(idx, { type: e.target.value as CrmFieldType })}>
                  {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className={`${inputClass} col-span-2`} value={f.maps_to ?? ''} onChange={e => updateField(idx, { maps_to: e.target.value as FieldMapsTo })}>
                  {MAPS_TO.map(m => <option key={m} value={m}>{m || 'maps_to…'}</option>)}
                </select>
                <label className="col-span-2 flex items-center gap-1 text-xs text-foreground">
                  <input type="checkbox" checked={!!f.required} onChange={e => updateField(idx, { required: e.target.checked })} />
                  obrig.
                </label>
                <button className="col-span-1 text-destructive flex justify-center" onClick={() => setFields(prev => prev.filter((_, i) => i !== idx))} aria-label="remover campo">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </section>

          {/* Destino padrão */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Destino padrão</h3>
            <div className="grid grid-cols-2 gap-3">
              <select className={inputClass} value={defaultPipelineId} onChange={e => { setDefaultPipelineId(e.target.value); setDefaultStageId(''); }}>
                <option value="">Pipeline…</option>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className={inputClass} value={defaultStageId} onChange={e => setDefaultStageId(e.target.value)}>
                <option value="">Estágio…</option>
                {stagesFor(defaultPipelineId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </section>

          {/* Regras de roteamento */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Regras de roteamento</h3>
              <Button variant="outline" size="sm" onClick={() => setRules(prev => [...prev, { field: '', op: 'equals', value: '', pipeline_id: '', stage_id: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Regra
              </Button>
            </div>
            {rules.map((r, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center border border-border rounded-md p-2">
                <select className={`${inputClass} col-span-2`} value={r.field ?? ''} onChange={e => updateRule(idx, { field: e.target.value })}>
                  <option value="">campo…</option>
                  {fields.filter(f => f.key).map(f => <option key={f.key} value={f.key}>{f.key}</option>)}
                </select>
                <select className={`${inputClass} col-span-2`} value={r.op ?? 'equals'} onChange={e => updateRule(idx, { op: e.target.value as RoutingOp })}>
                  {ROUTING_OPS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <input className={`${inputClass} col-span-2`} placeholder="valor" value={r.value ?? ''} onChange={e => updateRule(idx, { value: e.target.value })} />
                <select className={`${inputClass} col-span-3`} value={r.pipeline_id} onChange={e => updateRule(idx, { pipeline_id: e.target.value, stage_id: '' })}>
                  <option value="">pipeline…</option>
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className={`${inputClass} col-span-2`} value={r.stage_id ?? ''} onChange={e => updateRule(idx, { stage_id: e.target.value })}>
                  <option value="">estágio…</option>
                  {stagesFor(r.pipeline_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button className="col-span-1 text-destructive flex justify-center" onClick={() => setRules(prev => prev.filter((_, i) => i !== idx))} aria-label="remover regra">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrmFormModal;

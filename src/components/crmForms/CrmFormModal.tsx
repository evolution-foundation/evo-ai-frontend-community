import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Label,
  Switch,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@evoapi/design-system';
import { Trash2, Plus } from 'lucide-react';
import type { Pipeline } from '@/types/analytics/pipelines';
import type { CustomAttributeDefinition } from '@/types/settings';
import type { CrmForm, CrmFormField, CrmFormPayload, CrmFieldType, RoutingOp, RoutingRule } from '@/types/crmForms';
import {
  encodeTarget,
  decodeTarget,
  buildTargetGroups,
  suggestFieldFromAttribute,
  attrForTarget,
  NONE_TARGET,
} from '@/services/crmForms/crmFormTargets';

interface CrmFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CrmFormPayload) => void | Promise<void>;
  saving: boolean;
  initial: CrmForm | null;
  pipelines: Pipeline[];
  contactAttrs: CustomAttributeDefinition[];
  dealAttrs: CustomAttributeDefinition[];
}

const FIELD_TYPES: CrmFieldType[] = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox'];
const ROUTING_OPS: RoutingOp[] = ['equals', 'not_equals', 'contains'];
const NONE = '__none__';

interface ChooseProps {
  value?: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}
const Choose = ({ value, onChange, options, placeholder, className }: ChooseProps) => (
  <Select value={value || undefined} onValueChange={onChange}>
    <SelectTrigger className={className}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map(o => (
        <SelectItem key={o.value} value={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const emptyField = (): CrmFormField => ({ key: '', label: '', type: 'text', required: false, maps_to: '' });

// Standard contact key behind a field's mapping (legacy string or typed), for client-side coverage checks.
const contactStdKey = (f: CrmFormField): string | null => {
  const mt = f.maps_to || '';
  if (['name', 'email', 'phone', 'company'].includes(mt)) return mt;
  if (mt === 'contact') return f.maps_to_key || null;
  return null;
};

const CrmFormModal = ({ open, onClose, onSave, saving, initial, pipelines, contactAttrs, dealAttrs }: CrmFormModalProps) => {
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
            { key: 'name', label: 'Nome', type: 'text', required: true, maps_to: 'contact', maps_to_key: 'name' },
            { key: 'email', label: 'E-mail', type: 'email', required: true, maps_to: 'contact', maps_to_key: 'email' },
          ],
    );
    setRules(initial?.routing_rules ?? []);
    setDefaultPipelineId(initial?.default_pipeline_id ?? '');
    setDefaultStageId(initial?.default_stage_id ?? '');
    setError(null);
  }, [open, initial]);

  const targetGroups = buildTargetGroups(contactAttrs, dealAttrs);

  const stageOptions = (pipelineId?: string) => [
    { value: NONE, label: '— nenhum —' },
    ...(pipelines.find(p => p.id === pipelineId)?.stages ?? []).map(s => ({ value: s.id, label: s.name })),
  ];
  const pipelineOptions = pipelines.map(p => ({ value: p.id, label: p.name }));

  const updateField = (idx: number, patch: Partial<CrmFormField>) =>
    setFields(prev => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const updateRule = (idx: number, patch: Partial<RoutingRule>) =>
    setRules(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  // Apply a chosen mapping target: set maps_to/maps_to_key and, for custom
  // attributes, suggest the field type/options from its display type.
  const applyTarget = (idx: number, value: string) => {
    const patch: Partial<CrmFormField> = decodeTarget(value);
    const attr = attrForTarget(value, contactAttrs, dealAttrs);
    if (attr) {
      const suggestion = suggestFieldFromAttribute(attr);
      patch.type = suggestion.type;
      if (suggestion.options) patch.options = suggestion.options;
    }
    updateField(idx, patch);
  };

  const handleSave = () => {
    setError(null);
    if (!name.trim()) return setError('Informe o nome do formulário.');
    if (!defaultPipelineId) return setError('Selecione o pipeline padrão.');

    const std = fields.map(contactStdKey);
    if (!std.includes('email')) return setError('Inclua um campo mapeado para o e-mail do contato.');
    if (!std.includes('name')) return setError('Inclua um campo mapeado para o nome do contato.');
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
      fields,
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
            <div className="space-y-1">
              <Label>Nome (interno)</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Contato site" />
            </div>
            <div className="space-y-1">
              <Label>Título público</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Fale com a gente" />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={published} onCheckedChange={setPublished} id="published" />
              <Label htmlFor="published">Publicado</Label>
            </div>
          </section>

          {/* Aparência */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Aparência</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cor primária</Label>
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#1E40AF" />
              </div>
              <div className="space-y-1">
                <Label>URL do logo</Label>
                <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Mensagem de sucesso</Label>
              <Input value={successMessage} onChange={e => setSuccessMessage(e.target.value)} />
            </div>
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
              <div key={idx} className="space-y-2 border border-border rounded-md p-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-2"
                    placeholder="key"
                    value={f.key}
                    onChange={e => updateField(idx, { key: e.target.value })}
                  />
                  <Input
                    className="col-span-3"
                    placeholder="label"
                    value={f.label ?? ''}
                    onChange={e => updateField(idx, { label: e.target.value })}
                  />
                  <Choose
                    className="col-span-2"
                    value={f.type}
                    onChange={v => updateField(idx, { type: v as CrmFieldType })}
                    options={FIELD_TYPES.map(t => ({ value: t, label: t }))}
                  />
                  {/* Destino: mesma lista de contextos que a submissão pública aceita */}
                  <div className="col-span-3">
                    <Select value={encodeTarget(f)} onValueChange={v => applyTarget(idx, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="mapear para…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_TARGET}>— sem mapeamento —</SelectItem>
                        {targetGroups.map(g => (
                          <SelectGroup key={g.label}>
                            <SelectLabel>{g.label}</SelectLabel>
                            {g.options.map(o => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="col-span-1 flex items-center gap-1 text-xs text-foreground">
                    <Checkbox checked={!!f.required} onCheckedChange={c => updateField(idx, { required: c === true })} />
                    obrig.
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1 text-destructive"
                    onClick={() => setFields(prev => prev.filter((_, i) => i !== idx))}
                    aria-label="remover campo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {f.type === 'select' && (
                  <Input
                    placeholder="Opções separadas por vírgula"
                    value={(f.options ?? []).join(', ')}
                    onChange={e =>
                      updateField(idx, {
                        options: e.target.value.split(',').map(o => o.trim()).filter(Boolean),
                      })
                    }
                  />
                )}
              </div>
            ))}
          </section>

          {/* Destino padrão */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Destino padrão</h3>
            <div className="grid grid-cols-2 gap-3">
              <Choose
                value={defaultPipelineId}
                onChange={v => {
                  setDefaultPipelineId(v);
                  setDefaultStageId('');
                }}
                options={pipelineOptions}
                placeholder="Pipeline…"
              />
              <Choose
                value={defaultStageId || NONE}
                onChange={v => setDefaultStageId(v === NONE ? '' : v)}
                options={stageOptions(defaultPipelineId)}
                placeholder="Estágio…"
              />
            </div>
          </section>

          {/* Regras de roteamento */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Regras de roteamento</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRules(prev => [...prev, { field: '', op: 'equals', value: '', pipeline_id: '', stage_id: '' }])}
              >
                <Plus className="w-4 h-4 mr-1" /> Regra
              </Button>
            </div>
            {rules.map((r, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center border border-border rounded-md p-2">
                <Choose
                  className="col-span-2"
                  value={r.field}
                  onChange={v => updateRule(idx, { field: v })}
                  options={fields.filter(f => f.key).map(f => ({ value: f.key, label: f.key }))}
                  placeholder="campo…"
                />
                <Choose
                  className="col-span-2"
                  value={r.op ?? 'equals'}
                  onChange={v => updateRule(idx, { op: v as RoutingOp })}
                  options={ROUTING_OPS.map(o => ({ value: o, label: o }))}
                />
                <Input
                  className="col-span-2"
                  placeholder="valor"
                  value={r.value ?? ''}
                  onChange={e => updateRule(idx, { value: e.target.value })}
                />
                <Choose
                  className="col-span-3"
                  value={r.pipeline_id}
                  onChange={v => updateRule(idx, { pipeline_id: v, stage_id: '' })}
                  options={pipelineOptions}
                  placeholder="pipeline…"
                />
                <Choose
                  className="col-span-2"
                  value={r.stage_id || NONE}
                  onChange={v => updateRule(idx, { stage_id: v === NONE ? '' : v })}
                  options={stageOptions(r.pipeline_id)}
                  placeholder="estágio…"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-1 text-destructive"
                  onClick={() => setRules(prev => prev.filter((_, i) => i !== idx))}
                  aria-label="remover regra"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrmFormModal;

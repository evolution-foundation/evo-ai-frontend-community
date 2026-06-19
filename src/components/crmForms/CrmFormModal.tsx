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
import { useLanguage } from '@/hooks/useLanguage';
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

const contactStdKey = (f: CrmFormField): string | null => {
  const mt = f.maps_to || '';
  if (['name', 'email', 'phone', 'company'].includes(mt)) return mt;
  if (mt === 'contact') return f.maps_to_key || null;
  return null;
};

const CrmFormModal = ({ open, onClose, onSave, saving, initial, pipelines, contactAttrs, dealAttrs }: CrmFormModalProps) => {
  const { t } = useLanguage('crmForms');
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
            { key: 'name', label: t('modal.targets.contactName'), type: 'text', required: true, maps_to: 'contact', maps_to_key: 'name' },
            { key: 'email', label: t('modal.targets.contactEmail'), type: 'email', required: true, maps_to: 'contact', maps_to_key: 'email' },
          ],
    );
    setRules(initial?.routing_rules ?? []);
    setDefaultPipelineId(initial?.default_pipeline_id ?? '');
    setDefaultStageId(initial?.default_stage_id ?? '');
    setError(null);
  }, [open, initial, t]);

  const targetGroups = buildTargetGroups(contactAttrs, dealAttrs, t);

  const stageOptions = (pipelineId?: string) => [
    { value: NONE, label: t('modal.destination.stageNone') },
    ...(pipelines.find(p => p.id === pipelineId)?.stages ?? []).map(s => ({ value: s.id, label: s.name })),
  ];
  const pipelineOptions = pipelines.map(p => ({ value: p.id, label: p.name }));

  const updateField = (idx: number, patch: Partial<CrmFormField>) =>
    setFields(prev => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const updateRule = (idx: number, patch: Partial<RoutingRule>) =>
    setRules(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

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
    if (!name.trim()) return setError(t('modal.errors.name'));
    if (!defaultPipelineId) return setError(t('modal.errors.pipeline'));

    const std = fields.map(contactStdKey);
    if (!std.includes('email')) return setError(t('modal.errors.email'));
    if (!std.includes('name')) return setError(t('modal.errors.nameField'));
    if (fields.some(f => !f.key.trim())) return setError(t('modal.errors.fieldKey'));

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
          <DialogTitle>{initial ? t('modal.editTitle') : t('modal.createTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t('modal.sections.basic')}</h3>
            <div className="space-y-1">
              <Label>{t('modal.basic.name')}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('modal.basic.namePlaceholder')} />
            </div>
            <div className="space-y-1">
              <Label>{t('modal.basic.title')}</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('modal.basic.titlePlaceholder')} />
            </div>
            <div className="space-y-1">
              <Label>{t('modal.basic.description')}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={published} onCheckedChange={setPublished} id="published" />
              <Label htmlFor="published">{t('modal.basic.published')}</Label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t('modal.sections.appearance')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('modal.appearance.primaryColor')}</Label>
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#1E40AF" />
              </div>
              <div className="space-y-1">
                <Label>{t('modal.appearance.logoUrl')}</Label>
                <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('modal.appearance.successMessage')}</Label>
              <Input value={successMessage} onChange={e => setSuccessMessage(e.target.value)} />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t('modal.sections.fields')}</h3>
              <Button variant="outline" size="sm" onClick={() => setFields(prev => [...prev, emptyField()])}>
                <Plus className="w-4 h-4 mr-1" /> {t('modal.fields.add')}
              </Button>
            </div>
            {fields.map((f, idx) => (
              <div key={idx} className="space-y-2 border border-border rounded-md p-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-2"
                    placeholder={t('modal.fields.key')}
                    value={f.key}
                    onChange={e => updateField(idx, { key: e.target.value })}
                  />
                  <Input
                    className="col-span-3"
                    placeholder={t('modal.fields.label')}
                    value={f.label ?? ''}
                    onChange={e => updateField(idx, { label: e.target.value })}
                  />
                  <Choose
                    className="col-span-2"
                    value={f.type}
                    onChange={v => updateField(idx, { type: v as CrmFieldType })}
                    options={FIELD_TYPES.map(ft => ({ value: ft, label: ft }))}
                  />
                  <div className="col-span-3">
                    <Select value={encodeTarget(f)} onValueChange={v => applyTarget(idx, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('modal.fields.mapTo')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_TARGET}>{t('modal.targets.none')}</SelectItem>
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
                    {t('modal.fields.required')}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1 text-destructive"
                    onClick={() => setFields(prev => prev.filter((_, i) => i !== idx))}
                    aria-label={t('modal.fields.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {f.type === 'select' && (
                  <Input
                    placeholder={t('modal.fields.optionsPlaceholder')}
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

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t('modal.sections.defaultDestination')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Choose
                value={defaultPipelineId}
                onChange={v => {
                  setDefaultPipelineId(v);
                  setDefaultStageId('');
                }}
                options={pipelineOptions}
                placeholder={t('modal.destination.pipeline')}
              />
              <Choose
                value={defaultStageId || NONE}
                onChange={v => setDefaultStageId(v === NONE ? '' : v)}
                options={stageOptions(defaultPipelineId)}
                placeholder={t('modal.destination.stage')}
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t('modal.sections.routing')}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRules(prev => [...prev, { field: '', op: 'equals', value: '', pipeline_id: '', stage_id: '' }])}
              >
                <Plus className="w-4 h-4 mr-1" /> {t('modal.routing.add')}
              </Button>
            </div>
            {rules.map((r, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center border border-border rounded-md p-2">
                <Choose
                  className="col-span-2"
                  value={r.field}
                  onChange={v => updateRule(idx, { field: v })}
                  options={fields.filter(f => f.key).map(f => ({ value: f.key, label: f.key }))}
                  placeholder={t('modal.routing.field')}
                />
                <Choose
                  className="col-span-2"
                  value={r.op ?? 'equals'}
                  onChange={v => updateRule(idx, { op: v as RoutingOp })}
                  options={ROUTING_OPS.map(o => ({ value: o, label: o }))}
                />
                <Input
                  className="col-span-2"
                  placeholder={t('modal.routing.value')}
                  value={r.value ?? ''}
                  onChange={e => updateRule(idx, { value: e.target.value })}
                />
                <Choose
                  className="col-span-3"
                  value={r.pipeline_id}
                  onChange={v => updateRule(idx, { pipeline_id: v, stage_id: '' })}
                  options={pipelineOptions}
                  placeholder={t('modal.routing.pipeline')}
                />
                <Choose
                  className="col-span-2"
                  value={r.stage_id || NONE}
                  onChange={v => updateRule(idx, { stage_id: v === NONE ? '' : v })}
                  options={stageOptions(r.pipeline_id)}
                  placeholder={t('modal.routing.stage')}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-1 text-destructive"
                  onClick={() => setRules(prev => prev.filter((_, i) => i !== idx))}
                  aria-label={t('modal.routing.remove')}
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
            {t('modal.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('modal.saving') : t('modal.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrmFormModal;

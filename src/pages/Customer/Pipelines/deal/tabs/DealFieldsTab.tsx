import { BriefcaseBusiness } from 'lucide-react';
import { useAppDataStore } from '@/store/appDataStore';
import type { Deal } from '@/types/analytics';
import type { DealTabProps } from '../dealContext';
import FieldList, { type FieldGroup } from '../FieldList';
import { formatMoney } from '../dealFormat';

const text = (value: unknown) => (value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value));

export default function DealFieldsTab({ deal, pipeline, patchDeal }: DealTabProps) {
  const { agents } = useAppDataStore();
  const attributes = ((pipeline?.custom_fields as { attributes?: string[] } | undefined)?.attributes || []).filter(Boolean);
  const custom = deal.custom_fields || {};
  const extraKeys = Object.keys(custom).filter(key => !attributes.includes(key));
  const stageId = deal.pipeline_stage_id || deal.stage_id;
  const ownerId = (deal.owner as { id?: string } | null | undefined)?.id;

  const setCustom = (key: string, value: string) => patchDeal({ custom_fields: { ...custom, [key]: value } }, { custom_fields: { ...custom, [key]: value } });
  const customField = (key: string) => ({ key: `custom-${key}`, label: key, value: text(custom[key]), onCommit: (value: string) => setCustom(key, value) });

  const groups: FieldGroup[] = [
    {
      id: 'general',
      label: 'Informações gerais',
      fields: [
        { key: 'title', label: 'Título', value: deal.title || '', onCommit: value => value.trim() ? patchDeal({ title: value.trim() }, { title: value.trim() }) : undefined },
        { key: 'stage', label: 'Etapa', type: 'select', value: stageId || '', options: (pipeline?.stages || []).map(stage => ({ value: stage.id, label: stage.name })), onCommit: value => patchDeal({ pipeline_stage_id: value }, { pipeline_stage_id: value, stage_id: value }) },
        { key: 'value', label: 'Valor', type: 'number', value: deal.value ? String(deal.value) : '', display: deal.value ? formatMoney(deal.value, deal.currency) : '', onCommit: value => patchDeal({ value: Number(value || 0) }, { value: Number(value || 0) }) },
        { key: 'currency', label: 'Moeda', type: 'select', value: deal.currency || 'BRL', options: ['BRL', 'USD', 'EUR'].map(code => ({ value: code, label: code })), onCommit: value => patchDeal({ currency: value }, { currency: value }) },
        { key: 'owner', label: 'Responsável', type: 'select', value: ownerId ? String(ownerId) : '', allowClear: true, placeholder: 'Sem responsável', options: agents.map(agent => ({ value: String(agent.id), label: agent.name })), onCommit: value => patchDeal({ owner_id: value || null }, { owner: (agents.find(agent => String(agent.id) === value) as Deal['owner']) ?? null }) },
        { key: 'notes', label: 'Anotações', type: 'textarea', value: deal.notes || '', placeholder: 'Contexto, próximos passos e observações do vendedor', onCommit: value => patchDeal({ notes: value }, { notes: value }) },
      ],
    },
    ...(attributes.length ? [{ id: 'pipeline', label: 'Campos do pipeline', fields: attributes.map(customField) }] : []),
    ...(extraKeys.length ? [{ id: 'origin', label: 'Origem e outros campos', fields: extraKeys.map(customField) }] : []),
  ];

  return <FieldList title="Campos de negócio" icon={<BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />} groups={groups} />;
}

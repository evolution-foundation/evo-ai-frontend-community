import { Controller, type Control, useWatch } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Textarea,
  Button,
  Checkbox,
} from '@evoapi/design-system';
import { Trash2 } from 'lucide-react';
import {
  ALL_ACTION_NAMES,
  actionRegistry,
  type AutomationRuleFormData,
} from '@/pages/Customer/Automation/registries';
import type { AutomationFormData } from '@/hooks/automation/useAutomationFormData';
import type { AutomationActionType } from '@/types/automation';
import type { MessageTemplateVariable } from '@/hooks/automation/useAutomationFormData';

interface Props {
  control: Control<AutomationRuleFormData>;
  index: number;
  formData: AutomationFormData;
  onRemove: () => void;
  onActionChange: (index: number, actionName: AutomationActionType) => void;
}

export default function ActionRow({
  control,
  index,
  formData,
  onRemove,
  onActionChange,
}: Props) {
  const { t } = useLanguage('automation');
  const actionName = useWatch({ control, name: `actions.${index}.action_name` });

  return (
    <div className="flex items-start gap-2 p-3 border rounded-md">
      <div className="flex-1 grid grid-cols-2 gap-2">
        <Controller
          control={control}
          name={`actions.${index}.action_name`}
          render={({ field }) => (
            <Select
              value={field.value ?? ''}
              onValueChange={(value) => {
                onActionChange(index, value as AutomationActionType);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('form.fields.actionRow.action')} />
              </SelectTrigger>
              <SelectContent>
                {ALL_ACTION_NAMES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {t(actionRegistry[name].i18nKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />

        <ActionParamsRenderer
          control={control}
          index={index}
          actionName={actionName as AutomationActionType | undefined}
          formData={formData}
          t={t}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={t('form.fields.actionRow.remove')}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ParamsProps {
  control: Control<AutomationRuleFormData>;
  index: number;
  actionName: AutomationActionType | undefined;
  formData: AutomationFormData;
  t: (key: string) => string;
}

function ActionParamsRenderer({ control, index, actionName, formData, t }: ParamsProps) {
  if (!actionName) {
    return <div className="text-xs text-muted-foreground">{t('form.fields.actionRow.selectActionFirst')}</div>;
  }

  switch (actionName) {
    case 'send_message':
    case 'send_webhook_event':
    case 'send_email_transcript':
      return (
        <Controller
          control={control}
          name={`actions.${index}.action_params`}
          render={({ field }) => (
            <Input
              value={asString(field.value, 0)}
              onChange={(e) => field.onChange([e.target.value])}
              placeholder={t(`form.fields.actionRow.params.${actionName}`)}
            />
          )}
        />
      );

    case 'send_canned_response':
      return (
        <Controller
          control={control}
          name={`actions.${index}.action_params`}
          render={({ field }) => {
            const raw = (field.value as Array<unknown>)?.[0];
            const currentId =
              raw && typeof raw === 'object' && 'canned_response_id' in raw
                ? (raw as { canned_response_id: string | number }).canned_response_id
                : (raw as string | number | undefined);
            const selectedValue = currentId != null ? String(currentId) : '';
            return (
              <Select
                value={selectedValue}
                onValueChange={(value) =>
                  field.onChange([{ canned_response_id: value }])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('form.fields.actionRow.params.send_canned_response')} />
                </SelectTrigger>
                <SelectContent>
                  {formData.cannedResponses.map((opt) => (
                    <SelectItem key={String(opt.id)} value={String(opt.id)}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
      );

    case 'send_template':
      return (
        <Controller
          control={control}
          name={`actions.${index}.action_params`}
          render={({ field }) => {
            const current = ((field.value as Array<Record<string, unknown>>)?.[0] ?? {}) as {
              name?: string;
              language?: string;
              namespace?: string;
              template_id?: string;
              processed_params?: Record<string, string>;
            };
            const selectedValue = current.template_id != null ? String(current.template_id) : '';
            const selectedTemplate = formData.messageTemplates.find((t) => String(t.id) === selectedValue);
            const setTemplateParam = (key: string, value: string) => {
              field.onChange([
                {
                  ...current,
                  processed_params: {
                    ...(current.processed_params ?? {}),
                    [key]: value,
                  },
                },
              ]);
            };
            const defaultAutomationParams = (variables: MessageTemplateVariable[] = []) =>
              variables.reduce<Record<string, string>>((acc, variable) => {
                acc[variable.name] = variable.source
                  ? `{{${variable.source}}}`
                  : variable.default_value ?? variable.example ?? '';
                return acc;
              }, {});
            return (
              <div className="space-y-2">
                <Select
                  value={selectedValue}
                  onValueChange={(value) => {
                    const tpl = formData.messageTemplates.find((t) => String(t.id) === value);
                    if (!tpl) return;
                    field.onChange([
                      {
                        template_id: String(tpl.id),
                        name: tpl.templateName,
                        language: tpl.language,
                        namespace: tpl.namespace,
                        processed_params: defaultAutomationParams(tpl.variables),
                      },
                    ]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.fields.actionRow.params.send_template')} />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.messageTemplates.map((opt) => (
                      <SelectItem key={String(opt.id)} value={String(opt.id)}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate?.variables?.map((variable, variableIndex) => {
                  const key = variable.name || String(variableIndex + 1);
                  return (
                    <Input
                      key={key}
                      value={current.processed_params?.[key] ?? ''}
                      onChange={(e) => setTemplateParam(key, e.target.value)}
                      placeholder={key}
                    />
                  );
                })}
              </div>
            );
          }}
        />
      );

    case 'assign_team':
      return (
        <SelectParam
          control={control}
          index={index}
          options={formData.teams}
          placeholder={t('form.fields.actionRow.params.assign_team')}
        />
      );

    case 'assign_agent':
      return (
        <SelectParam
          control={control}
          index={index}
          options={formData.agents}
          placeholder={t('form.fields.actionRow.params.assign_agent')}
        />
      );

    case 'add_label':
    case 'remove_label':
      return (
        <SelectParam
          control={control}
          index={index}
          options={formData.labels}
          placeholder={t(`form.fields.actionRow.params.${actionName}`)}
          coerce="array"
        />
      );

    case 'change_priority':
      return (
        <SelectParam
          control={control}
          index={index}
          options={formData.priorities}
          placeholder={t('form.fields.actionRow.params.change_priority')}
        />
      );

    case 'change_status':
      return (
        <SelectParam
          control={control}
          index={index}
          options={formData.statuses}
          placeholder={t('form.fields.actionRow.params.change_status')}
        />
      );

    case 'assign_to_pipeline':
      return (
        <SelectParam
          control={control}
          index={index}
          options={formData.pipelines}
          placeholder={t('form.fields.actionRow.params.assign_to_pipeline')}
        />
      );

    case 'update_pipeline_stage':
      return (
        <SelectParam
          control={control}
          index={index}
          options={formData.pipelineStages}
          placeholder={t('form.fields.actionRow.params.update_pipeline_stage')}
        />
      );

    case 'send_email_to_team':
      return (
        <Controller
          control={control}
          name={`actions.${index}.action_params`}
          render={({ field }) => {
            const current = (field.value as Array<Record<string, unknown>>)?.[0] ?? {
              team_ids: [],
              message: '',
            };
            const selectedIds = ((current.team_ids as Array<string | number>) ?? []).map(String);
            const toggleTeam = (id: string) => {
              const next = selectedIds.includes(id)
                ? selectedIds.filter((t) => t !== id)
                : [...selectedIds, id];
              field.onChange([{ ...current, team_ids: next, message: current.message ?? '' }]);
            };
            return (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('form.fields.actionRow.params.send_email_to_team_teams')}
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto rounded-md border p-2">
                  {formData.teams.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t('form.fields.actionRow.params.send_email_to_team_no_teams')}
                    </p>
                  ) : (
                    formData.teams.map((team) => {
                      const id = String(team.id);
                      return (
                        <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedIds.includes(id)}
                            onCheckedChange={() => toggleTeam(id)}
                          />
                          {team.name}
                        </label>
                      );
                    })
                  )}
                </div>
                <Textarea
                  value={(current.message as string) ?? ''}
                  onChange={(e) =>
                    field.onChange([{ ...current, message: e.target.value }])
                  }
                  placeholder={t('form.fields.actionRow.params.send_email_to_team')}
                  rows={2}
                />
              </div>
            );
          }}
        />
      );

    case 'create_pipeline_task':
      return (
        <Controller
          control={control}
          name={`actions.${index}.action_params`}
          render={({ field }) => {
            const current = (field.value as Array<Record<string, unknown>>)?.[0] ?? {
              title: '',
            };
            const setField = (key: string, value: unknown) =>
              field.onChange([{ ...current, [key]: value }]);
            return (
              <div className="space-y-2">
                <Input
                  value={(current.title as string) ?? ''}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder={t('form.fields.actionRow.params.create_pipeline_task')}
                />
                <Textarea
                  value={(current.description as string) ?? ''}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder={t('form.fields.actionRow.params.create_pipeline_task_description')}
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={(current.task_type as string) ?? ''}
                    onChange={(e) => setField('task_type', e.target.value)}
                    placeholder={t('form.fields.actionRow.params.create_pipeline_task_type')}
                  />
                  <Input
                    value={(current.priority as string) ?? ''}
                    onChange={(e) => setField('priority', e.target.value)}
                    placeholder={t('form.fields.actionRow.params.create_pipeline_task_priority')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={
                      current.assigned_to_id != null && current.assigned_to_id !== ''
                        ? String(current.assigned_to_id)
                        : ''
                    }
                    onChange={(e) => {
                      // user ids are UUID strings — keep the raw value, don't coerce to Number
                      const raw = e.target.value.trim();
                      setField('assigned_to_id', raw === '' ? undefined : raw);
                    }}
                    placeholder={t('form.fields.actionRow.params.create_pipeline_task_assignee')}
                  />
                  <Input
                    value={(current.due_in as string) ?? ''}
                    onChange={(e) => setField('due_in', e.target.value)}
                    placeholder={t('form.fields.actionRow.params.create_pipeline_task_due_in')}
                  />
                </div>
              </div>
            );
          }}
        />
      );

    case 'mute_conversation':
    case 'snooze_conversation':
    case 'resolve_conversation':
      return <div className="text-xs text-muted-foreground">{t('form.fields.actionRow.noParams')}</div>;

    case 'send_attachment':
      return (
        <Controller
          control={control}
          name={`actions.${index}.action_params`}
          render={({ field }) => {
            const current = (field.value as Array<Record<string, unknown>>)?.[0] ?? {
              attachment_ids: [] as Array<string | number>,
            };
            const ids = (current.attachment_ids as Array<string | number>) ?? [];
            const inboxId = current.inbox_id;
            const idsAsText = ids.join(', ');

            const setIdsFromText = (raw: string) => {
              const parsed = raw
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => (Number.isNaN(Number(s)) ? s : Number(s)));
              field.onChange([{ ...current, attachment_ids: parsed }]);
            };
            const setInbox = (raw: string) => {
              const trimmed = raw.trim();
              if (trimmed === '') {
                const next = { ...current };
                delete (next as Record<string, unknown>).inbox_id;
                field.onChange([{ ...next, attachment_ids: ids }]);
              } else {
                // inbox ids are UUID strings — keep the raw value
                field.onChange([{ ...current, attachment_ids: ids, inbox_id: trimmed }]);
              }
            };
            return (
              <div className="space-y-2">
                <Input
                  value={idsAsText}
                  onChange={(e) => setIdsFromText(e.target.value)}
                  placeholder={t('form.fields.actionRow.params.send_attachment_ids')}
                />
                <Input
                  value={inboxId != null ? String(inboxId) : ''}
                  onChange={(e) => setInbox(e.target.value)}
                  placeholder={t('form.fields.actionRow.params.send_attachment_inbox')}
                />
              </div>
            );
          }}
        />
      );

    default:
      return null;
  }
}

interface SelectParamProps {
  control: Control<AutomationRuleFormData>;
  index: number;
  options: { id: string | number; name: string }[];
  placeholder: string;
  coerce?: 'single' | 'array';
}

function SelectParam({ control, index, options, placeholder, coerce = 'single' }: SelectParamProps) {
  return (
    <Controller
      control={control}
      name={`actions.${index}.action_params`}
      render={({ field }) => {
        const current =
          coerce === 'array'
            ? Array.isArray(field.value) ? field.value : []
            : Array.isArray(field.value) ? field.value[0] : null;

        const selectedValue =
          coerce === 'array'
            ? (current as Array<string | number>)[0] !== undefined
              ? String((current as Array<string | number>)[0])
              : ''
            : current != null
              ? String(current)
              : '';

        return (
          <Select
            value={selectedValue}
            onValueChange={(value) => {
              if (value === '') {
                field.onChange(coerce === 'array' ? [] : [null]);
                return;
              }
              if (coerce === 'array') {
                field.onChange([value]);
              } else {
                const asNumber = Number(value);
                const parsed = Number.isFinite(asNumber) && value.trim() !== '' ? asNumber : value;
                field.onChange([parsed]);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={String(opt.id)} value={String(opt.id)}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }}
    />
  );
}

function asString(value: unknown, idx: number): string {
  if (Array.isArray(value)) {
    const v = value[idx];
    return v == null ? '' : String(v);
  }
  return '';
}

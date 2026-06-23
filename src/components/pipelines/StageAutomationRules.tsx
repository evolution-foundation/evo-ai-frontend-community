import { useRef, useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Textarea,
} from '@evoapi/design-system';
import { PlusIcon, TrashIcon } from 'lucide-react';
import type {
  StageAutomationRule,
  StageAutomationTrigger,
  StageAutomationAction,
  InactivityBase,
  InactivityTriggerValue,
} from '@/types/analytics/pipelines';
import type { PipelineStage } from '@/types/analytics';
import type { Label } from '@/types/settings/labels';

interface Agent {
  id: string;
  name: string;
}

// Minimal shapes the picker needs — the parent modal passes these in (agent
// bots come from agentBotsService.getAll, NOT the human-assignee list).
export interface AgentBotOption {
  id: string;
  name: string;
}

export interface MessageTemplateOption {
  id: string;
  name: string;
  language?: string;
}

export interface PipelineWithStages {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}

interface StageAutomationRulesProps {
  rules: StageAutomationRule[];
  onChange: (rules: StageAutomationRule[]) => void;
  disabled?: boolean;
  currentStageId?: string;
  currentPipelineId?: string;
  stages?: PipelineStage[];
  agents?: Agent[];
  labels?: Label[];
  pipelines?: PipelineWithStages[];
  agentBots?: AgentBotOption[];
  messageTemplates?: MessageTemplateOption[];
}

function newRuleId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const makeEmptyRule = (): StageAutomationRule => ({
  id: newRuleId(),
  trigger: 'label_added',
  trigger_value: '',
  action: 'move_to_stage',
  action_value: '',
});

const CONVERSATION_STATUSES = ['open', 'resolved', 'pending', 'snoozed'] as const;
const INACTIVITY_MINUTES = [2, 5, 10, 15, 30, 60] as const;
const INACTIVITY_BASES: InactivityBase[] = ['no_customer_reply', 'stage_stagnation'];

const ANY_VALUE_SENTINEL = '__any__';
const PLACEHOLDER_SENTINEL = '__placeholder__';

// trigger_value is an object for the inactivity trigger, a string otherwise.
function asInactivityValue(value: StageAutomationRule['trigger_value']): InactivityTriggerValue {
  if (value && typeof value === 'object') {
    return { minutes: value.minutes ?? INACTIVITY_MINUTES[1], base: value.base ?? 'no_customer_reply' };
  }
  return { minutes: INACTIVITY_MINUTES[1], base: 'no_customer_reply' };
}

// Narrow the union to the string form for the non-inactivity triggers (label /
// status / generic input), where trigger_value is always a string at runtime.
function asStringValue(value: StageAutomationRule['trigger_value']): string {
  return typeof value === 'string' ? value : '';
}

function generateKey() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function StageAutomationRules({
  rules,
  onChange,
  disabled = false,
  currentStageId,
  currentPipelineId,
  stages = [],
  agents = [],
  labels = [],
  pipelines = [],
  agentBots = [],
  messageTemplates = [],
}: StageAutomationRulesProps) {
  const { t } = useLanguage('pipelines');

  const [keys, setKeys] = useState<string[]>(() => rules.map(() => generateKey()));
  const prevLengthRef = useRef(rules.length);

  useEffect(() => {
    if (rules.length !== prevLengthRef.current) {
      if (rules.length > prevLengthRef.current) {
        setKeys(prev => [...prev, generateKey()]);
      } else {
        setKeys(prev => prev.slice(0, rules.length));
      }
      prevLengthRef.current = rules.length;
    }
  }, [rules.length]);

  const addRule = () => onChange([...rules, makeEmptyRule()]);

  const removeRule = (index: number) => onChange(rules.filter((_, i) => i !== index));

  const updateRule = (index: number, patch: Partial<StageAutomationRule>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const otherStages = stages.filter(s => s.id !== currentStageId);

  const renderTriggerValue = (rule: StageAutomationRule, index: number) => {
    if (rule.trigger === 'custom_attribute_updated') return null;

    if (rule.trigger === 'inactivity') {
      const iv = asInactivityValue(rule.trigger_value);
      return (
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Select
            value={String(iv.minutes)}
            onValueChange={v =>
              updateRule(index, { trigger_value: { ...iv, minutes: parseInt(v, 10) } })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INACTIVITY_MINUTES.map(m => (
                <SelectItem key={m} value={String(m)}>
                  {m} {t('stageAutomation.inactivity.minutes')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={iv.base}
            onValueChange={v =>
              updateRule(index, { trigger_value: { ...iv, base: v as InactivityBase } })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INACTIVITY_BASES.map(b => (
                <SelectItem key={b} value={b}>
                  {t(`stageAutomation.inactivity.base.${b}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (rule.trigger === 'label_added') {
      return (
        <Select
          value={asStringValue(rule.trigger_value) || ANY_VALUE_SENTINEL}
          onValueChange={v =>
            updateRule(index, { trigger_value: v === ANY_VALUE_SENTINEL ? '' : v })
          }
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.anyLabel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE_SENTINEL}>{t('stageAutomation.anyLabel')}</SelectItem>
            {labels.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                {t('stageAutomation.noLabels')}
              </SelectItem>
            ) : (
              labels.map(l => (
                <SelectItem key={l.id} value={l.title}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.title}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      );
    }

    if (rule.trigger === 'conversation_status_changed') {
      return (
        <Select
          value={asStringValue(rule.trigger_value) || ANY_VALUE_SENTINEL}
          onValueChange={v =>
            updateRule(index, { trigger_value: v === ANY_VALUE_SENTINEL ? '' : v })
          }
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.anyValue')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE_SENTINEL}>{t('stageAutomation.anyValue')}</SelectItem>
            {CONVERSATION_STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                {t(`kanban.search.status.${s}`) || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        className="flex-1"
        placeholder={t('stageAutomation.labelNamePlaceholder')}
        value={asStringValue(rule.trigger_value)}
        onChange={e => updateRule(index, { trigger_value: e.target.value })}
        disabled={disabled}
      />
    );
  };

  const renderActionValue = (rule: StageAutomationRule, index: number) => {
    if (rule.action === 'move_to_stage') {
      return (
        <Select
          value={rule.action_value || ''}
          onValueChange={v => updateRule(index, { action_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.selectStage')} />
          </SelectTrigger>
          <SelectContent>
            {otherStages.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>{t('stageAutomation.noOtherStages')}</SelectItem>
            ) : (
              otherStages.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      );
    }

    if (rule.action === 'move_to_pipeline') {
      const [selectedPipelineId, selectedStageId] = (rule.action_value || '').split(':');
      const otherPipelines = pipelines.filter(p => p.id !== currentPipelineId);
      const selectedPipeline = otherPipelines.find(p => p.id === selectedPipelineId);

      return (
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Select
            value={selectedPipelineId || ''}
            onValueChange={v => updateRule(index, { action_value: v })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('stageAutomation.selectPipeline')} />
            </SelectTrigger>
            <SelectContent>
              {otherPipelines.length === 0 ? (
                <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                  {t('stageAutomation.noOtherPipelines')}
                </SelectItem>
              ) : (
                otherPipelines.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select
            value={selectedStageId || ''}
            onValueChange={v =>
              updateRule(index, {
                action_value: selectedPipelineId ? `${selectedPipelineId}:${v}` : '',
              })
            }
            disabled={disabled || !selectedPipeline}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('stageAutomation.selectStage')} />
            </SelectTrigger>
            <SelectContent>
              {!selectedPipeline || selectedPipeline.stages.length === 0 ? (
                <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                  {t('stageAutomation.noStagesInPipeline')}
                </SelectItem>
              ) : (
                selectedPipeline.stages.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (rule.action === 'assign_agent') {
      return (
        <Select
          value={rule.action_value || ''}
          onValueChange={v => updateRule(index, { action_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.selectAgent')} />
          </SelectTrigger>
          <SelectContent>
            {agents.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>{t('stageAutomation.noAgents')}</SelectItem>
            ) : (
              agents.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      );
    }

    if (rule.action === 'apply_label') {
      return (
        <Select
          value={rule.action_value || ''}
          onValueChange={v => updateRule(index, { action_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.selectLabel')} />
          </SelectTrigger>
          <SelectContent>
            {labels.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                {t('stageAutomation.noLabels')}
              </SelectItem>
            ) : (
              labels.map(l => (
                <SelectItem key={l.id} value={l.title}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.title}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      );
    }

    if (rule.action === 'send_ai_message') {
      return (
        <div className="flex-1 space-y-2">
          <Select
            value={rule.action_value || ''}
            onValueChange={v => updateRule(index, { action_value: v })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('stageAutomation.selectAgentBot')} />
            </SelectTrigger>
            <SelectContent>
              {agentBots.length === 0 ? (
                <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                  {t('stageAutomation.noAgentBots')}
                </SelectItem>
              ) : (
                agentBots.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Textarea
            rows={2}
            maxLength={512}
            placeholder={t('stageAutomation.aiMessagePlaceholder')}
            value={rule.ai_message ?? ''}
            onChange={e => updateRule(index, { ai_message: e.target.value })}
            disabled={disabled}
          />
        </div>
      );
    }

    if (rule.action === 'send_direct_message' || rule.action === 'finalize') {
      return (
        <Textarea
          className="flex-1"
          rows={2}
          maxLength={512}
          placeholder={
            rule.action === 'finalize'
              ? t('stageAutomation.finalizeMessagePlaceholder')
              : t('stageAutomation.directMessagePlaceholder')
          }
          value={rule.action_value}
          onChange={e => updateRule(index, { action_value: e.target.value })}
          disabled={disabled}
        />
      );
    }

    if (rule.action === 'send_template') {
      return (
        <Select
          value={rule.action_value || ''}
          onValueChange={v => updateRule(index, { action_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.selectTemplate')} />
          </SelectTrigger>
          <SelectContent>
            {messageTemplates.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                {t('stageAutomation.noTemplates')}
              </SelectItem>
            ) : (
              messageTemplates.map(tpl => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                  {tpl.language ? ` (${tpl.language})` : ''}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        className="flex-1"
        placeholder={t('stageAutomation.labelNamePlaceholder')}
        value={rule.action_value}
        onChange={e => updateRule(index, { action_value: e.target.value })}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{t('stageAutomation.title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('stageAutomation.description')}</p>
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
          {t('stageAutomation.noRules')}
        </p>
      )}

      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div key={keys[index] ?? index} className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('stageAutomation.rule')} {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRule(index)}
                disabled={disabled}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{t('stageAutomation.when')}</p>
              <div className="flex gap-2">
                <Select
                  value={rule.trigger}
                  onValueChange={v => {
                    const trigger = v as StageAutomationTrigger;
                    updateRule(index, {
                      trigger,
                      trigger_value:
                        trigger === 'inactivity'
                          ? { minutes: INACTIVITY_MINUTES[1], base: 'no_customer_reply' }
                          : '',
                    });
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="label_added">{t('stageAutomation.triggers.label_added')}</SelectItem>
                    <SelectItem value="conversation_status_changed">{t('stageAutomation.triggers.conversation_status_changed')}</SelectItem>
                    <SelectItem value="custom_attribute_updated">{t('stageAutomation.triggers.custom_attribute_updated')}</SelectItem>
                    <SelectItem value="inactivity">{t('stageAutomation.triggers.inactivity')}</SelectItem>
                  </SelectContent>
                </Select>
                {renderTriggerValue(rule, index)}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{t('stageAutomation.then')}</p>
              <div className="flex gap-2">
                <Select
                  value={rule.action}
                  onValueChange={v => updateRule(index, { action: v as StageAutomationAction, action_value: '' })}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="move_to_stage">{t('stageAutomation.actions.move_to_stage')}</SelectItem>
                    <SelectItem value="move_to_pipeline">{t('stageAutomation.actions.move_to_pipeline')}</SelectItem>
                    <SelectItem value="assign_agent">{t('stageAutomation.actions.assign_agent')}</SelectItem>
                    <SelectItem value="apply_label">{t('stageAutomation.actions.apply_label')}</SelectItem>
                    <SelectItem value="send_ai_message">{t('stageAutomation.actions.send_ai_message')}</SelectItem>
                    <SelectItem value="send_direct_message">{t('stageAutomation.actions.send_direct_message')}</SelectItem>
                    <SelectItem value="send_template">{t('stageAutomation.actions.send_template')}</SelectItem>
                    <SelectItem value="finalize">{t('stageAutomation.actions.finalize')}</SelectItem>
                  </SelectContent>
                </Select>
                {renderActionValue(rule, index)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addRule}
        disabled={disabled}
        className="w-full"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        {t('stageAutomation.addRule')}
      </Button>
    </div>
  );
}

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
} from '@evoapi/design-system';
import { PlusIcon, TrashIcon } from 'lucide-react';
import type { StageAutomationRule, StageAutomationTrigger, StageAutomationAction } from '@/types/analytics/pipelines';
import type { PipelineStage } from '@/types/analytics';

interface Agent {
  id: string;
  name: string;
}

interface StageAutomationRulesProps {
  rules: StageAutomationRule[];
  onChange: (rules: StageAutomationRule[]) => void;
  disabled?: boolean;
  currentStageId?: string;
  stages?: PipelineStage[];
  agents?: Agent[];
}

const EMPTY_RULE: StageAutomationRule = {
  trigger: 'label_added',
  trigger_value: '',
  action: 'move_to_stage',
  action_value: '',
};

const CONVERSATION_STATUSES = ['open', 'resolved', 'pending', 'snoozed'] as const;

function generateKey() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function StageAutomationRules({
  rules,
  onChange,
  disabled = false,
  currentStageId,
  stages = [],
  agents = [],
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

  const addRule = () => onChange([...rules, { ...EMPTY_RULE }]);

  const removeRule = (index: number) => onChange(rules.filter((_, i) => i !== index));

  const updateRule = (index: number, patch: Partial<StageAutomationRule>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const otherStages = stages.filter(s => s.id !== currentStageId);

  const renderTriggerValue = (rule: StageAutomationRule, index: number) => {
    if (rule.trigger === 'custom_attribute_updated') return null;

    if (rule.trigger === 'conversation_status_changed') {
      return (
        <Select
          value={rule.trigger_value || ''}
          onValueChange={v => updateRule(index, { trigger_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.anyValue')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('stageAutomation.anyValue')}</SelectItem>
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
        value={rule.trigger_value}
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
              <SelectItem value="" disabled>{t('stageAutomation.noOtherStages')}</SelectItem>
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
              <SelectItem value="" disabled>{t('stageAutomation.noAgents')}</SelectItem>
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
                  onValueChange={v => updateRule(index, { trigger: v as StageAutomationTrigger, trigger_value: '' })}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="label_added">{t('stageAutomation.triggers.label_added')}</SelectItem>
                    <SelectItem value="conversation_status_changed">{t('stageAutomation.triggers.conversation_status_changed')}</SelectItem>
                    <SelectItem value="custom_attribute_updated">{t('stageAutomation.triggers.custom_attribute_updated')}</SelectItem>
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
                    <SelectItem value="assign_agent">{t('stageAutomation.actions.assign_agent')}</SelectItem>
                    <SelectItem value="apply_label">{t('stageAutomation.actions.apply_label')}</SelectItem>
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

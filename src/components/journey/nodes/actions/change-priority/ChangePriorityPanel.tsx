import { useEffect, useMemo, useState } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { AlertTriangle } from 'lucide-react';
import { ChangePriorityNodeData } from './ChangePriorityNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface ChangePriorityPanelProps {
  nodeId: string;
  data: ChangePriorityNodeData;
  onUpdate: (nodeId: string, newData: ChangePriorityNodeData) => void;
  onClose: () => void;
}

export function ChangePriorityPanel({ nodeId, data, onUpdate, onClose }: ChangePriorityPanelProps) {
  const { t } = useLanguage('journey');
  const [priority, setPriority] = useState<string>(data.priority || '');
  const [originalPriority] = useState<string>(() => data.priority || '');
  const [formDataOptions, setFormDataOptions] = useState<{
    priorities: Array<{ value: string; label: string }>;
  }>({
    priorities: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        await automationService.getFormData();
        setFormDataOptions({
          priorities: [
            { value: 'low', label: t('panels.changePriority.priorities.low') },
            { value: 'medium', label: t('panels.changePriority.priorities.medium') },
            { value: 'high', label: t('panels.changePriority.priorities.high') },
            { value: 'urgent', label: t('panels.changePriority.priorities.urgent') },
          ],
        });
      } catch (error) {
        console.error(t('panels.changePriority.loadDataError'), error);
        setFormDataOptions({
          priorities: [
            { value: 'low', label: t('panels.changePriority.priorities.low') },
            { value: 'medium', label: t('panels.changePriority.priorities.medium') },
            { value: 'high', label: t('panels.changePriority.priorities.high') },
            { value: 'urgent', label: t('panels.changePriority.priorities.urgent') },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const updatedData: ChangePriorityNodeData = {
      ...data,
      priority: priority as 'low' | 'medium' | 'high' | 'urgent',
      formDataOptions,
      action_params: priority ? [priority] : [],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  useEffect(() => {
    if (formDataOptions.priorities.length > 0) {
      const updatedData: ChangePriorityNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  const getPriorityIcon = (value: string) => {
    const icons: { [key: string]: string } = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      urgent: '🔴',
    };
    return icons[value] || '❓';
  };

  const dirty = useMemo(() => priority !== originalPriority, [priority, originalPriority]);
  const isValid = Boolean(priority);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.changePriority.title')}
      icon={<AlertTriangle className="h-5 w-5 text-flow-node-control-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      loading={loading}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.changePriority.newPriority')}
          </Label>
          <Select value={priority} onValueChange={setPriority} disabled={loading}>
            <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder={t('panels.changePriority.selectPriority')} />
            </SelectTrigger>
            <SelectContent>
              {(formDataOptions.priorities || []).map(priorityOption => (
                <SelectItem key={priorityOption.value} value={priorityOption.value}>
                  <div className="flex items-center gap-2">
                    <span>{getPriorityIcon(priorityOption.value)}</span>
                    <span>{priorityOption.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-xs text-sidebar-foreground/60">
            {t('panels.changePriority.priorityAffectsOrder')}
          </p>
        </div>

        {priority && (
          <FlowFeedbackBanner variant="info">
            <div className="font-medium mb-2">🎯 {t('panels.changePriority.configurationTitle')}</div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getPriorityIcon(priority)}</span>
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  {formDataOptions.priorities.find(p => p.value === priority)?.label || priority}
                </div>
                <div className="text-xs">{t('panels.changePriority.conversationMarked')}</div>
              </div>
            </div>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="info">
          <div className="font-medium mb-2">💡 {t('panels.changePriority.aboutPriorities')}</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span>🔵</span>
              <span>
                <strong>{t('panels.changePriority.priorities.low')}:</strong>{' '}
                {t('panels.changePriority.lowDescription')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟡</span>
              <span>
                <strong>{t('panels.changePriority.priorities.medium')}:</strong>{' '}
                {t('panels.changePriority.mediumDescription')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟠</span>
              <span>
                <strong>{t('panels.changePriority.priorities.high')}:</strong>{' '}
                {t('panels.changePriority.highDescription')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔴</span>
              <span>
                <strong>{t('panels.changePriority.priorities.urgent')}:</strong>{' '}
                {t('panels.changePriority.urgentDescription')}
              </span>
            </div>
          </div>
        </FlowFeedbackBanner>

        <FlowFeedbackBanner variant="warn">
          <div className="font-medium mb-1">📋 {t('panels.changePriority.useCases')}</div>
          <div className="space-y-1 text-xs">
            <div>• {t('panels.changePriority.useCase1')}</div>
            <div>• {t('panels.changePriority.useCase2')}</div>
            <div>• {t('panels.changePriority.useCase3')}</div>
            <div>• {t('panels.changePriority.useCase4')}</div>
          </div>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}

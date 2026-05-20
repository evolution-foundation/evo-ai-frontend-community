import { useState, useEffect } from 'react';
import {
  Button,
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
import { BaseFlowPanel } from '@/components/base';
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
  const [formDataOptions, setFormDataOptions] = useState<{
    priorities: Array<{ value: string; label: string }>;
  }>({
    priorities: [],
  });
  const [loading, setLoading] = useState(true);

  // Load form data options on mount
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
        // Use defaults if API fails
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
      // Backend compatibility - priority as params array
      action_params: priority ? [priority] : [],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  // Update node with form data when available
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

  const getPriorityColor = (value: string) => {
    const colors: { [key: string]: string } = {
      low: 'text-blue-600 dark:text-blue-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      high: 'text-orange-600 dark:text-orange-400',
      urgent: 'text-red-600 dark:text-red-400',
    };
    return colors[value] || 'text-gray-600 dark:text-gray-400';
  };

  return (
    <BaseFlowPanel
      title={t('panels.changePriority.title')}
      icon={<AlertTriangle className="w-5 h-5 text-indigo-500" />}
      onClose={onClose}
      width="w-[400px]"
    >
      {/* Seleção de prioridade */}
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

      {/* Preview da configuração */}
      {priority && (
        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30">
          <div className="text-sm text-indigo-800 dark:text-indigo-200">
            <div className="font-medium mb-2">
              🎯 {t('panels.changePriority.configurationTitle')}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getPriorityIcon(priority)}</span>
              <div className="space-y-1">
                <div className={`text-sm font-medium ${getPriorityColor(priority)}`}>
                  {formDataOptions.priorities.find(p => p.value === priority)?.label || priority}
                </div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300">
                  {t('panels.changePriority.conversationMarked')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre prioridades */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <div className="font-medium mb-2">💡 {t('panels.changePriority.aboutPriorities')}</div>
          <div className="space-y-2">
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
        </div>
      </div>

      {/* Casos de uso */}
      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
        <div className="text-xs text-amber-800 dark:text-amber-200">
          <div className="font-medium mb-1">📋 {t('panels.changePriority.useCases')}</div>
          <div className="space-y-1">
            <div>• {t('panels.changePriority.useCase1')}</div>
            <div>• {t('panels.changePriority.useCase2')}</div>
            <div>• {t('panels.changePriority.useCase3')}</div>
            <div>• {t('panels.changePriority.useCase4')}</div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!priority || loading}>
          {t('panels.actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}

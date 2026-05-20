import { useState, useEffect } from 'react';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@evoapi/design-system';
import { Clock, Zap, GitBranch } from 'lucide-react';
import { WaitNodeData } from './WaitNode';
import { BaseFlowPanel } from '@/components/base';
import {
  WaitTimeConfig,
  WaitEventConfig,
  WaitConditionConfig,
  WaitHybridConfig,
} from './components';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitPanelProps {
  nodeId: string;
  data: WaitNodeData;
  onUpdate: (nodeId: string, newData: WaitNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function WaitPanel({ nodeId, data, onUpdate, onClose, journeyId }: WaitPanelProps) {
  const { t } = useLanguage('journey');

  const WAIT_TYPE_OPTIONS = [
    {
      value: 'time',
      label: t('panels.wait.types.time'),
      icon: Clock,
      description: t('panels.wait.descriptions.time'),
    },
    {
      value: 'event',
      label: t('panels.wait.types.event'),
      icon: Zap,
      description: t('panels.wait.descriptions.event'),
    },
    {
      value: 'condition',
      label: t('panels.wait.types.condition'),
      icon: GitBranch,
      description: t('panels.wait.descriptions.condition'),
    },
    {
      value: 'time_or_condition',
      label: t('panels.wait.types.timeOrCondition'),
      icon: Clock,
      description: t('panels.wait.descriptions.timeOrCondition'),
    },
  ];

  const [formData, setFormData] = useState<WaitNodeData>({
    ...data,
    waitType: data.waitType || 'time',
  });

  useEffect(() => {
    setFormData({
      ...data,
      waitType: data.waitType || 'time',
    });
  }, [data]);

  const handleSave = () => {
    // Validações baseadas no tipo de wait
    const updatedData = { ...formData };

    switch (formData.waitType) {
      case 'time':
        updatedData.duration = formData.duration || 1;
        updatedData.timeUnit = formData.timeUnit || 'minutes';
        break;
      case 'event':
        // hasTimeout é opcional para event
        if (updatedData.hasTimeout) {
          updatedData.maxWaitTime = updatedData.maxWaitTime || 1;
          updatedData.maxWaitUnit = updatedData.maxWaitUnit || 'hours';
        }
        // enableFallback é opcional para event
        if (updatedData.enableFallback) {
          updatedData.fallbackTime = updatedData.fallbackTime || 1;
          updatedData.fallbackUnit = updatedData.fallbackUnit || 'hours';
        }
        break;
      case 'condition':
        // hasTimeout é opcional para condition
        if (updatedData.hasTimeout) {
          updatedData.maxWaitTime = updatedData.maxWaitTime || 1;
          updatedData.maxWaitUnit = updatedData.maxWaitUnit || 'hours';
        }
        // enableFallback é opcional para condition
        if (updatedData.enableFallback) {
          updatedData.fallbackTime = updatedData.fallbackTime || 1;
          updatedData.fallbackUnit = updatedData.fallbackUnit || 'hours';
        }
        break;
      case 'time_or_condition':
        updatedData.maxWaitTime = updatedData.maxWaitTime || 1;
        updatedData.maxWaitUnit = updatedData.maxWaitUnit || 'hours';
        break;
    }

    onUpdate(nodeId, updatedData);
    onClose();
  };

  const handleWaitTypeChange = (value: 'time' | 'event' | 'condition' | 'time_or_condition') => {
    setFormData(prev => ({
      ...prev,
      waitType: value,
      // Resetar dados específicos quando muda o tipo
      ...(value !== 'time' && {
        duration: undefined,
        timeUnit: undefined,
      }),
      ...(value !== 'event' &&
        value !== 'time_or_condition' && {
          eventTemplate: undefined,
          eventProperties: undefined,
        }),
      ...(value !== 'condition' &&
        value !== 'time_or_condition' && {
          conditionType: undefined,
          conditionField: undefined,
          conditionOperator: undefined,
          conditionValue: undefined,
        }),
      ...(value === 'time' && {
        hasTimeout: undefined,
        maxWaitTime: undefined,
        maxWaitUnit: undefined,
      }),
    }));
  };

  const handleFormDataChange = (updates: Partial<WaitNodeData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const getCurrentWaitTypeOption = () => {
    return (
      WAIT_TYPE_OPTIONS.find(option => option.value === formData.waitType) || WAIT_TYPE_OPTIONS[0]
    );
  };

  const renderConfigurationSection = () => {
    switch (formData.waitType) {
      case 'time':
        return (
          <WaitTimeConfig data={formData} onChange={handleFormDataChange} journeyId={journeyId} />
        );
      case 'event':
        return (
          <WaitEventConfig data={formData} onChange={handleFormDataChange} journeyId={journeyId} />
        );
      case 'condition':
        return (
          <WaitConditionConfig
            data={formData}
            onChange={handleFormDataChange}
            journeyId={journeyId}
          />
        );
      case 'time_or_condition':
        return (
          <WaitHybridConfig data={formData} onChange={handleFormDataChange} journeyId={journeyId} />
        );
      default:
        return null;
    }
  };

  const currentOption = getCurrentWaitTypeOption();
  const IconComponent = currentOption.icon;

  return (
    <BaseFlowPanel
      title={t('panels.wait.title')}
      icon={<IconComponent className="w-5 h-5 text-blue-500" />}
      onClose={onClose}
      width="w-[600px]"
    >
      <Separator />

      <div className="space-y-4">
        {/* Seletor de Tipo de Espera */}
        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">{t('panels.wait.waitType')}</Label>
          <Select value={formData.waitType} onValueChange={handleWaitTypeChange}>
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {WAIT_TYPE_OPTIONS.map(option => {
                const OptionIcon = option.icon;
                return (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-sidebar-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <OptionIcon className="w-4 h-4" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Seção de Configuração Específica */}
        <div className="space-y-4">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.wait.configuration')} - {currentOption.label}
          </Label>
          {renderConfigurationSection()}
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10">
          {t('panels.actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}

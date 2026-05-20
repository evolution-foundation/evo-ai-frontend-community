import { useState } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Checkbox,
} from '@evoapi/design-system';
import { WaitNodeData } from '../WaitNode';
import {
  LabelConfiguration,
  CustomAttributeConfiguration,
  ContactConfiguration,
} from '../../../trigger/components';
import { VariableSelect } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface WaitConditionConfigProps {
  data: WaitNodeData;
  onChange: (updates: Partial<WaitNodeData>) => void;
  journeyId: string;
}

export function WaitConditionConfig({ data, onChange, journeyId }: WaitConditionConfigProps) {
  const { t } = useLanguage('journey');
  const [conditionType, setConditionType] = useState(data.conditionType || 'contactCreated');

  const CONDITION_TYPES = [
    { value: 'contactCreated', label: t('panels.waitComponents.condition.types.contactCreated') },
    { value: 'contactUpdated', label: t('panels.waitComponents.condition.types.contactUpdated') },
    { value: 'label', label: t('panels.waitComponents.condition.types.label') },
    { value: 'customAttribute', label: t('panels.waitComponents.condition.types.customAttribute') },
  ];

  const TIME_UNIT_OPTIONS = [
    { value: 'minutes', label: t('panels.waitComponents.shared.timeUnits.minutes') },
    { value: 'hours', label: t('panels.waitComponents.shared.timeUnits.hours') },
    { value: 'days', label: t('panels.waitComponents.shared.timeUnits.days') },
  ];

  const handleConditionTypeChange = (value: string) => {
    setConditionType(value);
    onChange({
      conditionType: value,
      // Limpar dados específicos quando muda o tipo
      conditionField: undefined,
      conditionOperator: undefined,
      conditionValue: undefined,
      labelId: undefined,
      attributeName: undefined,
      contactFields: undefined,
    });
  };

  const handleFallbackChange = (checked: boolean) => {
    if (checked) {
      onChange({
        enableFallback: checked,
        fallbackTime: data.fallbackTime || 1,
        fallbackUnit: data.fallbackUnit || 'hours',
      });
    } else {
      onChange({
        enableFallback: checked,
        fallbackTime: undefined,
        fallbackUnit: undefined,
      });
    }
  };

  const handleFallbackTimeChange = (value: string) => {
    const fallbackTime = parseInt(value) || 1;
    onChange({ fallbackTime });
  };

  const handleFallbackUnitChange = (value: 'minutes' | 'hours' | 'days') => {
    onChange({ fallbackUnit: value });
  };

  const getConditionSummary = () => {
    if (!conditionType) return t('panels.waitComponents.condition.configureCondition');

    const typeOption = CONDITION_TYPES.find(t => t.value === conditionType);
    let summary = typeOption?.label || conditionType;

    switch (conditionType) {
      case 'contactCreated':
      case 'contactUpdated':
        if (data.contactFields && data.contactFields.length > 0) {
          summary += ` ${t('panels.waitComponents.condition.withFilters')}`;
        }
        break;
      case 'label':
        if (data.labelId) summary += `: ${data.labelId}`;
        break;
      case 'customAttribute':
        if (data.attributeName) summary += `: ${data.attributeName}`;
        break;
    }

    // Adicionar variável selecionada
    if (data.conditionValue) {
      summary += ` ${t('panels.waitComponents.condition.usingVariable')}: ${data.conditionValue}`;
    }

    return summary;
  };

  const renderConditionConfiguration = () => {
    switch (conditionType) {
      case 'contactCreated':
      case 'contactUpdated':
        return (
          <ContactConfiguration
            triggerType={conditionType as 'contactCreated' | 'contactUpdated'}
            contactFields={data.contactFields || []}
            onContactFieldsChange={fields => onChange({ contactFields: fields as any })}
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      case 'label':
        return (
          <LabelConfiguration
            labelId={data.labelId || ''}
            labelAction={data.labelAction || 'applied'}
            onLabelIdChange={labelId => onChange({ labelId })}
            onLabelActionChange={action => onChange({ labelAction: action })}
          />
        );
      case 'customAttribute':
        return (
          <CustomAttributeConfiguration
            attributeName={data.attributeName || ''}
            operator={data.attributeOperator || 'equals'}
            value={data.attributeValue || ''}
            onAttributeNameChange={name => onChange({ attributeName: name })}
            onOperatorChange={operator => onChange({ attributeOperator: operator })}
            onValueChange={value => onChange({ attributeValue: value })}
            variableMappings={data.variableMappings || []}
            onVariableMappingsChange={mappings => onChange({ variableMappings: mappings })}
            journeyId={journeyId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Tipo */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t('panels.waitComponents.condition.typeLabel')}
        </Label>
        <Select value={conditionType} onValueChange={handleConditionTypeChange}>
          <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
            <SelectValue placeholder={t('panels.waitComponents.condition.selectTypePlaceholder')} />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border">
            {CONDITION_TYPES.map(option => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-sidebar-foreground"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Configuração específica do tipo */}
      {conditionType && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t('panels.waitComponents.condition.configurationLabel')} -{' '}
            {CONDITION_TYPES.find(t => t.value === conditionType)?.label}
          </Label>
          {renderConditionConfiguration()}
        </div>
      )}

      {/* Seleção de Variável para Comparação */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {t('panels.waitComponents.condition.variableLabel')}
        </Label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('panels.waitComponents.condition.variableDescription')}
        </p>
        <VariableSelect
          value={data.conditionValue || ''}
          onValueChange={variable => onChange({ conditionValue: variable })}
          placeholder={t('panels.waitComponents.condition.variablePlaceholder')}
          journeyId={journeyId}
          className="w-full"
        />
      </div>

      {/* Caso contrário (substituindo o timeout antigo) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="fallback"
            checked={data.enableFallback || false}
            onCheckedChange={handleFallbackChange}
          />
          <Label htmlFor="fallback" className="text-sm font-medium">
            {t('panels.waitComponents.condition.fallbackLabel')}
          </Label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">
          {t('panels.waitComponents.condition.fallbackDescription')}
        </p>

        {data.enableFallback && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <div className="space-y-2">
              <Label className="text-xs">
                {t('panels.waitComponents.condition.fallbackTimeLabel')}
              </Label>
              <Input
                type="number"
                min="1"
                value={data.fallbackTime || 1}
                onChange={e => handleFallbackTimeChange(e.target.value)}
                placeholder={t('panels.waitComponents.condition.fallbackTimePlaceholder')}
                className="bg-sidebar border-sidebar-border text-sidebar-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">
                {t('panels.waitComponents.condition.fallbackUnitLabel')}
              </Label>
              <Select value={data.fallbackUnit || 'hours'} onValueChange={handleFallbackUnitChange}>
                <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-sidebar border-sidebar-border">
                  {TIME_UNIT_OPTIONS.map(option => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-sidebar-foreground"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>{t('panels.waitComponents.condition.summaryLabel')}:</strong>{' '}
          {t('panels.waitComponents.condition.summaryText', { condition: getConditionSummary() })}.
          {data.enableFallback && data.fallbackTime && data.fallbackUnit && (
            <>
              {' '}
              {t('panels.waitComponents.condition.fallbackSummary', {
                time: data.fallbackTime,
                unit:
                  data.fallbackUnit === 'minutes'
                    ? t('panels.waitComponents.shared.timeUnits.minutes')
                    : data.fallbackUnit === 'hours'
                    ? t('panels.waitComponents.shared.timeUnits.hours')
                    : t('panels.waitComponents.shared.timeUnits.days'),
              })}
              .
            </>
          )}
        </p>
      </div>
    </div>
  );
}

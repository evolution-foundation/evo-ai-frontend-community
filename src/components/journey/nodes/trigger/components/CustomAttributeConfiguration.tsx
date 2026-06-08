import { useState, useEffect } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
} from '@evoapi/design-system';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import { CustomAttributeDefinition } from '@/types/settings';
import { VariableInput, VariableMapping, type DataMapping } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface CustomAttributeConfigurationProps {
  attributeName: string;
  operator: string;
  value: string;
  onAttributeNameChange: (name: string, displayName?: string) => void;
  onOperatorChange: (operator: string) => void;
  onValueChange: (value: string) => void;
  journeyId?: string;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
}

// Moved to component to use translations

export function CustomAttributeConfiguration({
  attributeName,
  operator,
  value,
  onAttributeNameChange,
  onOperatorChange,
  onValueChange,
  journeyId,
  variableMappings = [],
  onVariableMappingsChange,
}: CustomAttributeConfigurationProps) {
  const { t } = useLanguage('journey');
  const [availableAttributes, setAvailableAttributes] = useState<CustomAttributeDefinition[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const OPERATOR_OPTIONS = [
    { value: 'equals', label: t('triggerComponents.operators.equals') },
    { value: 'not_equals', label: t('triggerComponents.operators.not_equals') },
    { value: 'contains', label: t('triggerComponents.operators.contains') },
    { value: 'not_contains', label: t('triggerComponents.operators.not_contains') },
    { value: 'starts_with', label: t('triggerComponents.operators.starts_with') },
    { value: 'ends_with', label: t('triggerComponents.operators.ends_with') },
    { value: 'exists', label: t('triggerComponents.operators.exists') },
    { value: 'not_exists', label: t('triggerComponents.operators.not_exists') },
    { value: 'greater_than', label: t('triggerComponents.operators.greater_than') },
    { value: 'less_than', label: t('triggerComponents.operators.less_than') },
    { value: 'is_empty', label: t('triggerComponents.operators.is_empty') },
    { value: 'is_not_empty', label: t('triggerComponents.operators.is_not_empty') },
  ];

  // Gerar caminhos disponíveis dinamicamente baseado no atributo selecionado
  const generateCustomAttributePaths = () => {
    const basePaths = [
      'attribute.name',
      'attribute.value',
      'attribute.previous_value',
      'attribute.timestamp',
    ];

    // Se tiver atributo selecionado, adicionar caminhos específicos
    if (attributeName && attributeName.trim()) {
      const specificPaths = [`attribute.${attributeName}`, `attribute.${attributeName}_previous`];
      return [...basePaths, ...specificPaths];
    }

    return basePaths;
  };

  useEffect(() => {
    setAvailableAttributes([]);
    setError(null);

    const loadAttributes = async () => {
      if (loadingAttributes) return;

      setLoadingAttributes(true);
      setError(null);

      try {
        const response = await customAttributesService.getCustomAttributes();
        setAvailableAttributes(response.data);
      } catch (error) {
        console.error('Error loading custom attributes:', error);
        setError(t('triggerComponents.customAttribute.loadError'));
      } finally {
        setLoadingAttributes(false);
      }
    };

    loadAttributes();
    // loadingAttributes is a guard flag, not an input — including it would re-run the fetch on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const selectedAttribute = availableAttributes.find(a => a.attribute_key === attributeName);

  const needsValue = (operator: string) => {
    return !['exists', 'not_exists', 'is_empty', 'is_not_empty'].includes(operator);
  };

  const getAttributeTypeLabel = (type: string) => {
    switch (type) {
      case 'string':
        return t('triggerComponents.customAttribute.types.string');
      case 'number':
        return t('triggerComponents.customAttribute.types.number');
      case 'boolean':
        return t('triggerComponents.customAttribute.types.boolean');
      case 'date':
        return t('triggerComponents.customAttribute.types.date');
      case 'datetime':
        return t('triggerComponents.customAttribute.types.datetime', { defaultValue: 'DateTime' });
      default:
        return type;
    }
  };

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <Label className="text-sidebar-foreground font-medium">
          {t('triggerComponents.customAttribute.configuration')}
        </Label>

        {/* Seleção do Atributo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('triggerComponents.customAttribute.customAttribute')}
          </Label>
          {error ? (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          ) : (
            <Select
              value={attributeName}
              onValueChange={selectedAttributeName => {
                const selectedAttribute = availableAttributes.find(
                  a => a.attribute_key === selectedAttributeName,
                );
                onAttributeNameChange(
                  selectedAttributeName,
                  selectedAttribute?.attribute_display_name,
                );
              }}
              disabled={loadingAttributes}
            >
              <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue
                  placeholder={
                    loadingAttributes
                      ? t('triggerComponents.customAttribute.loadingAttributes')
                      : t('triggerComponents.customAttribute.selectAttribute')
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-sidebar-border">
                {loadingAttributes ? (
                  <div className="p-2 text-sm text-sidebar-foreground/60 text-center">
                    {t('triggerComponents.customAttribute.loading')}
                  </div>
                ) : availableAttributes.length === 0 ? (
                  <div className="p-2 text-sm text-sidebar-foreground/60 text-center">
                    {t('triggerComponents.customAttribute.noAttributesFound')}
                  </div>
                ) : (
                  availableAttributes.map(attribute => (
                    <SelectItem
                      key={attribute.id}
                      value={attribute.attribute_key}
                      className="text-sidebar-foreground"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{attribute.attribute_display_name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {getAttributeTypeLabel(attribute.attribute_display_type)}
                          </Badge>
                        </div>
                        <div className="text-xs text-sidebar-foreground/60">
                          {t('triggerComponents.customAttribute.technicalName')}:{' '}
                          {attribute.attribute_key}
                          {attribute.attribute_model &&
                            ` • ${t('triggerComponents.customAttribute.model')}: ${
                              attribute.attribute_model
                            }`}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Operador */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('triggerComponents.customAttribute.condition')}
          </Label>
          <Select value={operator} onValueChange={onOperatorChange}>
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder={t('triggerComponents.customAttribute.selectCondition')} />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {OPERATOR_OPTIONS.map(option => (
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

        {/* Valor */}
        {needsValue(operator) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('triggerComponents.customAttribute.value')}
            </Label>
            <VariableInput
              value={value}
              onChange={e => onValueChange(e.target.value)}
              placeholder={t('triggerComponents.customAttribute.enterValue')}
              className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
              type={
                selectedAttribute?.attribute_display_type === 'number'
                  ? 'number'
                  : selectedAttribute?.attribute_display_type === 'datetime'
                  ? 'datetime-local'
                  : selectedAttribute?.attribute_display_type === 'date'
                  ? 'date'
                  : 'text'
              }
              journeyId={journeyId}
              onVariableInsert={variable => {
                console.log('Variable inserted in custom attribute value:', variable);
              }}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('triggerComponents.customAttribute.useVariablesHint')}
            </p>
          </div>
        )}

        {/* Informações do Atributo Selecionado */}
        {selectedAttribute && (
          <div className="p-4 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50">
            <h4 className="text-sm font-medium text-sidebar-foreground mb-2">
              {t('triggerComponents.customAttribute.selectedAttribute')}
            </h4>
            <div className="space-y-2 text-sm text-sidebar-foreground/70">
              <div className="flex justify-between">
                <span>{t('triggerComponents.customAttribute.name')}:</span>
                <span className="font-medium">{selectedAttribute.attribute_display_name}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('triggerComponents.customAttribute.type')}:</span>
                <Badge variant="secondary" className="text-xs">
                  {getAttributeTypeLabel(selectedAttribute.attribute_display_type)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>{t('triggerComponents.customAttribute.technicalName')}:</span>
                <span className="font-mono text-xs">{selectedAttribute.attribute_key}</span>
              </div>
              {selectedAttribute.attribute_model && (
                <div className="flex justify-between">
                  <span>{t('triggerComponents.customAttribute.model')}:</span>
                  <span className="font-medium">{selectedAttribute.attribute_model}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('triggerComponents.customAttribute.createdAt')}:</span>
                <span className="font-medium">
                  {new Date(selectedAttribute.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Descrição da Configuração */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('triggerComponents.customAttribute.description')}
            {selectedAttribute && (
              <span className="block mt-1 font-medium">
                {t('triggerComponents.customAttribute.attribute')}:{' '}
                {selectedAttribute.attribute_display_name}{' '}
                {operator &&
                  `• ${t('triggerComponents.customAttribute.condition')}: ${
                    OPERATOR_OPTIONS.find(o => o.value === operator)?.label
                  }`}{' '}
                {needsValue(operator) &&
                  value &&
                  `• ${t('triggerComponents.customAttribute.value')}: "${value}"`}
              </span>
            )}
          </p>
        </div>

        {/* Mapeamento de Variáveis */}
        {onVariableMappingsChange && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('triggerComponents.customAttribute.captureAttributeData')}
              </Label>
              <VariableMapping
                mappings={variableMappings}
                onMappingsChange={onVariableMappingsChange}
                paths={generateCustomAttributePaths()}
                journeyId={journeyId}
                className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

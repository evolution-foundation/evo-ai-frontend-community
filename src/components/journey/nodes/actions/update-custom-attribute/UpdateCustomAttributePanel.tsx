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
  Switch,
} from '@evoapi/design-system';
import { Settings as SettingsIcon } from 'lucide-react';
import { UpdateCustomAttributeNodeData } from './UpdateCustomAttributeNode';
import { BaseFlowPanel } from '@/components/base';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CustomAttributeDefinition } from '@/types/settings';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface UpdateCustomAttributePanelProps {
  nodeId: string;
  data: UpdateCustomAttributeNodeData;
  onUpdate: (nodeId: string, newData: UpdateCustomAttributeNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

const ATTRIBUTE_TYPE_ICONS: Record<string, string> = {
  text: '📝',
  number: '🔢',
  currency: '💰',
  percent: '📊',
  link: '🔗',
  date: '📅',
  datetime: '🕒',
  list: '📋',
  checkbox: '☑️',
};

export function UpdateCustomAttributePanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: UpdateCustomAttributePanelProps) {
  const { t } = useLanguage('journey');
  const [formData, setFormData] = useState<UpdateCustomAttributeNodeData>({
    ...data,
  });
  const [attributes, setAttributes] = useState<CustomAttributeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    setLoading(true);
    setError(null);

    try {
      const contactAttributes = await customAttributesService.getCustomAttributes(
        'contact_attribute',
      );
      setAttributes(contactAttributes.data);
    } catch (err) {
      console.error('Error fetching custom attributes:', err);
      setError(t('panels.updateCustomAttribute.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Validação básica
    if (!formData.attributeId) {
      alert(t('panels.updateCustomAttribute.validation.selectAttribute'));
      return;
    }

    if (
      !formData.newValue ||
      (formData.attributeDisplayType !== 'checkbox' && formData.newValue.trim() === '')
    ) {
      alert(t('panels.updateCustomAttribute.validation.enterValue'));
      return;
    }

    onUpdate(nodeId, formData);
    onClose();
  };

  const handleAttributeChange = (attributeId: string) => {
    const selectedAttribute = attributes.find(attr => attr.id === attributeId);

    setFormData(prev => ({
      ...prev,
      attributeId,
      attributeName: selectedAttribute?.attribute_display_name || '',
      attributeDisplayType: selectedAttribute?.attribute_display_type || '',
      newValue: '', // Reset value when changing attribute
    }));
  };

  const handleValueChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      newValue: value,
    }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      newValue: checked.toString(),
    }));
  };

  const selectedAttribute = attributes.find(attr => attr.id === formData.attributeId);
  const isValid =
    formData.attributeId && formData.newValue !== undefined && formData.newValue !== '';

  const normalizeDateTimeLocalValue = (dateTimeValue: string) => {
    if (!dateTimeValue) return '';
    const exactFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (exactFormat.test(dateTimeValue)) return dateTimeValue;
    const prefixMatch = dateTimeValue.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (prefixMatch) return prefixMatch[1];
    return dateTimeValue;
  };

  const renderValueInput = () => {
    if (!selectedAttribute) return null;

    switch (selectedAttribute.attribute_display_type) {
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id="checkbox-value"
              checked={formData.newValue === 'true'}
              onCheckedChange={handleCheckboxChange}
            />
            <Label htmlFor="checkbox-value" className="text-sm">
              {formData.newValue === 'true'
                ? t('panels.updateCustomAttribute.booleanValues.true')
                : t('panels.updateCustomAttribute.booleanValues.false')}
            </Label>
          </div>
        );

      case 'list':
        return (
          <Select value={formData.newValue || ''} onValueChange={handleValueChange}>
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder={t('panels.updateCustomAttribute.listPlaceholder')} />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {selectedAttribute.attribute_values?.map(option => (
                <SelectItem key={option} value={option} className="text-sidebar-foreground">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <VariableInput
            type="date"
            value={formData.newValue || ''}
            onChange={e => handleValueChange(e.target.value)}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            journeyId={journeyId}
          />
        );

      case 'datetime':
        return (
          <VariableInput
            type="datetime-local"
            value={normalizeDateTimeLocalValue(formData.newValue || '')}
            onChange={e => handleValueChange(e.target.value)}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            journeyId={journeyId}
          />
        );

      case 'number':
      case 'currency':
      case 'percent':
        return (
          <VariableInput
            type="number"
            step={selectedAttribute.attribute_display_type === 'currency' ? '0.01' : '1'}
            placeholder={
              selectedAttribute.attribute_display_type === 'percent'
                ? t('panels.updateCustomAttribute.placeholders.percent')
                : selectedAttribute.attribute_display_type === 'currency'
                ? t('panels.updateCustomAttribute.placeholders.currency')
                : t('panels.updateCustomAttribute.placeholders.number')
            }
            value={formData.newValue || ''}
            onChange={e => handleValueChange(e.target.value)}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            journeyId={journeyId}
          />
        );

      case 'link':
        return (
          <VariableInput
            type="url"
            placeholder={t('panels.updateCustomAttribute.placeholders.link')}
            value={formData.newValue || ''}
            onChange={e => handleValueChange(e.target.value)}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            journeyId={journeyId}
          />
        );

      default:
        return (
          <VariableInput
            type="text"
            placeholder={t('panels.updateCustomAttribute.placeholders.text')}
            value={formData.newValue || ''}
            onChange={e => handleValueChange(e.target.value)}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            journeyId={journeyId}
          />
        );
    }
  };

  return (
    <BaseFlowPanel
      title={t('panels.updateCustomAttribute.title')}
      icon={<SettingsIcon className="w-5 h-5 text-pink-500" />}
      onClose={onClose}
      width="w-[600px]"
    >
      <Separator />

      <div className="space-y-4">
        {/* Status de validação */}
        {!isValid && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('panels.updateCustomAttribute.incompleteConfig')}:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
              {!formData.attributeId && (
                <li>{t('panels.updateCustomAttribute.selectAttribute')}</li>
              )}
              {!formData.newValue && formData.attributeId && (
                <li>{t('panels.updateCustomAttribute.configureValue')}</li>
              )}
            </ul>
          </div>
        )}

        {/* Seleção do atributo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('panels.updateCustomAttribute.customAttribute')}
          </Label>
          <Select
            value={formData.attributeId || ''}
            onValueChange={handleAttributeChange}
            disabled={loading}
          >
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue
                placeholder={
                  loading
                    ? t('panels.updateCustomAttribute.loading')
                    : t('panels.updateCustomAttribute.selectAttributePlaceholder')
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {attributes.map(attribute => (
                <SelectItem
                  key={attribute.id}
                  value={attribute.id}
                  className="text-sidebar-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {ATTRIBUTE_TYPE_ICONS[attribute.attribute_display_type] || '⚙️'}
                    </span>
                    <div>
                      <div className="font-medium">{attribute.attribute_display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('panels.updateCustomAttribute.typeLabel')}:{' '}
                        {attribute.attribute_display_type}
                        {attribute.attribute_description && ` • ${attribute.attribute_description}`}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Erro ao carregar */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Campo de novo valor */}
        {selectedAttribute && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('panels.updateCustomAttribute.newValue')}
            </Label>
            {renderValueInput()}
            {selectedAttribute.attribute_description && (
              <p className="text-xs text-muted-foreground">
                {selectedAttribute.attribute_description}
              </p>
            )}
          </div>
        )}

        {/* Preview da atualização */}
        {isValid && (
          <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800/30">
            <p className="text-sm text-pink-800 dark:text-pink-200 mb-2">
              <strong>{t('panels.updateCustomAttribute.preview.title')}:</strong>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {ATTRIBUTE_TYPE_ICONS[selectedAttribute?.attribute_display_type || ''] || '⚙️'}
              </span>
              <span className="font-medium">{formData.attributeName}</span>
              <span className="text-pink-600 dark:text-pink-400">→</span>
              <span className="font-medium text-pink-700 dark:text-pink-300">
                {selectedAttribute?.attribute_display_type === 'checkbox'
                  ? formData.newValue === 'true'
                    ? t('panels.updateCustomAttribute.booleanValues.true')
                    : t('panels.updateCustomAttribute.booleanValues.false')
                  : formData.newValue}
              </span>
            </div>
            <p className="text-xs text-pink-600 dark:text-pink-400 mt-2">
              {t('panels.updateCustomAttribute.preview.description')}
            </p>
          </div>
        )}

        {/* Ajuda */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>{t('panels.updateCustomAttribute.help.title')}:</strong>{' '}
            {t('panels.updateCustomAttribute.help.description')}
          </p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.updateCustomAttribute.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!isValid}>
          {isValid
            ? t('panels.updateCustomAttribute.actions.save')
            : t('panels.updateCustomAttribute.actions.configureAttribute')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}

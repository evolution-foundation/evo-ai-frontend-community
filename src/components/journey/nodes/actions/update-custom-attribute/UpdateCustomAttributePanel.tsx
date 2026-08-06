import { useEffect, useMemo, useState } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@evoapi/design-system';
import { Settings as SettingsIcon } from 'lucide-react';
import { UpdateCustomAttributeNodeData } from './UpdateCustomAttributeNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CustomAttributeDefinition } from '@/types/settings';
import { VariableInput } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';
import { isExpressionFieldValid } from '@/utils/templateVariables';

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
  const [originalData] = useState<UpdateCustomAttributeNodeData>(() => ({ ...data }));
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
    onUpdate(nodeId, formData);
    onClose();
  };

  const handleAttributeChange = (attributeId: string) => {
    const selectedAttribute = attributes.find(attr => attr.id === attributeId);

    setFormData(prev => ({
      ...prev,
      attributeId,
      // attributeName MUST be the attribute_key (slug) — it is what the
      // evo-flow Update node persists as the CRM custom_attributes key, and
      // what a downstream Conditional reads via
      // {{contact.customAttributes.<attribute_key>}} (EVO-1850 / EVO-1837).
      attributeName: selectedAttribute?.attribute_key || '',
      attributeDisplayName: selectedAttribute?.attribute_display_name || '',
      attributeDisplayType: selectedAttribute?.attribute_display_type || '',
      newValue: '',
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
    Boolean(formData.attributeId && formData.newValue !== undefined && formData.newValue !== '') &&
    // EVO-1872: block Save on an unbalanced {{ }} expression in the new value.
    isExpressionFieldValid(formData.newValue);
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

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
            validateExpression
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
            validateExpression
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
            validateExpression
          />
        );
    }
  };

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.updateCustomAttribute.title')}
      icon={<SettingsIcon className="h-5 w-5 text-flow-node-control-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.updateCustomAttribute.actions.save')}
      cancelLabel={t('panels.updateCustomAttribute.actions.cancel')}
    >
      <div className="space-y-4">
        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="font-medium">{t('panels.updateCustomAttribute.incompleteConfig')}:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              {!formData.attributeId && (
                <li>{t('panels.updateCustomAttribute.selectAttribute')}</li>
              )}
              {!formData.newValue && formData.attributeId && (
                <li>{t('panels.updateCustomAttribute.configureValue')}</li>
              )}
            </ul>
          </FlowFeedbackBanner>
        )}

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

        {error && (
          <FlowFeedbackBanner variant="error">
            <p>{error}</p>
          </FlowFeedbackBanner>
        )}

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

        {isValid && (
          <FlowFeedbackBanner variant="info">
            <p className="mb-2">
              <strong>{t('panels.updateCustomAttribute.preview.title')}:</strong>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {ATTRIBUTE_TYPE_ICONS[selectedAttribute?.attribute_display_type || ''] || '⚙️'}
              </span>
              <span className="font-medium">
                {formData.attributeDisplayName ||
                  selectedAttribute?.attribute_display_name}
              </span>
              <span>→</span>
              <span className="font-medium">
                {selectedAttribute?.attribute_display_type === 'checkbox'
                  ? formData.newValue === 'true'
                    ? t('panels.updateCustomAttribute.booleanValues.true')
                    : t('panels.updateCustomAttribute.booleanValues.false')
                  : formData.newValue}
              </span>
            </div>
            <p className="text-xs mt-2">{t('panels.updateCustomAttribute.preview.description')}</p>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="info">
          <p>
            <strong>{t('panels.updateCustomAttribute.help.title')}:</strong>{' '}
            {t('panels.updateCustomAttribute.help.description')}
          </p>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}

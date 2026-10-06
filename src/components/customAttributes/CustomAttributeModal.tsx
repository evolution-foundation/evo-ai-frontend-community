import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label as UILabel,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Badge,
} from '@evoapi/design-system';
import { X, Plus } from 'lucide-react';
import {
  CustomAttributeDefinition,
  CustomAttributeFormData,
  AttributeModel,
  AttributeDisplayType,
  PipelineType,
  ATTRIBUTE_MODEL_OPTIONS,
  ATTRIBUTE_TYPE_OPTIONS,
  PIPELINE_TYPE_OPTIONS,
  pipelineTypeToAttributeModel,
  attributeModelToPipelineType,
} from '@/types/settings';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';

interface CustomAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute?: CustomAttributeDefinition;
  isNew: boolean;
  loading: boolean;
  onSubmit: (data: CustomAttributeFormData) => void;
  defaultAttributeModel?: AttributeModel;
  /** Field messages from a rejected save, already translated. */
  serverErrors?: Record<string, string>;
}

export default function CustomAttributeModal({
  open,
  onOpenChange,
  attribute,
  isNew,
  loading,
  onSubmit,
  defaultAttributeModel = 'conversation_attribute',
  serverErrors,
}: CustomAttributeModalProps) {
  const { t } = useLanguage('customAttributes');
  const [formData, setFormData] = useState<CustomAttributeFormData>({
    attribute_display_name: '',
    attribute_description: '',
    attribute_display_type: AttributeDisplayType.TEXT,
    attribute_key: '',
    attribute_model: defaultAttributeModel,
    pipeline_type: undefined,
    regex_pattern: '',
    regex_cue: '',
    attribute_values: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [regexEnabled, setRegexEnabled] = useState(false);
  const [listValue, setListValue] = useState('');

  // Auto-generate attribute key from display name
  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      attribute_display_name: value,
      attribute_key: customAttributesService.generateAttributeKey(value),
    }));

    // The key is regenerated from the name, so a server error on it is stale too.
    if (errors.attribute_display_name || errors.attribute_key) {
      setErrors(prev => ({ ...prev, attribute_display_name: '', attribute_key: '' }));
    }
  };

  useEffect(() => {
    if (open) {
      if (attribute && !isNew) {
        const pipelineType = attributeModelToPipelineType(attribute.attribute_model);
        setFormData({
          attribute_display_name: attribute.attribute_display_name,
          attribute_description: attribute.attribute_description || '',
          attribute_display_type: attribute.attribute_display_type,
          attribute_key: attribute.attribute_key,
          attribute_model: pipelineType ? 'pipeline_attribute' : attribute.attribute_model,
          pipeline_type: pipelineType || undefined,
          regex_pattern: attribute.regex_pattern || '',
          regex_cue: attribute.regex_cue || '',
          attribute_values: attribute.attribute_values || [],
        });
        setRegexEnabled(!!attribute.regex_pattern);
      } else {
        setFormData({
          attribute_display_name: '',
          attribute_description: '',
          attribute_display_type: AttributeDisplayType.TEXT,
          attribute_key: '',
          attribute_model: defaultAttributeModel,
          pipeline_type: undefined,
          regex_pattern: '',
          regex_cue: '',
          attribute_values: [],
        });
        setRegexEnabled(false);
      }
      setErrors({});
      setListValue('');
    }
  }, [open, attribute, isNew, defaultAttributeModel]);

  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.attribute_display_name.trim()) {
      newErrors.attribute_display_name = t('modal.fields.displayName.errors.required');
    } else if (formData.attribute_display_name.length < 2) {
      newErrors.attribute_display_name = t('modal.fields.displayName.errors.minLength');
    }

    if (!formData.attribute_description?.trim()) {
      newErrors.attribute_description = t('modal.fields.description.errors.required');
    }

    if (!formData.attribute_key.trim()) {
      newErrors.attribute_key = t('modal.fields.attributeKey.errors.required');
    } else if (!/^[a-z0-9_]+$/.test(formData.attribute_key)) {
      newErrors.attribute_key = t('modal.fields.attributeKey.errors.invalid');
    }

    // Validate pipeline_type when attribute_model is pipeline_attribute
    if (formData.attribute_model === 'pipeline_attribute' && !formData.pipeline_type) {
      newErrors.pipeline_type = t('modal.fields.pipelineType.errors.required');
    }

    if (
      formData.attribute_display_type === AttributeDisplayType.LIST &&
      (!formData.attribute_values || formData.attribute_values.length === 0)
    ) {
      newErrors.attribute_values = t('modal.fields.listValues.errors.required');
    }

    if (
      regexEnabled &&
      formData.regex_pattern &&
      !customAttributesService.validateRegexPattern(formData.regex_pattern)
    ) {
      newErrors.regex_pattern = t('modal.fields.regexPattern.errors.invalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Convert pipeline_type to the correct attribute_model
    let finalAttributeModel = formData.attribute_model;
    if (formData.attribute_model === 'pipeline_attribute' && formData.pipeline_type) {
      finalAttributeModel = pipelineTypeToAttributeModel(formData.pipeline_type);
    }

    // Create submit data without pipeline_type (it's only for UI selection)
    const { pipeline_type, ...formDataWithoutPipelineType } = formData;
    const submitData: CustomAttributeFormData = {
      ...formDataWithoutPipelineType,
      attribute_model: finalAttributeModel,
      regex_pattern: regexEnabled ? formData.regex_pattern : undefined,
      regex_cue: regexEnabled ? formData.regex_cue : undefined,
    };

    onSubmit(submitData);
  };

  const handleInputChange = (field: keyof CustomAttributeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // List management
  const addListValue = () => {
    if (!listValue.trim()) return;

    const newValues = [...(formData.attribute_values || []), listValue.trim()];
    setFormData(prev => ({ ...prev, attribute_values: newValues }));
    setListValue('');

    if (errors.attribute_values) {
      setErrors(prev => ({ ...prev, attribute_values: '' }));
    }
  };

  const removeListValue = (index: number) => {
    const newValues = formData.attribute_values?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, attribute_values: newValues }));
  };

  const handleListValueKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addListValue();
    }
  };

  const isListType = formData.attribute_display_type === AttributeDisplayType.LIST;
  const isTextType = formData.attribute_display_type === AttributeDisplayType.TEXT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? t('modal.title.new') : t('modal.title.edit')}</DialogTitle>
          <DialogDescription>
            {isNew ? t('modal.description.new') : t('modal.description.edit')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Attribute Model */}
          <div className="space-y-2">
            <UILabel htmlFor="attribute_model">
              {t('modal.fields.attributeModel.label')} <span className="text-destructive">*</span>
            </UILabel>
            <Select
              value={formData.attribute_model}
              onValueChange={value => {
                handleInputChange('attribute_model', value as AttributeModel);
                // Reset pipeline_type when changing attribute_model
                if (value !== 'pipeline_attribute') {
                  handleInputChange('pipeline_type', undefined);
                }
              }}
              disabled={!isNew} // Can't change model when editing
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTRIBUTE_MODEL_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{t(option.labelKey)}</div>
                      <div className="text-xs text-muted-foreground">{t(option.descriptionKey)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pipeline Type - Only shown when attribute_model is pipeline_attribute */}
          {formData.attribute_model === 'pipeline_attribute' && (
            <div className="space-y-2">
              <UILabel htmlFor="pipeline_type">
                {t('modal.fields.pipelineType.label')} <span className="text-destructive">*</span>
              </UILabel>
              <Select
                value={formData.pipeline_type || ''}
                onValueChange={value => handleInputChange('pipeline_type', value as PipelineType)}
                disabled={!isNew} // Can't change type when editing
              >
                <SelectTrigger className={errors.pipeline_type ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('modal.fields.pipelineType.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{t(option.labelKey)}</div>
                        <div className="text-xs text-muted-foreground">{t(option.descriptionKey)}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pipeline_type && (
                <p className="text-sm text-destructive">{errors.pipeline_type}</p>
              )}
              <p className="text-xs text-muted-foreground">{t('modal.fields.pipelineType.hint')}</p>
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-2">
            <UILabel htmlFor="attribute_display_name">
              {t('modal.fields.displayName.label')} <span className="text-destructive">*</span>
            </UILabel>
            <Input
              id="attribute_display_name"
              value={formData.attribute_display_name}
              onChange={e => handleDisplayNameChange(e.target.value)}
              placeholder={t('modal.fields.displayName.placeholder')}
              className={errors.attribute_display_name ? 'border-destructive' : ''}
            />
            {errors.attribute_display_name && (
              <p className="text-sm text-destructive">{errors.attribute_display_name}</p>
            )}
          </div>

          {/* Attribute Key */}
          <div className="space-y-2">
            <UILabel htmlFor="attribute_key">
              {t('modal.fields.attributeKey.label')} <span className="text-destructive">*</span>
            </UILabel>
            <Input
              id="attribute_key"
              value={formData.attribute_key}
              onChange={e => handleInputChange('attribute_key', e.target.value)}
              placeholder={t('modal.fields.attributeKey.placeholder')}
              className={`font-mono ${errors.attribute_key ? 'border-destructive' : ''}`}
              disabled={!isNew} // Can't change key when editing
            />
            {errors.attribute_key && (
              <p className="text-sm text-destructive">{errors.attribute_key}</p>
            )}
            <p className="text-xs text-muted-foreground">{t('modal.fields.attributeKey.hint')}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <UILabel htmlFor="attribute_description">
              {t('modal.fields.description.label')} <span className="text-destructive">*</span>
            </UILabel>
            <Textarea
              id="attribute_description"
              value={formData.attribute_description}
              onChange={e => handleInputChange('attribute_description', e.target.value)}
              placeholder={t('modal.fields.description.placeholder')}
              className={`resize-none ${errors.attribute_description ? 'border-destructive' : ''}`}
              rows={3}
            />
            {errors.attribute_description && (
              <p className="text-sm text-destructive">{errors.attribute_description}</p>
            )}
          </div>

          {/* Attribute Type */}
          <div className="space-y-2">
            <UILabel htmlFor="attribute_display_type">
              {t('modal.fields.displayType.label')} <span className="text-destructive">*</span>
            </UILabel>
            <Select
              value={formData.attribute_display_type}
              onValueChange={value =>
                handleInputChange('attribute_display_type', value as AttributeDisplayType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTRIBUTE_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">
                        {t(option.labelKey, { defaultValue: option.defaultLabel })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t(option.descriptionKey, { defaultValue: option.defaultDescription })}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* List Values */}
          {isListType && (
            <div className="space-y-2">
              <UILabel>
                {t('modal.fields.listValues.label')} <span className="text-destructive">*</span>
              </UILabel>
              <div className="flex gap-2">
                <Input
                  value={listValue}
                  onChange={e => setListValue(e.target.value)}
                  onKeyPress={handleListValueKeyPress}
                  placeholder={t('modal.fields.listValues.placeholder')}
                />
                <Button type="button" onClick={addListValue} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.attribute_values && (
                <p className="text-sm text-destructive">{errors.attribute_values}</p>
              )}

              {/* Show current values */}
              {formData.attribute_values && formData.attribute_values.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.attribute_values.map((value, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {value}
                      <Button
                        type="button"
                        onClick={() => removeListValue(index)}
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Regex Pattern for Text Types */}
          {isTextType && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <UILabel htmlFor="regex_enabled">{t('modal.fields.regexEnabled.label')}</UILabel>
                  <p className="text-sm text-muted-foreground">
                    {t('modal.fields.regexEnabled.description')}
                  </p>
                </div>
                <Switch
                  id="regex_enabled"
                  checked={regexEnabled}
                  onCheckedChange={setRegexEnabled}
                />
              </div>

              {regexEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <UILabel htmlFor="regex_pattern">{t('modal.fields.regexPattern.label')}</UILabel>
                    <Input
                      id="regex_pattern"
                      value={formData.regex_pattern}
                      onChange={e => handleInputChange('regex_pattern', e.target.value)}
                      placeholder={t('modal.fields.regexPattern.placeholder')}
                      className={`font-mono ${errors.regex_pattern ? 'border-destructive' : ''}`}
                    />
                    {errors.regex_pattern && (
                      <p className="text-sm text-destructive">{errors.regex_pattern}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <UILabel htmlFor="regex_cue">{t('modal.fields.regexCue.label')}</UILabel>
                    <Input
                      id="regex_cue"
                      value={formData.regex_cue}
                      onChange={e => handleInputChange('regex_cue', e.target.value)}
                      placeholder={t('modal.fields.regexCue.placeholder')}
                    />
                    <p className="text-xs text-muted-foreground">{t('modal.fields.regexCue.hint')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('actions.cancel')}
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? t('actions.saving') : isNew ? t('actions.create') : t('actions.update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

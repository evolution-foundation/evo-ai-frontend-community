import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
} from '@evoapi/design-system';
import { Plus, X, Settings } from 'lucide-react';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import {
  PipelineAttributeDefinition,
  AttributeModel,
  PipelineAttributeContext,
  CustomAttributeDefinition,
  AttributeDisplayType,
  ATTRIBUTE_TYPE_OPTIONS,
} from '@/types/settings';
import { LocalAttributeDefinition, LocalAttributeDefinitionPayload } from '@/types/pipelines/localAttributeDefinition';

export interface PipelineCustomAttributesFormProps {
  /** The attribute model type (e.g., 'pipeline_attribute', 'pipeline_stage_attribute', 'pipeline_item_attribute') */
  attributeModel: AttributeModel;
  /** Current attributes values */
  attributes: Record<string, unknown> | null | undefined;
  /** Callback when attributes change */
  onAttributesChange: (attributes: Record<string, unknown>) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Pipeline hierarchy context (for filtering shared attributes) */
  pipelineContext: PipelineAttributeContext;
  /** Custom fields from pipeline (contains attributes array) */
  pipelineCustomFields?: Record<string, unknown> & {
    attributes?: string[];
    attribute_definitions?: Record<string, LocalAttributeDefinitionPayload>;
  };
  /** Custom fields from stage (contains attributes array) */
  stageCustomFields?: Record<string, unknown> & {
    attributes?: string[];
    attribute_definitions?: Record<string, LocalAttributeDefinitionPayload>;
  };
}

/**
 * Pipeline-specific CustomAttributesForm component with hierarchy support.
 * Handles attribute filtering and editing permissions based on pipeline hierarchy.
 */
export default function PipelineCustomAttributesForm({
  attributeModel,
  attributes,
  onAttributesChange,
  disabled = false,
  pipelineContext,
  pipelineCustomFields,
  stageCustomFields,
}: PipelineCustomAttributesFormProps) {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('customAttributes');
  const [definedAttributes, setDefinedAttributes] = useState<PipelineAttributeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAttributeKey, setNewAttributeKey] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [newAttributeType, setNewAttributeType] = useState<AttributeDisplayType>('text');
  const [newAttributeListValues, setNewAttributeListValues] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [createError, setCreateError] = useState('');
  const hasLoadedRef = useRef(false);
  const loadContextRef = useRef<string>('');

  // Determine current context level
  const getCurrentContextLevel = (): 'pipeline' | 'stage' | 'item' => {
    if (pipelineContext.itemId) return 'item';
    if (pipelineContext.stageId) return 'stage';
    return 'pipeline';
  };

  // Get attribute origin label for display
  const getAttributeOrigin = (attribute: PipelineAttributeDefinition): 'pipeline' | 'stage' | 'item' | null => {
    const attrModel = attribute.attribute_model;
    if (attrModel === 'pipeline_attribute') return 'pipeline';
    if (attrModel === 'pipeline_stage_attribute') return 'stage';
    if (attrModel === 'pipeline_item_attribute') return 'item';
    return null;
  };

  // Filter attributes based on hierarchy rules
  // Simplified: Pipeline/Stage create attributes for items, Item creates for itself
  const filterAttributesByHierarchy = (allAttributes: PipelineAttributeDefinition[]): PipelineAttributeDefinition[] => {
    const contextLevel = getCurrentContextLevel();

    return allAttributes.filter(attr => {
      const attrModel = attr.attribute_model;

      // Pipeline level: show only pipeline attributes (they are for items)
      if (contextLevel === 'pipeline') {
        return attrModel === 'pipeline_attribute';
      }

      // Stage level: show pipeline attributes (shared with items) and stage attributes (for items)
      if (contextLevel === 'stage') {
        return attrModel === 'pipeline_attribute' || attrModel === 'pipeline_stage_attribute';
      }

      // Item level: show all attributes (pipeline, stage, and item attributes)
      if (contextLevel === 'item') {
        return attrModel === 'pipeline_attribute' ||
          attrModel === 'pipeline_stage_attribute' ||
          attrModel === 'pipeline_item_attribute';
      }

      return false;
    });
  };

  // Check if an attribute value can be edited in current context
  // Only items can edit attribute values
  const canEditAttributeValue = (): boolean => {
    const contextLevel = getCurrentContextLevel();
    return contextLevel === 'item';
  };

  // Load defined custom attributes for the specified model
  // Load only once per unique context (pipeline/stage/item combination)
  useEffect(() => {
    // Create a unique context key based on pipeline hierarchy (not attribute values)
    const contextKey = `${attributeModel}-${pipelineContext.pipelineId || ''}-${pipelineContext.stageId || ''}-${pipelineContext.itemId || ''}`;

    // Skip if already loaded for this context
    if (hasLoadedRef.current && loadContextRef.current === contextKey) {
      return;
    }

    const loadDefinedAttributes = async () => {
      setLoading(true);
      try {
        // Load all attributes for the model and related models
        const modelsToLoad: AttributeModel[] = [attributeModel];

        // Also load parent models based on context
        if (pipelineContext.itemId || pipelineContext.stageId) {
          modelsToLoad.push('pipeline_attribute');
        }
        if (pipelineContext.itemId) {
          modelsToLoad.push('pipeline_stage_attribute');
        }

        const allResponses = await Promise.all(
          modelsToLoad.map(model => customAttributesService.getCustomAttributes(model))
        );

        // Combine all attributes
        const allAttributes = allResponses.flatMap(response => response.data);

        // Filter based on hierarchy
        let filteredAttributes = filterAttributesByHierarchy(allAttributes);

        // If we have pipeline or stage custom_fields with attributes, include those attribute keys
        // This ensures that attributes defined at pipeline/stage level are shown in the item form
        if (pipelineContext.itemId) {
          const pipelineAttributeKeys = (pipelineCustomFields?.attributes as string[]) || [];
          const stageAttributeKeys = (stageCustomFields?.attributes as string[]) || [];
          const pipelineDefinitions =
            (pipelineCustomFields?.attribute_definitions as Record<string, LocalAttributeDefinitionPayload>) ||
            {};
          const stageDefinitions =
            (stageCustomFields?.attribute_definitions as Record<string, LocalAttributeDefinitionPayload>) ||
            {};
          const mergedDefinitions = { ...pipelineDefinitions, ...stageDefinitions };

          // Get all unique attribute keys from pipeline and stage
          const allAttributeKeys = new Set([
            ...pipelineAttributeKeys,
            ...stageAttributeKeys,
          ]);

          // Find attributes that match these keys
          const matchingAttributes = allAttributes.filter(attr =>
            allAttributeKeys.has(attr.attribute_key)
          );

          // Create placeholder definitions for keys that don't have definitions yet
          const missingKeys = Array.from(allAttributeKeys).filter(key =>
            !allAttributes.some(attr => attr.attribute_key === key)
          );

          const placeholderAttributes: PipelineAttributeDefinition[] = missingKeys.map(key => ({
            id: `placeholder-${key}`,
            attribute_key: key,
            attribute_display_name: mergedDefinitions[key]?.attribute_display_name || key,
            attribute_display_type: mergedDefinitions[key]?.attribute_display_type || 'text',
            attribute_values: mergedDefinitions[key]?.attribute_values,
            attribute_model: stageDefinitions[key] ? 'pipeline_stage_attribute' : 'pipeline_attribute',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          // Combine matching attributes with placeholders
          const combinedAttributes = [
            ...matchingAttributes,
            ...placeholderAttributes,
          ];

          // Merge with filtered attributes, avoiding duplicates
          const existingKeys = new Set(filteredAttributes.map(attr => attr.attribute_key));
          const newAttributes = combinedAttributes.filter(attr => !existingKeys.has(attr.attribute_key));
          filteredAttributes = [...filteredAttributes, ...newAttributes];
        }

        setDefinedAttributes(filteredAttributes);
        hasLoadedRef.current = true;
        loadContextRef.current = contextKey;
      } catch (error) {
        console.error('Error loading custom attributes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDefinedAttributes();
    // Only depend on the context identifiers, not on custom_fields values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeModel, pipelineContext.pipelineId, pipelineContext.stageId, pipelineContext.itemId]);

  // Form mode handlers
  const resetAddForm = () => {
    setShowAddForm(false);
    setNewAttributeKey('');
    setNewAttributeValue('');
    setNewAttributeType('text');
    setNewAttributeListValues('');
    setCreateError('');
  };

  const handleAddAttribute = () => {
    if (!newAttributeKey.trim()) return;

    const contextLevel = getCurrentContextLevel();
    const newAttributes = { ...(attributes || {}) };
    const trimmedKey = newAttributeKey.trim();
    setCreateError('');
    const invalidKeyMessage = t('modal.fields.attributeKey.errors.invalid');
    const duplicateKeyMessage = t('modal.fields.attributeKey.errors.duplicate', {
      defaultValue: 'Attribute key already exists',
    });

    if (contextLevel === 'item') {
      if (!/^[a-z0-9_]+$/.test(trimmedKey)) {
        setCreateError(invalidKeyMessage);
        return;
      }
      if (Object.keys(newAttributes).includes(trimmedKey) || definedAttributes.some(attribute => attribute.attribute_key === trimmedKey)) {
        setCreateError(duplicateKeyMessage);
        return;
      }
      if (!newAttributeValue.trim()) {
        return;
      }
      newAttributes[trimmedKey] = newAttributeValue.trim();
      onAttributesChange(newAttributes);
      resetAddForm();
      return;
    }

    const displayName = trimmedKey;
    const generatedKey = customAttributesService.generateAttributeKey(displayName);
    if (!generatedKey) {
      setCreateError(invalidKeyMessage);
      return;
    }
    if (Object.keys(newAttributes).includes(generatedKey)) {
      setCreateError(duplicateKeyMessage);
      return;
    }
    if (definedAttributes.some(attribute => attribute.attribute_key === generatedKey)) {
      setCreateError(duplicateKeyMessage);
      return;
    }

    let listValues: string[] | undefined;
    if (newAttributeType === 'list') {
      listValues = newAttributeListValues
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      if (!listValues.length) {
        setCreateError(t('modal.fields.listValues.errors.required'));
        return;
      }
    }

    newAttributes[generatedKey] = {
      __local_definition: true,
      attribute_display_name: displayName,
      attribute_display_type: newAttributeType,
      attribute_values: listValues,
    } satisfies LocalAttributeDefinition;

    onAttributesChange(newAttributes);
    resetAddForm();
  };

  const handleRemoveAttribute = (key: string) => {
    // Create a completely new object without the removed attribute
    const currentAttributes = attributes || {};
    const newAttributes = Object.keys(currentAttributes).reduce((acc, attrKey) => {
      if (attrKey !== key) {
        acc[attrKey] = currentAttributes[attrKey];
      }
      return acc;
    }, {} as Record<string, unknown>);

    onAttributesChange(newAttributes);
  };

  const handleUpdateAttribute = (key: string, value: unknown) => {
    onAttributesChange({
      ...(attributes || {}),
      [key]: value,
    });
  };

  // Helper function to convert value to string, handling objects
  const valueToString = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const normalizeDateTimeLocalValue = (value: string) => {
    if (!value) return '';
    const exactFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (exactFormat.test(value)) return value;
    const prefixMatch = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (prefixMatch) return prefixMatch[1];
    return value;
  };

  const getAttributeTypeLabel = (type: AttributeDisplayType | string): string => {
    const option = ATTRIBUTE_TYPE_OPTIONS.find(current => current.value === type);
    return option?.defaultLabel || (option?.labelKey ? t(option.labelKey) : String(type));
  };

  const getTypeOptionLabel = (option: (typeof ATTRIBUTE_TYPE_OPTIONS)[number]): string => {
    if (option.defaultLabel) return option.defaultLabel;
    if (option.labelKey) return t(option.labelKey);
    return String(option.value);
  };

  const getTypeOptionDescription = (option: (typeof ATTRIBUTE_TYPE_OPTIONS)[number]): string => {
    if (option.defaultDescription) return option.defaultDescription;
    if (option.descriptionKey) return t(option.descriptionKey);
    return '';
  };

  // Render field based on attribute type
  const renderFormField = (attribute: CustomAttributeDefinition) => {
    const rawValue = attributes?.[attribute.attribute_key];
    const value = valueToString(rawValue);
    const canEdit = canEditAttributeValue();

    const commonProps = {
      disabled: disabled || !canEdit,
    };

    switch (attribute.attribute_display_type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.text', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            {...commonProps}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.number', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            {...commonProps}
          />
        );

      case 'currency':
        return (
          <Input
            type="number"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.number', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            step="0.01"
            min="0"
            {...commonProps}
          />
        );

      case 'percent':
        return (
          <Input
            type="number"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.number', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            step="0.01"
            min="0"
            max="100"
            {...commonProps}
          />
        );

      case 'link':
        return (
          <Input
            type="url"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.link')}
            {...commonProps}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            onClick={event => {
              (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
            }}
            className="[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
            {...commonProps}
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={normalizeDateTimeLocalValue(value)}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            {...commonProps}
          />
        );

      case 'list':
        return (
          <Select
            value={value}
            onValueChange={newValue => handleUpdateAttribute(attribute.attribute_key, newValue)}
            disabled={disabled || !canEdit}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t('placeholders.select', {
                  name: attribute.attribute_display_name.toLowerCase(),
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {attribute.attribute_values?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(rawValue)}
              onCheckedChange={checked => handleUpdateAttribute(attribute.attribute_key, checked)}
              disabled={disabled || !canEdit}
            />
            <Label className="text-sm">{rawValue ? t('checkbox.yes') : t('checkbox.no')}</Label>
          </div>
        );

      default:
        return (
          <Textarea
            value={value}
            onChange={e => handleUpdateAttribute(attribute.attribute_key, e.target.value)}
            placeholder={t('placeholders.textarea', {
              name: attribute.attribute_display_name.toLowerCase(),
            })}
            rows={3}
            {...commonProps}
          />
        );
    }
  };

  const attributeEntries = Object.entries(attributes || {});
  const definedAttributeKeys = definedAttributes.map(attr => attr.attribute_key);
  const adHocAttributes = attributeEntries.filter(([key]) => !definedAttributeKeys.includes(key));
  const contextLevel = getCurrentContextLevel();

  return (
    <div className="space-y-4">
      {loading && (
        <div className="text-center py-4">
          <div className="text-sm text-muted-foreground">{t('loading')}</div>
        </div>
      )}

      {/* Defined Custom Attributes */}
      {definedAttributes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4" />
            <Label className="text-sm font-medium text-muted-foreground">
              {t('sections.defined')}
            </Label>
          </div>
          <div className="space-y-2">
            {definedAttributes.map(attribute => {
              const canEdit = canEditAttributeValue();
              const isShared = contextLevel !== 'item';
              const attributeOrigin = getAttributeOrigin(attribute);
              const isGlobalAttribute = !attribute.id.startsWith('placeholder-');
              const typeLabel = getAttributeTypeLabel(attribute.attribute_display_type);

              return (
                <div key={attribute.attribute_key} className="rounded-md border border-border/70 p-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-sm font-medium">
                          {attribute.attribute_display_name}
                        </Label>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${isGlobalAttribute
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}
                        >
                          {isGlobalAttribute ? i18n.t('interface:fallbacks.global') : i18n.t('interface:fallbacks.local')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {typeLabel}
                        </span>
                        {/* Show origin tag in item context */}
                        {contextLevel === 'item' && attributeOrigin && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            {attributeOrigin === 'pipeline' && t('fields.attributeScope.attributeOrigin.pipeline')}
                            {attributeOrigin === 'stage' && t('fields.attributeScope.attributeOrigin.stage')}
                            {attributeOrigin === 'item' && t('fields.attributeScope.attributeOrigin.item')}
                          </span>
                        )}
                        {isShared && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            {attribute.attribute_scope === 'stages'
                              ? t('fields.attributeScope.sharedMessage.labelStages')
                              : t('fields.attributeScope.sharedMessage.label')}
                          </span>
                        )}
                        {attribute.attribute_description && (
                          <span className="text-xs text-muted-foreground">
                            - {attribute.attribute_description}
                          </span>
                        )}
                      </div>
                      {isShared && !canEdit && (
                        <p className="text-xs text-muted-foreground italic">
                          {attribute.attribute_scope === 'stages'
                            ? t('fields.attributeScope.sharedMessage.descriptionStages')
                            : t('fields.attributeScope.sharedMessage.descriptionCards')}
                        </p>
                      )}
                      {/* Only render input field if it can be edited (not shared attributes in pipeline/stage) */}
                      {canEdit && renderFormField(attribute)}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad-hoc Custom Attributes */}
      {adHocAttributes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-4 w-4" />
            <Label className="text-sm font-medium text-muted-foreground">
              {t('sections.additional')}
            </Label>
          </div>
          <div className="space-y-2">
            {adHocAttributes.map(([key, value]) => {
              const localDefinition =
                value && typeof value === 'object' && '__local_definition' in (value as Record<string, unknown>)
                  ? (value as LocalAttributeDefinition)
                  : null;
              const displayName = localDefinition?.attribute_display_name || key;
              const localType = localDefinition?.attribute_display_type;
              const isObject = typeof value === 'object' && value !== null;
              const displayValue = valueToString(value);
              const canEdit = canEditAttributeValue();

              return (
                <div key={key} className="rounded-md border border-border/70 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm font-medium">{displayName}</Label>
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {tUi("interface:pipelinecustomattributesform.local")}</span>
                          {localType && (
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {getAttributeTypeLabel(localType)}
                            </span>
                          )}
                        </div>
                        {canEdit ? (
                          <>
                            {isObject ? (
                              <Textarea
                                value={displayValue}
                                onChange={e => {
                                  try {
                                    const parsed = JSON.parse(e.target.value);
                                    handleUpdateAttribute(key, parsed);
                                  } catch {
                                    // If invalid JSON, store as string
                                    handleUpdateAttribute(key, e.target.value);
                                  }
                                }}
                                placeholder={t('fields.attributeValue.placeholder')}
                                disabled={disabled}
                                rows={4}
                                className="font-mono text-xs"
                              />
                            ) : (
                              <Input
                                value={displayValue}
                                onChange={e => handleUpdateAttribute(key, e.target.value)}
                                placeholder={t('fields.attributeValue.placeholder')}
                                disabled={disabled}
                              />
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            {t(`fields.attributeScope.sharedMessage.${contextLevel}`)}
                          </p>
                        )}
                      </div>
                      {!disabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttribute(key)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add New Attribute */}
      {!disabled && (
        <div>
          {showAddForm ? (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label htmlFor="attribute-key">
                    {contextLevel === 'item'
                      ? t('fields.attributeKey.label')
                      : t('modal.fields.displayName.label')}
                  </Label>
                  <Input
                    id="attribute-key"
                    value={newAttributeKey}
                    onChange={e => setNewAttributeKey(e.target.value)}
                    placeholder={
                      contextLevel === 'item'
                        ? t('fields.attributeKey.placeholder')
                        : t('modal.fields.displayName.placeholder')
                    }
                  />
                </div>
                {(() => {
                  const contextLevel = getCurrentContextLevel();

                  // At item level, show value input
                  if (contextLevel === 'item') {
                    return (
                      <div className="space-y-2">
                        <Label htmlFor="attribute-value">{t('fields.attributeValue.label')} *</Label>
                        <Input
                          id="attribute-value"
                          value={newAttributeValue}
                          onChange={e => setNewAttributeValue(e.target.value)}
                          placeholder={t('fields.attributeValue.placeholder')}
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="attribute-type">{t('modal.fields.displayType.label')}</Label>
                        <Select
                          value={newAttributeType}
                          onValueChange={value => setNewAttributeType(value as AttributeDisplayType)}
                        >
                          <SelectTrigger id="attribute-type">
                            <SelectValue placeholder={t('modal.fields.displayType.label')} />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTRIBUTE_TYPE_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div>
                                  <div className="font-medium">{getTypeOptionLabel(option)}</div>
                                  <div className="text-xs text-muted-foreground">{getTypeOptionDescription(option)}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {newAttributeType === 'list' && (
                        <div className="space-y-2">
                          <Label htmlFor="attribute-list-values">{t('modal.fields.listValues.label')}</Label>
                          <Textarea
                            id="attribute-list-values"
                            value={newAttributeListValues}
                            onChange={e => setNewAttributeListValues(e.target.value)}
                            placeholder={t('modal.fields.listValues.placeholder')}
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddAttribute}
                    disabled={(() => {
                      if (!newAttributeKey.trim()) return true;
                      const contextLevel = getCurrentContextLevel();
                      return contextLevel === 'item' && !newAttributeValue.trim();
                    })()}
                  >
                    {t('actions.add')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetAddForm}
                  >
                    {t('actions.cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('actions.addAttribute')}
            </Button>
          )}
        </div>
      )}

      {/* Empty State */}
      {definedAttributes.length === 0 &&
        attributeEntries.length === 0 &&
        !showAddForm &&
        !loading && (
          <div className="text-center py-6 text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('empty.title')}</p>
            <p className="text-xs mt-1">
              {!disabled ? t('empty.description') : t('empty.descriptionReadOnly')}
            </p>
          </div>
        )}
    </div>
  );
}

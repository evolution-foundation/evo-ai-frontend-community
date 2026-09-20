import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
} from '@evoapi/design-system';
import { Plus, X, Settings, Pencil, Check, Loader2, AlertTriangle } from 'lucide-react';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import { CustomAttributeDefinition, AttributeModel } from '@/types/settings';
import EmptyState from '@/components/base/EmptyState';
import { toast } from 'sonner';

export type CustomAttributesMode = 'form' | 'editable';

/**
 * CRM-166: both modes report a failed definitions load with the same three strings
 * and the same retry. `compact` is the sidebar shape; the default is the full-width
 * EmptyState used inside the contact edit form.
 */
function LoadFailurePanel({ compact, onRetry }: { compact?: boolean; onRetry: () => void }) {
  const { t: tCommon } = useLanguage('common');
  const title = tCommon('customAttributes.loadFailed.title');
  const description = tCommon('customAttributes.loadFailed.description');
  const retryLabel = tCommon('customAttributes.loadFailed.retry');

  if (compact) {
    return (
      <div className="space-y-2 py-4 text-center" data-testid="custom-attributes-load-failed">
        <AlertTriangle className="mx-auto h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-6 px-2 text-xs"
        >
          {retryLabel}
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="custom-attributes-load-failed">
      <EmptyState
        icon={AlertTriangle}
        title={title}
        description={description}
        action={{ label: retryLabel, onClick: onRetry, variant: 'outline' }}
        className="py-8"
      />
    </div>
  );
}

export interface CustomAttributesFormProps {
  /** The attribute model type (e.g., 'pipeline_item_attribute', 'contact_attribute') */
  attributeModel: AttributeModel;
  /** Current attributes values */
  attributes: Record<string, unknown> | null | undefined;
  /** Mode of operation: 'form' for always-editable form fields, 'editable' for inline edit mode */
  mode?: CustomAttributesMode;
  /** Callback when attributes change (used in 'form' mode) */
  onAttributesChange?: (attributes: Record<string, unknown>) => void;
  /** Callback to update attributes (used in 'editable' mode, should return a Promise) */
  onUpdateAttributes?: (updatedAttributes: Record<string, unknown>) => Promise<void>;
  /** Optional callback when update succeeds (used in 'editable' mode) */
  onUpdateSuccess?: () => void;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Optional custom translation namespace (defaults to 'customAttributes' for form mode, 'chat' for editable mode) */
  translationNamespace?: string;
  /** Translation keys for messages (used in 'editable' mode) */
  translationKeys?: {
    updateSuccess?: string;
    updateError?: string;
    noAttributes?: string;
    yes?: string;
    no?: string;
  };
}

/**
 * Generic CustomAttributesForm component that can be used across different contexts.
 * Supports two modes:
 * - 'form': Always-editable form fields with Cards layout, allows adding ad-hoc attributes
 * - 'editable': Inline edit mode with view/edit states, saves immediately via API
 */
export default function CustomAttributesForm({
  attributeModel,
  attributes,
  mode = 'form',
  onAttributesChange,
  onUpdateAttributes,
  onUpdateSuccess,
  disabled = false,
  translationNamespace,
  translationKeys = {},
}: CustomAttributesFormProps) {
  const defaultTranslationNamespace = mode === 'editable' ? 'chat' : 'customAttributes';
  const { t } = useLanguage(translationNamespace || defaultTranslationNamespace);
  const [definedAttributes, setDefinedAttributes] = useState<CustomAttributeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [newAttributeKey, setNewAttributeKey] = useState('');
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Editable mode state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const normalizeDateTimeLocalValue = (value: string) => {
    if (!value) return '';
    const exactFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (exactFormat.test(value)) return value;
    const prefixMatch = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (prefixMatch) return prefixMatch[1];
    return value;
  };

  // CRM-166: the catch only toasted and left `definedAttributes` at [], so a failed
  // load was indistinguishable from an empty catalog. Nothing aborts the request, so
  // `cancelled` is what keeps a late response from writing state the component has
  // moved on from — unmount (collapsing the sidebar section mid-flight) above all.
  // Not StrictMode: main.tsx renders <App /> unwrapped, on purpose.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    customAttributesService
      .getCustomAttributes(attributeModel)
      .then(response => {
        if (cancelled) return;
        setDefinedAttributes(response.data);
        setLoadFailed(false);
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Error loading custom attributes:', error);
        setLoadFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attributeModel, reloadToken]);

  const retryLoadDefinedAttributes = () => {
    setReloadToken(token => token + 1);
  };

  // Form mode handlers
  const handleAddAttribute = () => {
    if (!onAttributesChange || !newAttributeKey.trim() || !newAttributeValue.trim()) return;
    
    onAttributesChange({
      ...(attributes || {}),
      [newAttributeKey.trim()]: newAttributeValue.trim(),
    });
    setNewAttributeKey('');
    setNewAttributeValue('');
    setShowAddForm(false);
  };

  const handleRemoveAttribute = (key: string) => {
    if (!onAttributesChange) return;
    
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
    if (!onAttributesChange) return;
    
    onAttributesChange({
      ...(attributes || {}),
      [key]: value,
    });
  };

  // Editable mode handlers
  const handleStartEdit = (key: string, currentValue: unknown) => {
    setEditingKey(key);
    const rawValue = currentValue ? String(currentValue) : '';
    const attributeDefinition = definedAttributes.find(attribute => attribute.attribute_key === key);
    const nextValue = attributeDefinition?.attribute_display_type === 'datetime'
      ? normalizeDateTimeLocalValue(rawValue)
      : rawValue;
    setEditValue(nextValue);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async () => {
    if (!onUpdateAttributes || !editingKey) return;

    setSaving(true);
    try {
      const updatedAttributes = {
        ...(attributes || {}),
        [editingKey]: editValue,
      };

      await onUpdateAttributes(updatedAttributes);

      const successKey = translationKeys.updateSuccess || 'contactSidebar.customAttributes.updateSuccess';
      toast.success(t(successKey));
      setEditingKey(null);
      setEditValue('');

      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch {
      const errorKey = translationKeys.updateError || 'contactSidebar.customAttributes.updateError';
      toast.error(t(errorKey));
    } finally {
      setSaving(false);
    }
  };

  const handleBooleanToggle = async (key: string, currentValue: boolean) => {
    if (!onUpdateAttributes) return;

    setSaving(true);
    try {
      const updatedAttributes = {
        ...(attributes || {}),
        [key]: !currentValue,
      };

      await onUpdateAttributes(updatedAttributes);

      const successKey = translationKeys.updateSuccess || 'contactSidebar.customAttributes.updateSuccess';
      toast.success(t(successKey));

      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch {
      const errorKey = translationKeys.updateError || 'contactSidebar.customAttributes.updateError';
      toast.error(t(errorKey));
    } finally {
      setSaving(false);
    }
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

  // Render field based on attribute type (form mode)
  const renderFormField = (attribute: CustomAttributeDefinition) => {
    const rawValue = attributes?.[attribute.attribute_key];
    const value = valueToString(rawValue);

    const commonProps = {
      disabled,
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
            disabled={disabled}
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
              disabled={disabled}
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

  // Render field for editable mode
  const renderEditableField = (attribute: CustomAttributeDefinition) => {
    const key = attribute.attribute_key;
    const rawValue = attributes?.[key];
    const value = rawValue ? String(rawValue) : '';
    const isEditing = editingKey === key;

    if (isEditing) {
      switch (attribute.attribute_display_type) {
        case 'text':
        case 'number':
        case 'link':
          return (
            <div className="flex items-center gap-2">
              <Input
                type={attribute.attribute_display_type === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="flex-1 h-8 text-xs"
                autoFocus
                disabled={saving}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={saving}
                className="h-8 w-8 p-0"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );

        case 'date':
        case 'datetime':
          return (
            <div className="flex items-center gap-2">
              <Input
                type={attribute.attribute_display_type === 'datetime' ? 'datetime-local' : 'date'}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onClick={event => {
                  (event.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                }}
                className="flex-1 h-8 text-xs [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                autoFocus
                disabled={saving}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={saving}
                className="h-8 w-8 p-0"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );

        case 'list':
          return (
            <div className="flex items-center gap-2">
              <Select value={editValue} onValueChange={setEditValue} disabled={saving}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {attribute.attribute_values?.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={saving}
                className="h-8 w-8 p-0"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );

        default:
          return (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="flex-1 h-8 text-xs"
                autoFocus
                disabled={saving}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={saving}
                className="h-8 w-8 p-0"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
      }
    }

    // Display mode
    if (attribute.attribute_display_type === 'checkbox') {
      const yesKey = translationKeys.yes || 'contactSidebar.customAttributes.yes';
      const noKey = translationKeys.no || 'contactSidebar.customAttributes.no';
      return (
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">
            {rawValue ? t(yesKey) : t(noKey)}
          </span>
          <Switch
            checked={Boolean(rawValue)}
            onCheckedChange={() => handleBooleanToggle(key, Boolean(rawValue))}
            disabled={saving}
            className="scale-75"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between group">
        <span className="text-xs text-foreground truncate flex-1">
          {value || <span className="text-muted-foreground">--</span>}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => handleStartEdit(key, rawValue)}
          disabled={saving}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  const attributeEntries = Object.entries(attributes || {});
  const definedAttributeKeys = definedAttributes.map(attr => attr.attribute_key);
  const adHocAttributes = attributeEntries.filter(([key]) => !definedAttributeKeys.includes(key));

  // Editable mode rendering
  if (mode === 'editable') {
    if (loading) {
      return (
        <div className="text-center py-4">
          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
        </div>
      );
    }

    if (loadFailed) {
      return <LoadFailurePanel compact onRetry={retryLoadDefinedAttributes} />;
    }

    if (definedAttributes.length === 0) {
      const noAttributesKey = translationKeys.noAttributes || 'contactSidebar.customAttributes.noAttributes';
      return (
        <div className="text-xs text-muted-foreground text-center py-4">
          {t(noAttributesKey)}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {definedAttributes.map(attribute => (
          <div key={attribute.attribute_key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {attribute.attribute_display_name}
            </Label>
            {renderEditableField(attribute)}
          </div>
        ))}
      </div>
    );
  }

  // Form mode rendering
  return (
    <div className="space-y-4">
      {loading && (
        <div className="text-center py-4">
          <div className="text-sm text-muted-foreground">{t('loading')}</div>
        </div>
      )}

      {loadFailed && !loading && (
        <LoadFailurePanel onRetry={retryLoadDefinedAttributes} />
      )}

      {/* Defined Custom Attributes */}
      {definedAttributes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4" />
            <Label className="text-sm font-medium text-muted-foreground">
              {t('sections.defined')}
            </Label>
          </div>
          <div className="space-y-3">
            {definedAttributes.map(attribute => (
              <Card key={attribute.attribute_key}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">
                        {attribute.attribute_display_name}
                      </Label>
                      {attribute.attribute_description && (
                        <span className="text-xs text-muted-foreground">
                          - {attribute.attribute_description}
                        </span>
                      )}
                    </div>
                    {renderFormField(attribute)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ad-hoc Custom Attributes */}
      {adHocAttributes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-4 w-4" />
            <Label className="text-sm font-medium text-muted-foreground">
              {t('sections.additional')}
            </Label>
          </div>
          <div className="space-y-3">
            {adHocAttributes.map(([key, value]) => {
              const isObject = typeof value === 'object' && value !== null;
              const displayValue = valueToString(value);

              return (
                <Card key={key}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-2">
                        <Label className="text-sm font-medium">{key}</Label>
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
                  </CardContent>
                </Card>
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
              <CardHeader>
                <CardTitle className="text-sm">{t('sections.newAttribute')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="attribute-key">{t('fields.attributeKey.label')}</Label>
                  <Input
                    id="attribute-key"
                    value={newAttributeKey}
                    onChange={e => setNewAttributeKey(e.target.value)}
                    placeholder={t('fields.attributeKey.placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attribute-value">{t('fields.attributeValue.label')}</Label>
                  <Input
                    id="attribute-value"
                    value={newAttributeValue}
                    onChange={e => setNewAttributeValue(e.target.value)}
                    placeholder={t('fields.attributeValue.placeholder')}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddAttribute}
                    disabled={!newAttributeKey.trim() || !newAttributeValue.trim()}
                  >
                    {t('actions.add')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAttributeKey('');
                      setNewAttributeValue('');
                    }}
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
        !loading &&
        !loadFailed && (
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

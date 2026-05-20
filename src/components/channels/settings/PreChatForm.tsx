import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Button,
  Switch,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { MessageSquare, Info, Settings, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import PreChatFields from './PreChatFields';
import {
  PreChatField,
  PreChatFormOptions,
  CustomAttribute,
  getPreChatFields,
  getDefaultPreChatFields,
  getFormattedPreChatFields,
} from './helpers/preChatHelpers';

interface PreChatFormProps {
  inboxId: string;
  preChatFormEnabled?: boolean;
  preChatFormOptions?: PreChatFormOptions;
  onUpdate?: (data: {
    pre_chat_form_enabled: boolean;
    pre_chat_form_options?: PreChatFormOptions;
  }) => Promise<void>;
}

// Mock custom attributes - replace with real API
const mockCustomAttributes: CustomAttribute[] = [
  {
    id: '1',
    attribute_key: 'company',
    attribute_display_name: 'Empresa',
    attribute_display_type: 'text',
    attribute_model: 'contact_attribute',
  },
  {
    id: '2',
    attribute_key: 'department',
    attribute_display_name: 'Departamento',
    attribute_display_type: 'select',
    attribute_values: ['Vendas', 'Suporte', 'Financeiro'],
    attribute_model: 'contact_attribute',
  },
];

export default function PreChatForm({
  preChatFormEnabled = false,
  preChatFormOptions,
  onUpdate,
}: PreChatFormProps) {
  const { t, currentLanguage } = useLanguage('channels');
  const [isFormEnabled, setIsFormEnabled] = useState(preChatFormEnabled);
  const [preChatMessage, setPreChatMessage] = useState('');
  const [preChatFields, setPreChatFields] = useState<PreChatField[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form data
  useEffect(() => {
    setIsFormEnabled(preChatFormEnabled);

    if (preChatFormOptions) {
      setPreChatMessage(preChatFormOptions.pre_chat_message || '');
      
      // Always format fields when loading from backend to ensure proper formatting
      const formattedFields = getFormattedPreChatFields({
        preChatFields: preChatFormOptions.pre_chat_fields || [],
        language: currentLanguage,
      });
      setPreChatFields(formattedFields);
    } else {
      // Get default configuration
      const defaultConfig = getPreChatFields({
        preChatFormOptions: {
          pre_chat_message: '',
          pre_chat_fields: getDefaultPreChatFields(currentLanguage),
        },
        customAttributes: mockCustomAttributes,
        language: currentLanguage,
      });

      setPreChatMessage(defaultConfig.pre_chat_message);
      setPreChatFields(defaultConfig.pre_chat_fields);
    }
  }, [preChatFormEnabled, preChatFormOptions, currentLanguage]);

  // Handle fields update
  const handleFieldsUpdate = useCallback((updatedFields: PreChatField[]) => {
    setPreChatFields(updatedFields);
  }, []);

  // Handle form submission
  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const formOptions: PreChatFormOptions = {
        pre_chat_message: preChatMessage,
        pre_chat_fields: preChatFields,
      };

      const updateData = {
        pre_chat_form_enabled: isFormEnabled,
        pre_chat_form_options: isFormEnabled ? formOptions : undefined,
      };

      if (onUpdate) {
        await onUpdate(updateData);
      }

      toast.success(t('settings.preChatForm.success'));
    } catch (error) {
      console.error('Error updating pre-chat form:', error);
      toast.error(t('settings.preChatForm.error'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Get enabled fields count
  const enabledFieldsCount = preChatFields.filter(field => field.enabled).length;
  const requiredFieldsCount = preChatFields.filter(field => field.enabled && field.required).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <MessageSquare className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{t('settings.preChatForm.title')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings.preChatForm.description')}
                </p>
              </div>
            </div>
            <Switch checked={isFormEnabled} onCheckedChange={setIsFormEnabled} />
          </div>

          {/* Form Configuration */}
          {isFormEnabled && (
            <div className="space-y-6 mt-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{preChatFields.length}</div>
                  <div className="text-sm text-muted-foreground">{t('settings.preChatForm.totalFields')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{enabledFieldsCount}</div>
                  <div className="text-sm text-muted-foreground">{t('settings.preChatForm.activeFields')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{requiredFieldsCount}</div>
                  <div className="text-sm text-muted-foreground">{t('settings.preChatForm.requiredFields')}</div>
                </div>
              </div>

              {/* Pre-Chat Message */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  {t('settings.preChatForm.welcomeMessage')}
                </label>
                <Textarea
                  value={preChatMessage}
                  onChange={e => setPreChatMessage(e.target.value)}
                  placeholder={t('settings.preChatForm.welcomeMessagePlaceholder')}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.preChatForm.welcomeMessageHelp')}
                </p>
              </div>

              {/* Preview Toggle */}
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-foreground">{t('settings.preChatForm.fieldConfiguration')}</h5>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? t('settings.preChatForm.hidePreview') : t('settings.preChatForm.showPreview')}
                </Button>
              </div>

              {/* Preview Mode */}
              {showPreview && (
                <div className="space-y-4 p-4 border border-border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Settings className="h-4 w-4" />
                    {t('settings.preChatForm.formPreview')}
                  </div>

                  {preChatMessage && (
                    <div className="p-3 bg-white dark:bg-card rounded border text-sm">
                      {preChatMessage}
                    </div>
                  )}

                  <div className="space-y-3">
                    {preChatFields
                      .filter(field => field.enabled)
                      .map(field => (
                        <div key={field.name} className="space-y-1">
                          <label className="text-sm font-medium text-foreground flex items-center gap-1">
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <Textarea
                              placeholder={field.placeholder || ''}
                              disabled
                              className="bg-white dark:bg-card"
                            />
                          ) : field.type === 'select' ? (
                            <Select disabled>
                              <SelectTrigger className="bg-white dark:bg-card">
                                <SelectValue placeholder={field.placeholder || ''} />
                              </SelectTrigger>
                            </Select>
                          ) : (
                            <input
                              type={field.type}
                              placeholder={field.placeholder || ''}
                              disabled
                              className="w-full px-3 py-2 border border-border rounded-md bg-white dark:bg-card text-sm"
                            />
                          )}
                        </div>
                      ))}
                  </div>

                  {enabledFieldsCount === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      {t('settings.preChatForm.noActiveFields')}
                    </div>
                  )}
                </div>
              )}

              {/* Fields Configuration */}
              <div className="space-y-4">
                <PreChatFields preChatFields={preChatFields} onUpdate={handleFieldsUpdate} />
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="w-5 h-5 text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h6 className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                    {t('settings.preChatForm.howItWorksTitle')}
                  </h6>
                  <div className="text-blue-600 dark:text-blue-400 space-y-1">
                    <p>• {t('settings.preChatForm.howItWorks.point1')}</p>
                    <p>• {t('settings.preChatForm.howItWorks.point2')}</p>
                    <p>• {t('settings.preChatForm.howItWorks.point3')}</p>
                    <p>• {t('settings.preChatForm.howItWorks.point4')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disabled State */}
          {!isFormEnabled && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h5 className="font-medium text-foreground mb-1">{t('settings.preChatForm.disabledTitle')}</h5>
              <p className="text-sm text-muted-foreground">
                {t('settings.preChatForm.disabledDescription')}
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={handleUpdate} disabled={isUpdating} className="min-w-32">
              {isUpdating ? t('settings.preChatForm.saving') : t('settings.preChatForm.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Switch } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import GlobalTemplateSelect from './GlobalTemplateSelect';

interface GreetingFormData {
  greeting_enabled: boolean;
  greeting_message: string;
  greeting_message_template_id?: string | null;
}

interface GreetingSettingsFormProps {
  formData: GreetingFormData;
  onFormChange: (updates: Partial<GreetingFormData>) => void;
}

export default function GreetingSettingsForm({
  formData,
  onFormChange,
}: GreetingSettingsFormProps) {
  const { t } = useLanguage('channels');
  const [useTemplate, setUseTemplate] = useState(!!formData.greeting_message_template_id);

  // Reflect a template id that arrives after the inbox data loads.
  useEffect(() => {
    if (formData.greeting_message_template_id) setUseTemplate(true);
  }, [formData.greeting_message_template_id]);

  const handleUseTemplateChange = (checked: boolean) => {
    setUseTemplate(checked);
    // Leaving template mode clears the reference so the free-text message wins.
    if (!checked) onFormChange({ greeting_message_template_id: null });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
          <svg className="w-5 h-5 text-green-700 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t('settings.greeting.title')}</h4>
          <p className="text-sm text-muted-foreground">
            {t('settings.greeting.description')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-foreground">
            {t('settings.greeting.enable.label')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('settings.greeting.enable.description')}
          </p>
        </div>
        <Switch
          checked={formData.greeting_enabled}
          onCheckedChange={(checked) => onFormChange({ greeting_enabled: checked })}
        />
      </div>

      {formData.greeting_enabled && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">
                {t('settings.greeting.useTemplate.label')}
              </label>
              <p className="text-xs text-muted-foreground">
                {t('settings.greeting.useTemplate.description')}
              </p>
            </div>
            <Switch checked={useTemplate} onCheckedChange={handleUseTemplateChange} />
          </div>

          {useTemplate ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('settings.greeting.template.label')}
              </label>
              <GlobalTemplateSelect
                value={formData.greeting_message_template_id}
                onChange={(id) => onFormChange({ greeting_message_template_id: id })}
                placeholder={t('settings.greeting.template.placeholder')}
                emptyText={t('settings.greeting.template.empty')}
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.greeting.template.help')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('settings.greeting.message.label')}
              </label>
              <textarea
                value={formData.greeting_message}
                onChange={(e) => onFormChange({ greeting_message: e.target.value })}
                placeholder={t('settings.greeting.message.placeholder')}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

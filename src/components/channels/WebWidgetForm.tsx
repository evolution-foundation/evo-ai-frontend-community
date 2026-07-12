import { Input } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

interface WebWidgetFormProps {
  form: Record<string, string | boolean>;
  onFormChange: (key: string, value: string | boolean) => void;
  onTextareaChange: (key: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  getStr: (key: string, fallback?: string) => string;
}

export default function WebWidgetForm({
  form,
  onFormChange,
  onTextareaChange,
  getStr
}: WebWidgetFormProps) {
  const { t } = useLanguage('webWidget');

  const renderLabeledInput = (
    label: string,
    valueKey: string,
    placeholder?: string,
    type?: string,
    required?: boolean,
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-sidebar-foreground/80">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        placeholder={placeholder}
        value={getStr(valueKey)}
        onChange={(e) => onFormChange(valueKey, e.target.value)}
        type={type}
        required={required}
        className="bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
      />
    </div>
  );

  const renderCheckbox = (label: string, valueKey: string) => (
    <label className="flex items-center gap-2 text-sm text-sidebar-foreground/80 select-none">
      <input
        type="checkbox"
        checked={!!form[valueKey]}
        onChange={(e) => onFormChange(valueKey, e.target.checked)}
        className="h-4 w-4 rounded border-sidebar-border bg-sidebar text-primary focus:ring-0"
      />
      <span>{label}</span>
    </label>
  );

    return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4" data-tour="web-widget-basic-info">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{t('basicInfo.title')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('basicInfo.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderLabeledInput(t('fields.websiteUrl'), 'website_url', t('fields.websiteUrlPlaceholder'), 'url', true)}
        </div>
      </div>

      {/* Widget Appearance */}
      <div className="space-y-4" data-tour="web-widget-appearance">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{t('appearance.title')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('appearance.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderLabeledInput(t('fields.widgetColor'), 'widget_color', '#009CE0', 'color')}
          {renderLabeledInput(t('fields.welcomeTitle'), 'welcome_title', t('fields.welcomeTitlePlaceholder'))}
        </div>
        <div>
          {renderLabeledInput(t('fields.welcomeTagline'), 'welcome_tagline', t('fields.welcomeTaglinePlaceholder'))}
          <p className="text-xs text-muted-foreground mt-1">
            {t('fields.welcomeTaglineHelp')}
          </p>
        </div>
      </div>

      {/* Greeting Configuration */}
      <div className="space-y-4" data-tour="web-widget-behavior">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{t('greeting.title')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('greeting.description')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {renderCheckbox(t('fields.greetingEnabled'), 'greeting_enabled')}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('greeting.autoDescription')}
          </p>

          {form.greeting_enabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('fields.greetingMessage')}
              </label>
              <textarea
                value={getStr('greeting_message')}
                onChange={onTextareaChange('greeting_message')}
                placeholder={t('fields.greetingMessagePlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 rounded-md bg-primary/10">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h5 className="text-sm font-semibold text-foreground">
            {t('summary.title')}
          </h5>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex justify-between">
            <span>{t('summary.name')}:</span>
            <span className="font-medium text-foreground">{getStr('name') || t('fields.channelNamePlaceholder')}</span>
          </p>
          <p className="flex justify-between">
            <span>{t('summary.url')}:</span>
            <span className="font-medium text-foreground">{getStr('website_url') || t('summary.notConfigured')}</span>
          </p>
          <p className="flex justify-between">
            <span>{t('summary.color')}:</span>
            <span className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded border border-border"
                style={{ backgroundColor: getStr('widget_color', '#009CE0') }}
              />
              <span className="font-medium text-foreground">{getStr('widget_color', '#009CE0')}</span>
            </span>
          </p>
          <p className="flex justify-between">
            <span>{t('summary.greeting')}:</span>
            <span className="font-medium text-foreground">
              {form.greeting_enabled ? t('summary.enabled') : t('summary.disabled')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

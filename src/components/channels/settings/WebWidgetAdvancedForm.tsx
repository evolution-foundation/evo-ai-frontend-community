import { Switch } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

interface WebWidgetFormData {
  reply_time?: string;
  locale?: string | null;
  enable_email_collect: boolean;
  allow_messages_after_resolved: boolean;
  continuity_via_email: boolean;
  selected_feature_flags?: string[];
}

interface WebWidgetAdvancedFormProps {
  formData: WebWidgetFormData;
  onFormChange: (updates: Partial<WebWidgetFormData>) => void;
  onFeatureFlagChange: (flag: string, checked: boolean) => void;
}

export default function WebWidgetAdvancedForm({
  formData,
  onFormChange,
  onFeatureFlagChange,
}: WebWidgetAdvancedFormProps) {
  const { t } = useLanguage('channels');
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="p-2 rounded-lg bg-primary/10">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t('settings.webWidgetAdvanced.title')}</h4>
          <p className="text-sm text-muted-foreground">
            {t('settings.webWidgetAdvanced.description')}
          </p>
        </div>
      </div>

      {/* Reply Time */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('settings.webWidgetAdvanced.replyTime.label')}
        </label>
        <select
          value={formData.reply_time || 'in_a_few_minutes'}
          onChange={(e) => onFormChange({ reply_time: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        >
          <option value="in_a_few_minutes">{t('settings.webWidgetAdvanced.replyTime.options.fewMinutes')}</option>
          <option value="in_a_few_hours">{t('settings.webWidgetAdvanced.replyTime.options.fewHours')}</option>
          <option value="in_a_day">{t('settings.webWidgetAdvanced.replyTime.options.day')}</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {t('settings.webWidgetAdvanced.replyTime.helpText')}
        </p>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('settings.webWidgetAdvanced.language.label', { defaultValue: 'Widget language' })}
        </label>
        <select
          value={formData.locale ?? ''}
          onChange={(e) => onFormChange({ locale: e.target.value.trim() ? e.target.value : null })}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        >
          <option value="">
            {t('settings.webWidgetAdvanced.language.options.accountDefault', {
              defaultValue: 'Use account default',
            })}
          </option>
          <option value="en">English</option>
          <option value="pt_BR">Português (Brasil)</option>
          <option value="pt">Português</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="it">Italiano</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {t('settings.webWidgetAdvanced.language.helpText', {
            defaultValue: 'Defines language for this embed only.',
          })}
        </p>
      </div>

      {/* Email Collection */}
      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
        <div>
          <label className="text-sm font-medium text-foreground">
            {t('settings.webWidgetAdvanced.emailCollection.label')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('settings.webWidgetAdvanced.emailCollection.description')}
          </p>
        </div>
        <Switch
          checked={formData.enable_email_collect}
          onCheckedChange={(checked) => onFormChange({ enable_email_collect: checked })}
        />
      </div>

      {/* Allow Messages After Resolved */}
      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
        <div>
          <label className="text-sm font-medium text-foreground">
            {t('settings.webWidgetAdvanced.allowMessagesAfterResolved.label')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('settings.webWidgetAdvanced.allowMessagesAfterResolved.description')}
          </p>
        </div>
        <Switch
          checked={formData.allow_messages_after_resolved}
          onCheckedChange={(checked) => onFormChange({ allow_messages_after_resolved: checked })}
        />
      </div>

      {/* Continuity via Email */}
      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
        <div>
          <label className="text-sm font-medium text-foreground">
            {t('settings.webWidgetAdvanced.continuityViaEmail.label')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('settings.webWidgetAdvanced.continuityViaEmail.description')}
          </p>
        </div>
        <Switch
          checked={formData.continuity_via_email}
          onCheckedChange={(checked) => onFormChange({ continuity_via_email: checked })}
        />
      </div>

      {/* Feature Flags */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="p-2 rounded-lg bg-primary/10">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
          </div>
          <div>
            <h5 className="font-medium text-foreground">{t('settings.webWidgetAdvanced.featureFlags.title')}</h5>
            <p className="text-sm text-muted-foreground">
              {t('settings.webWidgetAdvanced.featureFlags.description')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
            <input
              type="checkbox"
              id="attachments"
              checked={(formData.selected_feature_flags || []).includes('attachments')}
              onChange={(e) => onFeatureFlagChange('attachments', e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="attachments" className="text-sm text-foreground flex-1">
              <div className="font-medium">{t('settings.webWidgetAdvanced.featureFlags.attachments.title')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.webWidgetAdvanced.featureFlags.attachments.description')}</div>
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
            <input
              type="checkbox"
              id="emoji_picker"
              checked={(formData.selected_feature_flags || []).includes('emoji_picker')}
              onChange={(e) => onFeatureFlagChange('emoji_picker', e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="emoji_picker" className="text-sm text-foreground flex-1">
              <div className="font-medium">{t('settings.webWidgetAdvanced.featureFlags.emojiPicker.title')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.webWidgetAdvanced.featureFlags.emojiPicker.description')}</div>
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
            <input
              type="checkbox"
              id="end_conversation"
              checked={(formData.selected_feature_flags || []).includes('end_conversation')}
              onChange={(e) => onFeatureFlagChange('end_conversation', e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="end_conversation" className="text-sm text-foreground flex-1">
              <div className="font-medium">{t('settings.webWidgetAdvanced.featureFlags.endConversation.title')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.webWidgetAdvanced.featureFlags.endConversation.description')}</div>
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
            <input
              type="checkbox"
              id="use_inbox_avatar_for_bot"
              checked={(formData.selected_feature_flags || []).includes('use_inbox_avatar_for_bot')}
              onChange={(e) => onFeatureFlagChange('use_inbox_avatar_for_bot', e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="use_inbox_avatar_for_bot" className="text-sm text-foreground flex-1">
              <div className="font-medium">{t('settings.webWidgetAdvanced.featureFlags.botAvatar.title')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.webWidgetAdvanced.featureFlags.botAvatar.description')}</div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

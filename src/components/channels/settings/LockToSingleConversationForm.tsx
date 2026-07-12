import { Switch } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';

interface LockFormData {
  lock_to_single_conversation: boolean;
}

interface LockToSingleConversationFormProps {
  formData: LockFormData;
  onFormChange: (updates: Partial<LockFormData>) => void;
}

export default function LockToSingleConversationForm({
  formData,
  onFormChange,
}: LockToSingleConversationFormProps) {
  const { t } = useLanguage('channels');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="p-2 rounded-lg bg-primary/10">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t('settings.lockToSingleConversation.title')}</h4>
          <p className="text-sm text-muted-foreground">
            {t('settings.lockToSingleConversation.description')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
        <div>
          <label className="text-sm font-medium text-foreground">
            {t('settings.lockToSingleConversation.enable.label')}
          </label>
          <p className="text-xs text-muted-foreground">
            {t('settings.lockToSingleConversation.enable.description')}
          </p>
        </div>
        <Switch
          checked={formData.lock_to_single_conversation}
          onCheckedChange={(checked) => onFormChange({ lock_to_single_conversation: checked })}
        />
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
              {t('settings.lockToSingleConversation.info.title')}
            </h5>
            <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <p>• <strong>{t('settings.lockToSingleConversation.info.enabled.title')}:</strong> {t('settings.lockToSingleConversation.info.enabled.description')}</p>
              <p>• <strong>{t('settings.lockToSingleConversation.info.disabled.title')}:</strong> {t('settings.lockToSingleConversation.info.disabled.description')}</p>
              <p>• <strong>{t('settings.lockToSingleConversation.info.recommended.title')}:</strong> {t('settings.lockToSingleConversation.info.recommended.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

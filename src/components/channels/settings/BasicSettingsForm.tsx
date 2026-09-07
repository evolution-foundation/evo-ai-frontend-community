import { useTranslation as useUiTranslation } from 'react-i18next';
import { Input, Button } from '@evoapi/design-system';
import { Upload, Trash2, Globe, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import  { sanitizeInboxName } from '@/utils/sanitizeName';


interface FormData {
  name: string;
  display_name?: string;
  avatar_url?: string;
  webhook_url?: string;
  website_url?: string;
  welcome_title?: string;
  welcome_tagline?: string;
  widget_color?: string;
  greeting_enabled: boolean;
  greeting_message: string;
}

interface InboxHook {
  isAPIInbox: boolean;
  isAWebWidgetInbox: boolean;
  isAWhatsAppChannel: boolean;
  whatsAppAPIProviderName: string;
}

interface BasicSettingsFormProps {
  formData: FormData;
  inboxHook: InboxHook;
  onFormChange: (updates: Partial<FormData>) => void;
  onAvatarUpload: (file: File) => void;
  onAvatarDelete: () => void;
  // When false, the avatar upload/remove controls are not rendered (the user
  // lacks the write permission), instead of rendering inert controls.
  canManageAvatar?: boolean;
}

export default function BasicSettingsForm({
  formData,
  inboxHook,
  onFormChange,
  onAvatarUpload,
  onAvatarDelete,
  canManageAvatar = true,
}: BasicSettingsFormProps) {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('channels');
  
  const handleDisplayNameChange = (value: string) => {
    onFormChange({ 
      display_name: value,
      name: sanitizeInboxName(value)
    });
  };

  const handleCopyWebhook = () => {
    if (formData.webhook_url) {
      navigator.clipboard.writeText(formData.webhook_url);
      toast.success(t('settings.basicSettings.webhook.copied'));
    } else {
      toast.error(t('settings.basicSettings.webhook.noUrl'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">{t('settings.basicSettings.title')}</h3>

        {/* Avatar Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">{t('settings.basicSettings.avatar.label')}</label>
          <div className="flex items-center gap-4">
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt={tUi("interface:basicsettingsform.avatar")}
                className="w-16 h-16 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                <Globe className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            {canManageAvatar && (
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) onAvatarUpload(file);
                    }}
                  />
                  <Button variant="outline" size="sm" className="pointer-events-none">
                    <Upload className="h-4 w-4 mr-2" />
                    {t('settings.basicSettings.avatar.upload')}
                  </Button>
                </label>
                {formData.avatar_url && (
                  <Button variant="destructive" size="sm" onClick={onAvatarDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('settings.basicSettings.avatar.remove')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Inbox Name */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-foreground">
            {t('settings.basicSettings.displayName.label')}
            <span className="text-destructive ml-1">*</span>
          </label>
          <Input
            value={formData.display_name || ''}
            onChange={e => handleDisplayNameChange(e.target.value)}
            placeholder={t('settings.basicSettings.displayName.placeholder')}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('settings.basicSettings.displayName.helpText')}
          </p>
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-foreground">
            {inboxHook.isAWebWidgetInbox ? t('settings.basicSettings.name.websiteLabel') : t('settings.basicSettings.name.channelLabel')}
            <span className="text-destructive ml-1">*</span>
          </label>
          <Input
            value={formData.name}
            onChange={e => onFormChange({ name: e.target.value })}
            placeholder={inboxHook.isAWebWidgetInbox ? t('settings.basicSettings.name.websitePlaceholder') : t('settings.basicSettings.name.channelPlaceholder')}
            readOnly
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('settings.basicSettings.name.helpText')}
          </p>
        </div>

        {/* API Webhook URL */}
        {inboxHook.isAPIInbox && (
          <div className="space-y-2 mb-6">
            <label className="text-sm font-medium text-foreground">{t('settings.basicSettings.webhook.label')}</label>
            <div className="relative">
              <Input
                value={formData.webhook_url}
                onChange={e => onFormChange({ webhook_url: e.target.value })}
                placeholder={t('settings.basicSettings.webhook.placeholder')}
              />
              <button
                onClick={handleCopyWebhook}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Web Widget Basic Fields */}
        {inboxHook.isAWebWidgetInbox && (
          <>
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">{t('settings.basicSettings.websiteUrl.label')}</label>
              <Input
                value={formData.website_url}
                onChange={e => onFormChange({ website_url: e.target.value })}
                placeholder={t('settings.basicSettings.websiteUrl.placeholder')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('settings.basicSettings.welcomeTitle.label')}</label>
                <Input
                  value={formData.welcome_title}
                  onChange={e => onFormChange({ welcome_title: e.target.value })}
                  placeholder={t('settings.basicSettings.welcomeTitle.placeholder')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('settings.basicSettings.welcomeTagline.label')}
                </label>
                <Input
                  value={formData.welcome_tagline}
                  onChange={e => onFormChange({ welcome_tagline: e.target.value })}
                  placeholder={t('settings.basicSettings.welcomeTagline.placeholder')}
                />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">{t('settings.basicSettings.widgetColor.label')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.widget_color}
                  onChange={e => onFormChange({ widget_color: e.target.value })}
                  className="w-12 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={formData.widget_color}
                  onChange={e => onFormChange({ widget_color: e.target.value })}
                  placeholder="#009CE0"
                  className="flex-1"
                />
              </div>
            </div>
          </>
        )}

        {/* WhatsApp Provider */}
        {inboxHook.isAWhatsAppChannel && (
          <div className="space-y-2 mb-6">
            <label className="text-sm font-medium text-foreground">{t('settings.basicSettings.whatsappProvider.label')}</label>
            <Input value={inboxHook.whatsAppAPIProviderName} disabled className="bg-muted" />
          </div>
        )}
      </div>
    </div>
  );
}

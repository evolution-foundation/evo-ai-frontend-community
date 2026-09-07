import { useTranslation as useUiTranslation } from 'react-i18next';
import { toast } from 'sonner';

export interface FormData {
  [key: string]: string | boolean;
}

export const useChannelValidation = () => {
  const { t: tUi } = useUiTranslation();
  const getStr = (form: FormData, key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  const validateWebWidget = (form: FormData) => {
    if (!getStr(form, 'name').trim()) {
      toast.error(tUi("sms:validation.nameRequired"));
      return false;
    }
    if (!getStr(form, 'website_url').trim()) {
      toast.error(tUi("channels:settings.validation.websiteUrlRequired"));
      return false;
    }
    // Validate URL format
    try {
      new URL(getStr(form, 'website_url'));
    } catch {
      toast.error(tUi("channels:settings.validation.websiteUrlInvalid"));
      return false;
    }
    return true;
  };

  const validateTwilioWhatsapp = (form: FormData) => {
    if (!getStr(form, 'name').trim()) {
      toast.error(tUi("sms:validation.nameRequired"));
      return false;
    }
    if (!getStr(form, 'account_sid').trim()) {
      toast.error(tUi("sms:validation.accountSidRequired"));
      return false;
    }
    if (!getStr(form, 'auth_token').trim()) {
      toast.error(tUi("sms:validation.authTokenRequired"));
      return false;
    }
    if (form.use_api_key && !getStr(form, 'api_key_sid').trim()) {
      toast.error(tUi("channels:settings.validation.apiKeySidRequired"));
      return false;
    }
    if (form.use_messaging_service) {
      if (!getStr(form, 'messaging_service_sid').trim()) {
        toast.error(tUi("channels:settings.validation.messagingServiceSidRequired"));
        return false;
      }
    } else {
      if (!getStr(form, 'phone_number').trim()) {
        toast.error(tUi("channels:settings.validation.phoneRequired"));
        return false;
      }
      // Validate phone number format (E.164)
      const phonePattern = /^\+[1-9]\d{1,14}$/;
      if (!phonePattern.test(getStr(form, 'phone_number'))) {
        toast.error(tUi("channels:settings.validation.phoneInvalidFormat"));
        return false;
      }
    }
    return true;
  };

  const validateNotificame = (form: FormData) => {
    if (!getStr(form, 'name').trim()) {
      toast.error(tUi("sms:validation.nameRequired"));
      return false;
    }
    if (!getStr(form, 'phone_number').trim()) {
      toast.error(tUi("channels:settings.validation.phoneRequired"));
      return false;
    }
    if (!getStr(form, 'api_token').trim()) {
      toast.error(tUi("channels:settings.validation.apiTokenRequired"));
      return false;
    }
    if (!getStr(form, 'channel_id').trim()) {
      toast.error(tUi("channels:settings.validation.channelIdRequired"));
      return false;
    }
    // Validate phone number format (E.164)
    const phonePattern = /^\+[1-9]\d{1,14}$/;
    if (!phonePattern.test(getStr(form, 'phone_number'))) {
      toast.error(tUi("channels:settings.validation.phoneInvalidFormat"));
      return false;
    }
    return true;
  };

  const validateEvolution = (form: FormData, hasEvolutionConfig: boolean) => {
    if (!getStr(form, 'name').trim()) {
      toast.error(tUi("sms:validation.nameRequired"));
      return false;
    }
    if (!getStr(form, 'phone_number').trim()) {
      toast.error(tUi("channels:settings.validation.phoneRequired"));
      return false;
    }
    if (!hasEvolutionConfig) {
      if (!getStr(form, 'api_url').trim()) {
        toast.error(tUi("channels:settings.validation.apiUrlRequired"));
        return false;
      }
      if (!getStr(form, 'admin_token').trim()) {
        toast.error(tUi("channels:settings.validation.adminTokenRequired"));
        return false;
      }
    }
    // Validate phone number format (E.164)
    const phonePattern = /^\+[1-9]\d{1,14}$/;
    if (!phonePattern.test(getStr(form, 'phone_number'))) {
      toast.error(tUi("channels:settings.validation.phoneInvalidFormat"));
      return false;
    }
    return true;
  };

  const validateEvolutionGo = (form: FormData, hasEvolutionGoConfig: boolean) => {
    if (!getStr(form, 'name').trim()) {
      toast.error(tUi("sms:validation.nameRequired"));
      return false;
    }
    if (!getStr(form, 'phone_number').trim()) {
      toast.error(tUi("channels:settings.validation.phoneRequired"));
      return false;
    }
    if (!hasEvolutionGoConfig) {
      if (!getStr(form, 'api_url').trim()) {
        toast.error(tUi("channels:settings.validation.apiUrlRequired"));
        return false;
      }
      if (!getStr(form, 'admin_token').trim()) {
        toast.error(tUi("channels:settings.validation.adminTokenRequired"));
        return false;
      }
    }
    // Validate phone number format (E.164)
    const phonePattern = /^\+[1-9]\d{1,14}$/;
    if (!phonePattern.test(getStr(form, 'phone_number'))) {
      toast.error(tUi("channels:settings.validation.phoneInvalidFormat"));
      return false;
    }
    return true;
  };

  const validateZapi = (form: FormData) => {
    if (!getStr(form, 'name').trim()) {
      toast.error(tUi("sms:validation.nameRequired"));
      return false;
    }
    if (!getStr(form, 'phone_number').trim()) {
      toast.error(tUi("channels:settings.validation.phoneRequired"));
      return false;
    }
    if (!getStr(form, 'instance_id').trim()) {
      toast.error(tUi("interface:usechannelvalidation.instanceIdIsRequired"));
      return false;
    }
    if (!getStr(form, 'token').trim()) {
      toast.error(tUi("whatsapp:validation.tokenRequired"));
      return false;
    }
    if (!getStr(form, 'client_token').trim()) {
      toast.error(tUi("interface:usechannelvalidation.clientTokenIsRequired"));
      return false;
    }
    // Validate phone number format (E.164)
    const phonePattern = /^\+[1-9]\d{1,14}$/;
    if (!phonePattern.test(getStr(form, 'phone_number'))) {
      toast.error(tUi("channels:settings.validation.phoneInvalidFormat"));
      return false;
    }
    return true;
  };

  const validateByChannelAndProvider = (
    channelType: string,
    providerId: string | undefined,
    form: FormData,
    config?: {
      hasEvolutionConfig?: boolean;
      hasEvolutionGoConfig?: boolean;
    }
  ): boolean => {
    switch (channelType) {
      case 'web_widget':
        return validateWebWidget(form);

      case 'whatsapp':
        // Every other guard in this file toasts before returning false.
        if (!providerId) {
          toast.error(tUi("apiKeys:form.placeholders.provider"));
          return false;
        }

        switch (providerId) {
          case 'twilio':
            return validateTwilioWhatsapp(form);
          case 'notificame':
            return validateNotificame(form);
          case 'evolution':
            return validateEvolution(form, config?.hasEvolutionConfig ?? false);
          case 'evolution_go':
            return validateEvolutionGo(form, config?.hasEvolutionGoConfig ?? false);
          case 'zapi':
            return validateZapi(form);
          default:
            return true;
        }

      default:
        return true;
    }
  };

  return {
    validateWebWidget,
    validateTwilioWhatsapp,
    validateNotificame,
    validateEvolution,
    validateEvolutionGo,
    validateZapi,
    validateByChannelAndProvider,
    getStr,
  };
};

import { useLanguage } from '@/hooks/useLanguage';
import { CloudWhatsappForm } from './CloudWhatsappForm';
import { TwilioWhatsappForm } from './TwilioWhatsappForm';
import { NotificameForm } from './NotificameForm';
import { ZapiForm } from './ZapiForm';
import { EvolutionForm } from './EvolutionForm';
import { EvolutionGoForm } from './EvolutionGoForm';
import { FormData } from '@/hooks/channels/useChannelForm';
import { Provider as ProviderType } from '@/components/channels/ProviderGrid';

interface WhatsappFormsProps {
  selectedProvider: ProviderType;
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
  hasEvolutionConfig: boolean;
  hasEvolutionGoConfig: boolean;
  canFB: boolean;
  onWhatsappCloudSuccess?: (data: any) => void;
  onCancel?: () => void;
}

export const WhatsappForms = ({
  selectedProvider,
  form,
  onFormChange,
  hasEvolutionConfig,
  hasEvolutionGoConfig,
  canFB,
  onCancel,
}: WhatsappFormsProps) => {
  const { t } = useLanguage('whatsapp');
  switch (selectedProvider.id) {
    case 'whatsapp_cloud':
      return (
        <CloudWhatsappForm form={form} onFormChange={onFormChange} canFB={canFB} onCancel={onCancel} />
      );

    case 'twilio':
      return <TwilioWhatsappForm form={form} onFormChange={onFormChange} />;

    case 'notificame':
      return <NotificameForm form={form} onFormChange={onFormChange} />;

    case 'zapi':
      return <ZapiForm form={form} onFormChange={onFormChange} />;

    case 'evolution':
      return (
        <EvolutionForm
          form={form}
          onFormChange={onFormChange}
          hasEvolutionConfig={hasEvolutionConfig}
        />
      );

    case 'evolution_go':
      return (
        <EvolutionGoForm
          form={form}
          onFormChange={onFormChange}
          hasEvolutionGoConfig={hasEvolutionGoConfig}
        />
      );

    default:
      return (
        <div className="text-center py-8">
          <p className="text-sidebar-foreground/70">
            {t('errors.providerNotImplemented', { provider: selectedProvider.name })}
          </p>
        </div>
      );
  }
};

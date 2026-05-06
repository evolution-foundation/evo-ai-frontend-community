import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  WebWidgetForm,
  FacebookChannelForm,
  InstagramForm,
  EmailForm,
} from '@/components/channels';
import ProviderSelection from '@/components/channels/ProviderSelection';
import ChannelBreadcrumb, { BreadcrumbItem } from '@/components/channels/ChannelBreadcrumb';

// Import hooks
import { useChannelForm, useChannelSubmission, ChannelType } from '@/hooks/channels';
import { Provider as ProviderType } from '@/components/channels/ProviderGrid';

// Import components
import { ChannelGrid } from '@/components/channels/channel-grid';
import { FormContainer } from '@/components/channels/layout/FormContainer';
import { FormFooter } from '@/components/channels/shared/FormFooter';
import { WhatsappForms } from '@/components/channels/forms/whatsapp';
import { SmsForm } from '@/components/channels/forms/SmsForm';
import { TelegramForm } from '@/components/channels/forms/TelegramForm';
import { ApiForm } from '@/components/channels/forms/ApiForm';

// Import constants
import { getChannelTypes } from '@/constants/channelTypes';

// Import tours
import { NewChannelTour } from '@/tours/NewChannelTour';
import { ProviderSelectionTour } from '@/tours/ProviderSelectionTour';
import { WhatsappProviderTour } from '@/tours/WhatsappProviderTour';
import { TelegramChannelTour } from '@/tours/TelegramChannelTour';
import { ApiChannelTour } from '@/tours/ApiChannelTour';
import { WebWidgetChannelTour } from '@/tours/WebWidgetChannelTour';
import { WhatsappCloudChannelTour } from '@/tours/WhatsappCloudChannelTour';
import { SmsChannelTour } from '@/tours/SmsChannelTour';
import { InstagramChannelTour } from '@/tours/InstagramChannelTour';
import { FacebookChannelTour } from '@/tours/FacebookChannelTour';
import { EmailChannelTour } from '@/tours/EmailChannelTour';

export default function NewChannel() {
  const navigate = useNavigate();
  const { t } = useLanguage('channels');

  // Use hooks
  const {
    selectedChannel,
    selectedProvider,
    form,
    updateForm,
    handleChannelSelect,
    handleProviderSelect,
    setSelectedChannel,
    setSelectedProvider,
    goBack,
    hasEvolutionConfig,
    hasEvolutionGoConfig,
    canFB,
    canWpCloud,
    canIG,
    canEmailGoogle,
    canEmailMicrosoft,
    config,
  } = useChannelForm();

  const { isSubmitting, isTesting, testConnection, submitCreate, healthCheckPassed } =
    useChannelSubmission(form);

  // Generate channel types with dynamic config
  const channelTypes = useMemo(
    () =>
      getChannelTypes().map(channel => {
        if (channel.id === 'email') {
          return {
            ...channel,
            providers: channel.providers?.map(provider => ({
              ...provider,
              description:
                provider.id === 'google'
                  ? canEmailGoogle
                    ? t('newChannel.providers.gmail.description')
                    : t('newChannel.messages.googleOAuthNotConfigured')
                  : provider.id === 'microsoft'
                  ? canEmailMicrosoft
                    ? t('newChannel.providers.outlook.description')
                    : t('newChannel.messages.microsoftOAuthNotConfigured')
                  : provider.description,
            })),
          };
        }
        return channel;
      }),
    [canEmailGoogle, canEmailMicrosoft, t],
  );

  const handleGoBack = () => {
    if (!goBack()) {
      navigate('/channels');
    }
  };

  const handleChannelSelectWithValidation = (channel: ChannelType) => {
    // Check if Facebook configuration is available
    if (channel.type === 'facebook' && !canFB) {
      return toast.error(t('newChannel.messages.facebookConfigMissing'));
    }
    // Check if Instagram configuration is available
    if (channel.type === 'instagram' && !canIG) {
      return toast.error(t('newChannel.messages.instagramConfigMissing'));
    }
    handleChannelSelect(channel);
  };

  const handleProviderSelectWithValidation = (provider: ProviderType) => {
    if (selectedChannel?.type === 'whatsapp') {
      if (provider.id === 'whatsapp_cloud' && !canWpCloud) {
        return toast.error(t('newChannel.messages.whatsappCloudConfigMissing'));
      }
      // Evolution e Evolution Go: sempre permitidos. Quando o admin não tem
      // config global, o próprio formulário do canal coleta URL + token.
    }
    if (selectedChannel?.type === 'email') {
      if (provider.id === 'google' && !canEmailGoogle) {
        return toast.error(t('newChannel.channelGrid.notConfiguredTooltip'));
      }
      if (provider.id === 'microsoft' && !canEmailMicrosoft) {
        return toast.error(t('newChannel.channelGrid.notConfiguredTooltip'));
      }
    }
    handleProviderSelect(provider);
  };

  const handleTestConnection = async () => {
    if (!selectedChannel || !selectedProvider) return;

    await testConnection(selectedChannel, selectedProvider, form, {
      hasEvolutionConfig,
      hasEvolutionGoConfig,
    });
  };

  const handleSubmitCreate = async () => {
    if (!selectedChannel) return;

    await submitCreate(selectedChannel, selectedProvider, form, {
      hasEvolutionConfig,
      hasEvolutionGoConfig,
      ...config,
    });
  };

  // Generate breadcrumbs based on current state
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: t('newChannel.breadcrumb.channels'), onClick: () => navigate('/channels') },
    ];

    if (!selectedChannel) {
      breadcrumbs.push({ label: t('newChannel.breadcrumb.createChannel'), active: true });
    } else if (!selectedChannel.providers) {
      // Canais sem providers (website, telegram, api) - link clicável para voltar
      breadcrumbs.push(
        {
          label: t('newChannel.breadcrumb.createChannel'),
          onClick: () => setSelectedChannel(null),
        },
        { label: selectedChannel.name, active: true },
      );
    } else if (!selectedProvider && selectedChannel.providers) {
      // Canais com providers mas nenhum selecionado
      breadcrumbs.push(
        {
          label: t('newChannel.breadcrumb.createChannel'),
          onClick: () => setSelectedChannel(null),
        },
        { label: selectedChannel.name, active: true },
      );
    } else {
      // Canal e provider selecionados
      breadcrumbs.push(
        {
          label: t('newChannel.breadcrumb.createChannel'),
          onClick: () => setSelectedChannel(null),
        },
        { label: selectedChannel.name, onClick: () => setSelectedProvider(null) },
      );
      if (selectedProvider) {
        breadcrumbs.push({ label: selectedProvider.name, active: true });
      }
    }

    return breadcrumbs;
  };

  const pageContainer = 'mx-auto w-full max-w-6xl px-4 md:px-6';

  const renderForm = () => {
    if (!selectedChannel) return null;

    switch (selectedChannel.type) {
      case 'web_widget':
        return (
          <WebWidgetForm
            form={form}
            onFormChange={(key, value) => updateForm({ [key]: value })}
            onTextareaChange={key => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
              updateForm({ [key]: e.target.value })}
            getStr={(key, fallback = '') =>
              typeof form[key] === 'string' ? (form[key] as string) : fallback
            }
          />
        );

      case 'facebook':
        return (
          <FacebookChannelForm
            onSuccess={data => {
              const createdId = data?.id ?? data?.payload?.id;
              toast.success(t('newChannel.success.channelCreated'));
              navigate(`/channels/${createdId}/settings`);
            }}
            onCancel={handleGoBack}
          />
        );

      case 'instagram':
        return <InstagramForm onCancel={handleGoBack} />;

      case 'email':
        if (!selectedProvider) {
          return (
            <p className="text-sidebar-foreground/70">
              {t('newChannel.messages.selectEmailProvider')}
            </p>
          );
        }
        return (
          <EmailForm
            provider={selectedProvider.id as 'google' | 'microsoft' | 'other_provider'}
            onSuccess={channelId => {
              toast.success(t('newChannel.success.emailChannelCreated'));
              navigate(`/channels/${channelId}/settings`);
            }}
            onBack={handleGoBack}
          />
        );

      case 'telegram':
        return (
          <TelegramForm form={form} onFormChange={(key, value) => updateForm({ [key]: value })} />
        );

      case 'sms':
        if (!selectedProvider) {
          return (
            <p className="text-sidebar-foreground/70">
              {t('newChannel.messages.selectSmsProvider')}
            </p>
          );
        }
        return (
          <SmsForm
            selectedProvider={selectedProvider}
            form={form}
            onFormChange={(key, value) => updateForm({ [key]: value })}
          />
        );

      case 'whatsapp':
        if (!selectedProvider) {
          return (
            <p className="text-sidebar-foreground/70">{t('newChannel.messages.selectProvider')}</p>
          );
        }
        return (
          <WhatsappForms
            selectedProvider={selectedProvider}
            form={form}
            onFormChange={(key, value) => updateForm({ [key]: value })}
            hasEvolutionConfig={hasEvolutionConfig}
            hasEvolutionGoConfig={hasEvolutionGoConfig}
            // CloudWhatsappForm's FB Embedded Signup initializes the SDK with
            // wpAppId/wpApiVersion and logs in with wpWhatsappConfigId — so this
            // button is gated by WhatsApp config, not Facebook. Prop name kept
            // as canFB for backward compat inside the form components.
            canFB={canWpCloud}
            onWhatsappCloudSuccess={data => {
              const createdId = data?.id ?? data?.payload?.id;
              toast.success(t('newChannel.success.channelCreated'));
              navigate(`/channels/${createdId}/settings`);
            }}
            onCancel={handleGoBack}
          />
        );

      case 'api':
        return <ApiForm form={form} onFormChange={(key, value) => updateForm({ [key]: value })} />;

      default:
        return null;
    }
  };

  const renderChannelTour = () => {
    if (!selectedChannel) return null;
    switch (selectedChannel.type) {
      case 'telegram': return <TelegramChannelTour />;
      case 'api': return <ApiChannelTour />;
      case 'web_widget': return <WebWidgetChannelTour />;
      case 'whatsapp':
        if (!selectedProvider) return null;
        return selectedProvider.id === 'whatsapp_cloud'
          ? <WhatsappCloudChannelTour />
          : <WhatsappProviderTour providerId={selectedProvider.id} />;
      case 'sms': return <SmsChannelTour />;
      case 'instagram': return <InstagramChannelTour />;
      case 'facebook': return <FacebookChannelTour />;
      case 'email': return <EmailChannelTour />;
      default: return null;
    }
  };

  const shouldShowFooter = () => {
    return (
      selectedChannel?.type !== 'facebook' &&
      selectedChannel?.type !== 'instagram' &&
      selectedChannel?.type !== 'email'
    );
  };

  const shouldShowTestConnection = (): boolean => {
    return !!(
      selectedChannel?.type === 'whatsapp' &&
      selectedProvider &&
      ['twilio', 'notificame', 'evolution', 'evolution_go'].includes(selectedProvider.id)
    );
  };

  // Se não houver um canal selecionado, mostrar o grid de canais
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto pb-8">
        {!selectedChannel ? (
          <>
            <NewChannelTour />
            <div className={pageContainer}>
              <ChannelBreadcrumb items={getBreadcrumbs()} onBack={handleGoBack} />
            </div>
            <ChannelGrid
              channels={channelTypes}
              onChannelSelect={handleChannelSelectWithValidation}
              canFB={canFB}
              canIG={canIG}
            />
          </>

          // Se houver um canal selecionado, mas não houver um provider selecionado, mostrar o grid de providers
        ) : !selectedProvider && selectedChannel.providers ? (
          <>
            <ProviderSelectionTour channelType={selectedChannel.type} />
            <ProviderSelection
              channelName={selectedChannel?.name || ''}
              channelType={selectedChannel?.type || 'whatsapp'}
              providers={selectedChannel?.providers || []}
              isDisabled={providerId => {
                if (selectedChannel?.type === 'whatsapp') {
                  if (providerId === 'whatsapp_cloud') return !canWpCloud;
                }
                if (selectedChannel?.type === 'email') {
                  if (providerId === 'google') return !canEmailGoogle;
                  if (providerId === 'microsoft') return !canEmailMicrosoft;
                }
                return false;
              }}
              disabledTooltip={providerId => {
                const gated =
                  (selectedChannel?.type === 'whatsapp' &&
                    providerId === 'whatsapp_cloud' &&
                    !canWpCloud) ||
                  (selectedChannel?.type === 'email' &&
                    ((providerId === 'google' && !canEmailGoogle) ||
                      (providerId === 'microsoft' && !canEmailMicrosoft)));
                return gated ? t('newChannel.channelGrid.notConfiguredTooltip') : undefined;
              }}
              onProviderSelect={handleProviderSelectWithValidation}
              onBack={handleGoBack}
              onChannelListClick={() => navigate('/channels')}
            />
          </>

          // Se houver um canal selecionado e um provider selecionado, mostrar o formulário de configuração
        ) : (
          <>
            <div className={pageContainer} >
              <ChannelBreadcrumb items={getBreadcrumbs()} onBack={handleGoBack} />
            </div>
            <div className={pageContainer}>
              <div className="max-w-4xl mx-auto">
                <div className="mb-6 md:mb-8">
                  <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground mb-2">
                    {t('newChannel.configureTitle')}
                  </h1>
                  <p className="text-sidebar-foreground/70">{t('newChannel.description')}</p>
                </div>

                {renderChannelTour()}
                <FormContainer
                  selectedChannel={selectedChannel}
                  selectedProvider={selectedProvider}
                  footer={
                    shouldShowFooter() ? (
                      <FormFooter
                        onCancel={handleGoBack}
                        onSubmit={handleSubmitCreate}
                        onTest={shouldShowTestConnection() ? handleTestConnection : undefined}
                        isSubmitting={isSubmitting}
                        isTesting={isTesting}
                        showTestConnection={shouldShowTestConnection()}
                        healthCheckPassed={healthCheckPassed}
                        isDisabled={
                          (selectedChannel?.type === 'web_widget' &&
                            (!form.name || !form.website_url)) ||
                          (selectedProvider?.id === 'whatsapp_cloud' &&
                            (!form.name ||
                              !form.phone_number ||
                              !form.api_key ||
                              !form.phone_number_id ||
                              !form.business_account_id ||
                              !form.waba_id)) ||
                          // Desabilita salvar se for Evolution ou Evolution Go e o health check não passou
                          ((selectedProvider?.id === 'evolution' ||
                            selectedProvider?.id === 'evolution_go') &&
                            healthCheckPassed !== true)
                        }
                      />
                    ) : undefined
                  }
                >
                  {renderForm()}
                </FormContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

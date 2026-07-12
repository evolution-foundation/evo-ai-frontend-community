import { useEffect, useMemo } from 'react';
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

interface NewChannelProps {
  /**
   * When provided, the matching channel (by `id` in getChannelTypes) is
   * pre-selected on mount, skipping the channel grid. Used when NewChannel is
   * mounted from a screen that already picked the channel (e.g. the modal host).
   */
  initialChannelId?: string;
  /**
   * Optional callback invoked when the user would leave the flow (back/cancel at
   * the top, or the "Channels" breadcrumb). When provided, it is called instead
   * of navigating to /channels — letting a host (e.g. a modal) close itself.
   * Its presence also switches NewChannel into the compact "embedded" layout.
   */
  onExit?: () => void;
}

export default function NewChannel({ initialChannelId, onExit }: NewChannelProps = {}) {
  const navigate = useNavigate();
  const { t } = useLanguage('channels');

  // Embedded mode: mounted inside a host (e.g. the modal). Drops the full-page
  // chrome (max-w-6xl container, page header) so the flow fits a compact modal.
  const embedded = !!onExit;

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

  // Pre-selects the channel when mounted with initialChannelId (skips the grid).
  // Runs once, only while no channel is selected yet. Uses handleChannelSelect
  // directly (not the canFB/canIG-validated variant): the channel was already
  // picked by the host, and Meta channel config gating is applied later (at the
  // provider/form), not here — otherwise a still-loading (async) config would
  // bounce the user back to the whole channel grid.
  useEffect(() => {
    if (!initialChannelId || selectedChannel) return;
    const channel = channelTypes.find(c => c.id === initialChannelId);
    if (channel) {
      handleChannelSelect(channel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChannelId, channelTypes]);

  // Leaves the flow back to the channel list. When a host provides onExit
  // (e.g. the modal), close it; otherwise navigate to /channels (CRM standalone).
  const exitToChannels = () => {
    if (onExit) {
      onExit();
    } else {
      navigate('/channels');
    }
  };

  const handleGoBack = () => {
    // goBack() steps back one level (provider -> channel). When there is nowhere
    // left to go back to, leave the flow.
    if (!goBack()) {
      exitToChannels();
    }
  };

  // After a channel is created. In CRM standalone, navigate to the new inbox
  // settings. Embedded (onExit provided), navigate would not resolve inside the
  // MemoryRouter without <Routes>, so we just close the host (the channel was
  // already created); the host screen can reopen the settings if it wants to.
  const handleCreated = (createdId?: string) => {
    if (onExit) {
      onExit();
    } else if (createdId) {
      navigate(`/channels/${createdId}/settings`);
    } else {
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
    // Defense in depth: Twilio is "coming soon" and rendered disabled in the
    // picker; ignore any select that slips through (WhatsApp and SMS).
    if (provider.id === 'twilio') return;
    if (selectedChannel?.type === 'whatsapp') {
      if (provider.id === 'whatsapp_cloud' && !canWpCloud) {
        return toast.error(t('newChannel.messages.whatsappCloudConfigMissing'));
      }
      // Evolution and Evolution Go: always allowed. When the admin has no global
      // config, the channel form itself collects the URL + token.
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

    await submitCreate(
      selectedChannel,
      selectedProvider,
      form,
      {
        hasEvolutionConfig,
        hasEvolutionGoConfig,
        ...config,
      },
      handleCreated,
    );
  };

  // Generate breadcrumbs based on current state
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: t('newChannel.breadcrumb.channels'), onClick: exitToChannels },
    ];

    if (!selectedChannel) {
      breadcrumbs.push({ label: t('newChannel.breadcrumb.createChannel'), active: true });
    } else if (!selectedChannel.providers) {
      // Channels without providers (website, telegram, api) - clickable link back
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
      // Channel and provider selected
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

  const pageContainer = embedded ? 'px-4 md:px-6' : 'mx-auto w-full max-w-6xl px-4 md:px-6';

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
              handleCreated(createdId);
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
              handleCreated(channelId);
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
              handleCreated(createdId);
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

  // Channels whose config screen uses the standardized Display Name + auto
  // Channel Name header hoisted into FormContainer. Meta/Email flows own their
  // own identity fields (page name, email address) so they opt out.
  const showNameFields =
    selectedChannel?.type === 'web_widget' ||
    selectedChannel?.type === 'whatsapp' ||
    selectedChannel?.type === 'sms' ||
    selectedChannel?.type === 'telegram' ||
    selectedChannel?.type === 'api';

  // The generic footer (Cancel + "Create Channel" + ConnectionTest) drives the
  // shared submitCreate path. Facebook / Instagram / Email own their submit
  // (OAuth redirect / page pick) and render their own action in the same footer
  // band; likewise Evo Hub for WhatsApp Cloud (HubConnectButton). Those opt out.
  const shouldShowFooter = () => {
    const hubOwnsWhatsappCloud =
      selectedChannel?.type === 'whatsapp' &&
      selectedProvider?.id === 'whatsapp_cloud' &&
      config?.evolutionHubEnabled === true;

    return (
      selectedChannel?.type !== 'facebook' &&
      selectedChannel?.type !== 'instagram' &&
      selectedChannel?.type !== 'email' &&
      !hubOwnsWhatsappCloud
    );
  };

  const shouldShowTestConnection = (): boolean => {
    return !!(
      selectedChannel?.type === 'whatsapp' &&
      selectedProvider &&
      ['twilio', 'notificame', 'evolution', 'evolution_go'].includes(selectedProvider.id)
    );
  };

  // No channel selected yet: show the channel grid
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

          // Channel selected but no provider yet: show the provider grid
        ) : !selectedProvider && selectedChannel.providers ? (
          <>
            <ProviderSelectionTour channelType={selectedChannel.type} />
            <ProviderSelection
              channelName={selectedChannel?.name || ''}
              channelType={selectedChannel?.type || 'whatsapp'}
              providers={selectedChannel?.providers || []}
              isDisabled={providerId => {
                // Twilio is not wired yet (WhatsApp and SMS) — "coming soon".
                if (providerId === 'twilio') return true;
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
                if (providerId === 'twilio') {
                  return t('newChannel.providers.twilio.comingSoon');
                }
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
              onChannelListClick={exitToChannels}
            />
          </>

          // Channel and provider selected: show the standardized config screen
        ) : (
          <>
            <div className={pageContainer} >
              <ChannelBreadcrumb items={getBreadcrumbs()} onBack={handleGoBack} />
            </div>
            <div className={pageContainer}>
              <div className={embedded ? '' : 'max-w-4xl mx-auto'}>
                {!embedded && (
                  <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground mb-2">
                      {t('newChannel.configureTitle')}
                    </h1>
                    <p className="text-sidebar-foreground/70">{t('newChannel.description')}</p>
                  </div>
                )}

                {renderChannelTour()}
                <FormContainer
                  selectedChannel={selectedChannel}
                  selectedProvider={selectedProvider}
                  showNameFields={showNameFields}
                  form={form}
                  onFormChange={(key, value) => updateForm({ [key]: value })}
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
                          // Disable save for Evolution / Evolution Go until the health check passes
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

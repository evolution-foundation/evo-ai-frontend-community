import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@evoapi/design-system';
import {
  ArrowLeft,
  Save,
  Globe,
  Settings,
  Users,
  Clock,
  Star,
  MessageSquare,
  Bot,
  Shield,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import InboxesService from '@/services/channels/inboxesService';
import { Inbox } from '@/types/channels/inbox';
import {
  BasicSettingsForm,
  GreetingSettingsForm,
  WebWidgetAdvancedForm,
  SenderSettingsForm,
  AuthorizationBanners,
  LockToSingleConversationForm,
  DefaultConversationStatusForm,
  CollaboratorsForm,
  BusinessHoursForm,
  CSATForm,
  PreChatForm,
  WidgetBuilderForm,
  AgentBotConfigurationForm,
  ConfigurationForm,
  MessageTemplateForm,
  ModerationDashboard,
} from '@/components/channels';

// Constants for inbox types (matching the Vue app)
const INBOX_TYPES = {
  WEB: 'Channel::WebWidget',
  FB: 'Channel::FacebookPage',
  TWITTER: 'Channel::TwitterProfile',
  TWILIO: 'Channel::TwilioSms',
  WHATSAPP: 'Channel::Whatsapp',
  API: 'Channel::Api',
  EMAIL: 'Channel::Email',
  TELEGRAM: 'Channel::Telegram',
  LINE: 'Channel::Line',
  SMS: 'Channel::Sms',
  INSTAGRAM: 'Channel::Instagram',
};

// Provider constants
const WHATSAPP_PROVIDERS = {
  WHATSAPP_CLOUD: 'whatsapp_cloud',
  BAILEYS: 'baileys',
  EVOLUTION: 'evolution',
  EVOLUTION_GO: 'evolution_go',
  ZAPI: 'zapi',
  DEFAULT: 'default',
};

interface ChannelSettingsData {
  // Basic settings
  name: string;
  display_name: string;
  avatar_url?: string;
  webhook_url?: string;

  // Web widget specific
  website_url?: string;
  welcome_title?: string;
  welcome_tagline?: string;
  widget_color?: string;
  selected_feature_flags?: string[];
  reply_time?: string;
  locale?: string | null;

  // Communication settings
  greeting_enabled: boolean;
  greeting_message: string;
  greeting_message_template_id?: string | null;
  enable_email_collect: boolean;
  allow_messages_after_resolved: boolean;
  continuity_via_email: boolean;
  lock_to_single_conversation: boolean;
  default_conversation_status?: string | null;

  // Sender settings
  sender_name_type: string;
  business_name?: string;

  // Help center
  portal_id?: string;
}

interface InboxHook {
  inbox: Inbox | null;
  isAPIInbox: boolean;
  isATwitterInbox: boolean;
  isAFacebookInbox: boolean;
  isAWebWidgetInbox: boolean;
  isATwilioChannel: boolean;
  isALineChannel: boolean;
  isAnEmailChannel: boolean;
  isATelegramChannel: boolean;
  isAMicrosoftInbox: boolean;
  isAGoogleInbox: boolean;
  isATwilioSMSChannel: boolean;
  isASmsInbox: boolean;
  isATwilioWhatsAppChannel: boolean;
  isAWhatsAppCloudChannel: boolean;
  is360DialogWhatsAppChannel: boolean;
  isAWhatsAppBaileysChannel: boolean;
  isAWhatsAppEvolutionChannel: boolean;
  isAWhatsAppEvolutionGoChannel: boolean;
  isAWhatsAppZapiChannel: boolean;
  isAWhatsAppChannel: boolean;
  isAnInstagramChannel: boolean;
  whatsAppAPIProviderName: string;
  canLocktoSingleConversation: boolean;
  supportsTemplates: boolean;
  textAreaChannels: boolean;
  facebookUnauthorized: boolean;
  googleUnauthorized: boolean;
  microsoftUnauthorized: boolean;
  instagramUnauthorized: boolean;
}

function useInbox(inbox: Inbox | null): InboxHook {
  return useMemo(() => {
    if (!inbox) {
      return {
        inbox: null,
        isAPIInbox: false,
        isATwitterInbox: false,
        isAFacebookInbox: false,
        isAWebWidgetInbox: false,
        isATwilioChannel: false,
        isALineChannel: false,
        isAnEmailChannel: false,
        isATelegramChannel: false,
        isAMicrosoftInbox: false,
        isAGoogleInbox: false,
        isATwilioSMSChannel: false,
        isASmsInbox: false,
        isATwilioWhatsAppChannel: false,
        isAWhatsAppCloudChannel: false,
        is360DialogWhatsAppChannel: false,
        isAWhatsAppBaileysChannel: false,
        isAWhatsAppEvolutionChannel: false,
        isAWhatsAppEvolutionGoChannel: false,
        isAWhatsAppZapiChannel: false,
        isAWhatsAppChannel: false,
        isAnInstagramChannel: false,
        whatsAppAPIProviderName: '',
        canLocktoSingleConversation: false,
        supportsTemplates: false,
        textAreaChannels: false,
        facebookUnauthorized: false,
        googleUnauthorized: false,
        microsoftUnauthorized: false,
        instagramUnauthorized: false,
      };
    }

    const channelType = inbox.channel_type;
    const provider = inbox.provider || '';
    const medium = inbox.medium || '';

    const isAPIInbox = channelType === INBOX_TYPES.API;
    const isATwitterInbox = channelType === INBOX_TYPES.TWITTER;
    const isAFacebookInbox = channelType === INBOX_TYPES.FB;
    const isAWebWidgetInbox = channelType === INBOX_TYPES.WEB;
    const isATwilioChannel = channelType === INBOX_TYPES.TWILIO;
    const isALineChannel = channelType === INBOX_TYPES.LINE;
    const isAnEmailChannel = channelType === INBOX_TYPES.EMAIL;
    const isATelegramChannel = channelType === INBOX_TYPES.TELEGRAM;
    const isATwilioSMSChannel = isATwilioChannel && medium === 'sms';
    const isASmsInbox = channelType === INBOX_TYPES.SMS || isATwilioSMSChannel;
    const isATwilioWhatsAppChannel = isATwilioChannel && medium === 'whatsapp';
    const isAWhatsAppCloudChannel =
      channelType === INBOX_TYPES.WHATSAPP && provider === WHATSAPP_PROVIDERS.WHATSAPP_CLOUD;
    const is360DialogWhatsAppChannel =
      channelType === INBOX_TYPES.WHATSAPP && provider === WHATSAPP_PROVIDERS.DEFAULT;
    const isAWhatsAppBaileysChannel =
      channelType === INBOX_TYPES.WHATSAPP && provider === WHATSAPP_PROVIDERS.BAILEYS;
    const isAWhatsAppEvolutionChannel =
      channelType === INBOX_TYPES.WHATSAPP && provider === WHATSAPP_PROVIDERS.EVOLUTION;
    const isAWhatsAppEvolutionGoChannel =
      channelType === INBOX_TYPES.WHATSAPP && provider === WHATSAPP_PROVIDERS.EVOLUTION_GO;
    const isAWhatsAppZapiChannel =
      channelType === INBOX_TYPES.WHATSAPP && provider === WHATSAPP_PROVIDERS.ZAPI;
    const isAWhatsAppChannel = channelType === INBOX_TYPES.WHATSAPP || isATwilioWhatsAppChannel;
    const isAnInstagramChannel = channelType === INBOX_TYPES.INSTAGRAM;
    const isAMicrosoftInbox = isAnEmailChannel && provider === 'microsoft';
    const isAGoogleInbox = isAnEmailChannel && provider === 'google';

    // Provider name for display
    let whatsAppAPIProviderName = '';
    if (isAWhatsAppCloudChannel) whatsAppAPIProviderName = 'WhatsApp Cloud';
    else if (is360DialogWhatsAppChannel) whatsAppAPIProviderName = '360Dialog';
    else if (isATwilioWhatsAppChannel) whatsAppAPIProviderName = 'Twilio';
    else if (isAWhatsAppBaileysChannel) whatsAppAPIProviderName = 'Baileys';
    else if (isAWhatsAppEvolutionChannel) whatsAppAPIProviderName = 'Evolution';
    else if (isAWhatsAppEvolutionGoChannel) whatsAppAPIProviderName = 'Evolution Go';
    else if (isAWhatsAppZapiChannel) whatsAppAPIProviderName = 'Z-API';

    // Can lock to single conversation
    const canLocktoSingleConversation =
      isASmsInbox || isAWhatsAppChannel || isAFacebookInbox || isAPIInbox;

    // Templates support - channels that support message templates
    const supportsTemplates =
      isAWhatsAppChannel ||
      isAFacebookInbox ||
      isAnInstagramChannel ||
      isATelegramChannel ||
      isALineChannel ||
      isATwilioSMSChannel;

    // Text area channels (for greeting message)
    const textAreaChannels = isATwilioChannel || isATwitterInbox || isAFacebookInbox;

    // Unauthorized states
    const facebookUnauthorized = isAFacebookInbox && (inbox.reauthorization_required || false);
    const instagramUnauthorized = isAnInstagramChannel && (inbox.reauthorization_required || false);
    const microsoftUnauthorized = isAMicrosoftInbox && (inbox.reauthorization_required || false);
    const isLegacyInbox = ['imap.gmail.com', 'imap.google.com'].includes(inbox.imap_address || '');
    const googleUnauthorized =
      (isAGoogleInbox || isLegacyInbox) && (inbox.reauthorization_required || false);

    return {
      inbox,
      isAPIInbox,
      isATwitterInbox,
      isAFacebookInbox,
      isAWebWidgetInbox,
      isATwilioChannel,
      isALineChannel,
      isAnEmailChannel,
      isATelegramChannel,
      isAMicrosoftInbox,
      isAGoogleInbox,
      isATwilioSMSChannel,
      isASmsInbox,
      isATwilioWhatsAppChannel,
      isAWhatsAppCloudChannel,
      is360DialogWhatsAppChannel,
      isAWhatsAppBaileysChannel,
      isAWhatsAppEvolutionChannel,
      isAWhatsAppEvolutionGoChannel,
      isAWhatsAppZapiChannel,
      isAWhatsAppChannel,
      isAnInstagramChannel,
      whatsAppAPIProviderName,
      canLocktoSingleConversation,
      supportsTemplates,
      textAreaChannels,
      facebookUnauthorized,
      googleUnauthorized,
      microsoftUnauthorized,
      instagramUnauthorized,
    };
  }, [inbox]);
}

export default function ChannelSettings() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useLanguage('channels');
  const inboxId = id || '';

  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox_settings');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [emailSignature, setEmailSignature] = useState('');
  const [isSavingSignature, setIsSavingSignature] = useState(false);

  const inboxHook = useInbox(inbox);

  const [formData, setFormData] = useState<ChannelSettingsData>({
    name: '',
    display_name: '',
    greeting_enabled: false,
    greeting_message: '',
    greeting_message_template_id: null,
    enable_email_collect: false,
    allow_messages_after_resolved: true,
    continuity_via_email: true,
    lock_to_single_conversation: false,
    sender_name_type: 'friendly',
    business_name: '',
    website_url: '',
    welcome_title: '',
    welcome_tagline: '',
    widget_color: '#009CE0',
    selected_feature_flags: [],
    reply_time: 'in_a_few_minutes',
    locale: null,
    webhook_url: '',
  });

  // Tab configuration based on inbox type
  const tabs = useMemo(() => {
    const baseTabs = [
      { key: 'inbox_settings', name: t('settings.tabs.inbox_settings'), icon: Settings },
      { key: 'collaborators', name: t('settings.tabs.collaborators'), icon: Users },
      { key: 'businesshours', name: t('settings.tabs.businesshours'), icon: Clock },
      { key: 'csat', name: t('settings.tabs.csat'), icon: Star },
      { key: 'messageTemplates', name: t('settings.tabs.messageTemplates'), icon: MessageSquare },
    ];

    // Web Widget specific tabs
    if (inboxHook.isAWebWidgetInbox) {
      baseTabs.push(
        { key: 'preChatForm', name: t('settings.tabs.preChatForm'), icon: MessageSquare },
        { key: 'widgetBuilder', name: t('settings.tabs.widgetBuilder'), icon: Globe },
      );
    }

    // Configuration tab (for specific channel types)
    if (
      inboxHook.isATwilioChannel ||
      inboxHook.isALineChannel ||
      inboxHook.isAPIInbox ||
      (inboxHook.isAnEmailChannel && !inbox?.provider) ||
      inboxHook.isAWhatsAppChannel ||
      inboxHook.isAWebWidgetInbox
    ) {
      baseTabs.push({
        key: 'configuration',
        name: t('settings.tabs.configuration'),
        icon: Settings,
      });
    }

    // Agent bots tab (available for most channel types)
    baseTabs.push({
      key: 'botConfiguration',
      name: t('settings.tabs.botConfiguration'),
      icon: Bot,
    });

    // Moderation tab (available for all channel types)
    baseTabs.push({
      key: 'moderation',
      name: t('settings.tabs.moderation'),
      icon: Shield,
    });

    return baseTabs;
  }, [inboxHook, inbox?.provider, t]);

  // Inbox name with channel info
  const inboxName = useMemo(() => {
    if (!inbox) return '';
    const instanceIdentifier =
      inbox.provider_config?.instance_name ||
      inbox.provider_config?.instanceName ||
      inbox.provider_config?.instance ||
      inbox.name;

    if (inboxHook.isATwilioSMSChannel || inboxHook.isATwilioWhatsAppChannel) {
      return `${inbox.name} (${inbox.messaging_service_sid || inbox.phone_number})`;
    }
    if (inboxHook.isAWhatsAppChannel) {
      return `${inbox.name} (${inbox.phone_number || instanceIdentifier || '-'})`;
    }
    if (inboxHook.isAnEmailChannel) {
      return `${inbox.name} (${inbox.email})`;
    }
    return inbox.name;
  }, [inbox, inboxHook]);

  const loadChannelData = useCallback(async () => {
    if (!inboxId) return;

    setIsLoading(true);
    try {
      const response = await InboxesService.getById(inboxId);
      const data = response.data;
      if (!data) {
        throw new Error('Inbox data not found');
      }
      setInbox(data);
      setEmailSignature((data as any).email_signature || '');

      // Initialize form data from inbox (handle null values properly)
      setFormData({
        name: data.name || '',
        display_name: data.display_name || '',
        avatar_url: data.avatar_url || undefined,
        webhook_url: data.webhook_url || '',
        website_url: data.website_url || '',
        welcome_title: data.welcome_title || '',
        welcome_tagline: data.welcome_tagline || '',
        widget_color: data.widget_color || '#009CE0',
        selected_feature_flags: Array.isArray(data.selected_feature_flags)
          ? data.selected_feature_flags
          : [],
        reply_time: data.reply_time || 'in_a_few_minutes',
        locale: data.locale || null,
        greeting_enabled: data.greeting_enabled === true,
        greeting_message: data.greeting_message || '',
        greeting_message_template_id: data.greeting_message_template_id || null,
        enable_email_collect: data.enable_email_collect === true,
        allow_messages_after_resolved: data.allow_messages_after_resolved !== false,
        continuity_via_email: data.continuity_via_email !== false,
        lock_to_single_conversation: data.lock_to_single_conversation === true,
        default_conversation_status: data.default_conversation_status || null,
        sender_name_type: data.sender_name_type || 'friendly',
        business_name: data.business_name || '',
        portal_id: data.help_center?.id,
      });
    } catch (error) {
      console.error('Error loading channel data:', error);
      toast.error(t('settings.errors.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [inboxId, t]);

  useEffect(() => {
    loadChannelData();
  }, [loadChannelData]);

  const handleSave = async () => {
    if (activeTab !== 'inbox_settings') {
      toast.info(t('settings.errors.useTabUpdate'));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: inboxId,
        name: formData.name,
        display_name: formData.display_name,
        enable_email_collect: formData.enable_email_collect,
        allow_messages_after_resolved: formData.allow_messages_after_resolved,
        greeting_enabled: formData.greeting_enabled,
        greeting_message: formData.greeting_message || '',
        greeting_message_template_id: formData.greeting_message_template_id || null,
        portal_id: formData.portal_id || null,
        lock_to_single_conversation: formData.lock_to_single_conversation,
        default_conversation_status: formData.default_conversation_status || null,
        sender_name_type: formData.sender_name_type,
        business_name: formData.business_name || null,
        channel: {
          widget_color: formData.widget_color,
          website_url: formData.website_url,
          webhook_url: formData.webhook_url,
          welcome_title: formData.welcome_title || '',
          welcome_tagline: formData.welcome_tagline || '',
          selectedFeatureFlags: formData.selected_feature_flags,
          reply_time: formData.reply_time || 'in_a_few_minutes',
          locale: formData.locale && formData.locale.trim() ? formData.locale : null,
          continuity_via_email: formData.continuity_via_email,
        },
      };

      if (avatarFile) {
        await InboxesService.updateWithAvatar(inboxId!, payload, avatarFile);
      } else {
        await InboxesService.update(inboxId!, payload);
      }
      setAvatarFile(null);
      await loadChannelData();
      toast.success(t('settings.success.saveSuccess'));
    } catch (error) {
      console.error('Error saving channel settings:', error);
      toast.error(t('settings.errors.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFeatureFlag = (flag: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selected_feature_flags: checked
        ? [...(prev.selected_feature_flags || []), flag]
        : (prev.selected_feature_flags || []).filter(f => f !== flag),
    }));
  };

  const handleAvatarUpload = (file: File) => {
    setAvatarFile(file);
    // Create preview URL
    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, avatar_url: url }));
  };

  const handleAvatarDelete = async () => {
    try {
      // await InboxesService.deleteAvatar(accountId, inboxId);
      setAvatarFile(null);
      setFormData(prev => ({ ...prev, avatar_url: undefined }));
      toast.success(t('settings.success.avatarDeleteSuccess'));
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast.error(t('settings.errors.avatarDeleteError'));
    }
  };

  const handleFormChange = (updates: Partial<ChannelSettingsData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t('settings.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/channels')}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">{t('settings.breadcrumb.channels')}</span>
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-primary">
            {t('settings.breadcrumb.settings')}
          </span>
        </div>

        {/* Save Button */}
        {activeTab === 'inbox_settings' ? (
          <Button onClick={handleSave} disabled={isSaving} className="min-w-40">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('settings.saving') : t('settings.save')}
          </Button>
        ) : (
          <div className="text-xs text-muted-foreground">
            {t('settings.info.tabSpecificSave')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Inbox Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              {formData.avatar_url && (
                <img
                  src={formData.avatar_url}
                  alt="Inbox avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-border"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-foreground">{inboxName}</h1>
                <p className="text-muted-foreground mt-1">{t('settings.description')}</p>
              </div>
            </div>

            {/* Authorization banners */}
            <AuthorizationBanners
              inbox={inbox}
              onReauthorize={provider => {
                toast.info(t('settings.reauthorize.redirecting', { provider }));
              }}
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap justify-start gap-1 bg-transparent p-0 h-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{tab.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Tab Contents */}
            <TabsContent value="inbox_settings">
              {activeTab === 'inbox_settings' && <div className="space-y-6">
                {/* Basic Settings */}
                <Card>
                  <CardContent className="p-6">
                    <BasicSettingsForm
                      formData={formData}
                      inboxHook={inboxHook}
                      onFormChange={handleFormChange}
                      onAvatarUpload={handleAvatarUpload}
                      onAvatarDelete={handleAvatarDelete}
                    />
                  </CardContent>
                </Card>

                {/* Greeting Settings */}
                <Card>
                  <CardContent className="p-6">
                    <GreetingSettingsForm formData={formData} onFormChange={handleFormChange} />
                  </CardContent>
                </Card>

                {/* Web Widget Advanced Settings */}
                {inboxHook.isAWebWidgetInbox && (
                  <Card>
                    <CardContent className="p-6">
                      <WebWidgetAdvancedForm
                        formData={formData}
                        onFormChange={handleFormChange}
                        onFeatureFlagChange={handleFeatureFlag}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Lock to Single Conversation */}
                {inboxHook.canLocktoSingleConversation && (
                  <Card>
                    <CardContent className="p-6">
                      <LockToSingleConversationForm
                        formData={formData}
                        onFormChange={handleFormChange}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Default Conversation Status */}
                <Card>
                  <CardContent className="p-6">
                    <DefaultConversationStatusForm
                      formData={formData}
                      onFormChange={handleFormChange}
                    />
                  </CardContent>
                </Card>

                {/* Sender Name Settings */}
                {(inboxHook.isAWebWidgetInbox || inboxHook.isAnEmailChannel) && (
                  <Card>
                    <CardContent className="p-6">
                      <SenderSettingsForm
                        senderNameType={formData.sender_name_type as 'friendly' | 'professional'}
                        businessName={formData.business_name || ''}
                        onUpdate={async data => {
                          try {
                            await InboxesService.update(inboxId, data);
                            toast.success(t('settings.success.senderUpdateSuccess'));
                            await loadChannelData(); // Refresh data
                          } catch (error) {
                            console.error('Erro ao atualizar configurações do remetente:', error);
                            toast.error(t('settings.errors.senderUpdateError'));
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Email Signature */}
                {inboxHook.isAnEmailChannel && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Mail className="w-5 h-5 text-purple-600 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {t('settings.configuration.email.signature.title')}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('settings.configuration.email.signature.description')}
                          </p>

                          <div className="mt-4">
                            <Textarea
                              value={emailSignature}
                              onChange={e => setEmailSignature(e.target.value)}
                              placeholder={t('settings.configuration.email.signature.placeholder')}
                              rows={6}
                              className="font-mono text-sm"
                            />
                          </div>

                          <Button
                            onClick={async () => {
                              setIsSavingSignature(true);
                              try {
                                await InboxesService.update(inboxId, {
                                  channel: { email_signature: emailSignature },
                                });
                                toast.success(t('settings.configuration.email.success.updated'));
                                await loadChannelData();
                              } catch (error) {
                                console.error('Error updating email signature:', error);
                                toast.error(t('settings.configuration.email.errors.updateError'));
                              } finally {
                                setIsSavingSignature(false);
                              }
                            }}
                            loading={isSavingSignature}
                            className="mt-4"
                          >
                            {t('settings.configuration.email.signature.save', { defaultValue: 'Salvar Assinatura' })}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>}
            </TabsContent>

            {/* Collaborators Tab */}
            <TabsContent value="collaborators">
              {activeTab === 'collaborators' && <CollaboratorsForm
                inboxId={inboxId}
                enableAutoAssignment={inbox?.enable_auto_assignment === true}
                maxAssignmentLimit={
                  inbox?.auto_assignment_config?.max_assignment_limit !== undefined
                    ? inbox.auto_assignment_config.max_assignment_limit
                    : null
                }
                onAutoAssignmentChange={async (enabled, limit) => {
                  // Update inbox auto assignment settings
                  const payload = {
                    id: inboxId,
                    enable_auto_assignment: enabled,
                    auto_assignment_config: {
                      max_assignment_limit: limit,
                    },
                  };
                  await InboxesService.update(inboxId, payload);
                  await loadChannelData(); // Refresh data after update
                }}
              />}
            </TabsContent>

            {/* Business Hours Tab */}
            <TabsContent value="businesshours">
              {activeTab === 'businesshours' && <BusinessHoursForm
                inboxId={inboxId}
                workingHoursEnabled={inbox?.working_hours_enabled === true}
                outOfOfficeMessage={inbox?.out_of_office_message || ''}
                outOfOfficeMessageTemplateId={inbox?.out_of_office_message_template_id || null}
                workingHours={Array.isArray(inbox?.working_hours) ? inbox.working_hours : []}
                timezone={inbox?.timezone || 'UTC'}
                onUpdate={async data => {
                  // Update inbox business hours settings
                  const payload = {
                    id: inboxId,
                    working_hours_enabled: data.working_hours_enabled,
                    out_of_office_message: data.out_of_office_message,
                    out_of_office_message_template_id: data.out_of_office_message_template_id,
                    working_hours: data.working_hours,
                    timezone: data.timezone,
                  };
                  await InboxesService.update(inboxId, payload);
                  await loadChannelData(); // Refresh data after update
                }}
              />}
            </TabsContent>

            {/* CSAT Tab */}
            <TabsContent value="csat">
              {activeTab === 'csat' && <CSATForm
                inboxId={inboxId}
                csatSurveyEnabled={inbox?.csat_survey_enabled === true}
                csatConfig={
                  inbox?.csat_config && Object.keys(inbox.csat_config).length > 0
                    ? inbox.csat_config
                    : undefined
                }
                onUpdate={async data => {
                  // Update inbox CSAT settings
                  const payload = {
                    id: inboxId,
                    csat_survey_enabled: data.csat_survey_enabled,
                    csat_config: data.csat_config,
                  };
                  await InboxesService.update(inboxId, payload);
                  await loadChannelData(); // Refresh data after update
                }}
              />}
            </TabsContent>

            {/* Pre-Chat Form Tab */}
            <TabsContent value="preChatForm">
              {activeTab === 'preChatForm' && <PreChatForm
                inboxId={inboxId}
                preChatFormEnabled={inbox?.pre_chat_form_enabled === true}
                preChatFormOptions={inbox?.pre_chat_form_options || undefined}
                onUpdate={async data => {
                  // Update inbox pre-chat form settings
                  const payload = {
                    id: inboxId,
                    channel: {
                      pre_chat_form_enabled: data.pre_chat_form_enabled,
                      pre_chat_form_options: data.pre_chat_form_options,
                    },
                  };
                  await InboxesService.update(inboxId, payload);
                  await loadChannelData(); // Refresh data after update
                }}
              />}
            </TabsContent>

            {/* Widget Builder Tab */}
            <TabsContent value="widgetBuilder">
              {activeTab === 'widgetBuilder' && <WidgetBuilderForm
                inboxId={inboxId}
                inbox={{
                  name: inbox?.name,
                  welcome_title: inbox?.welcome_title,
                  welcome_tagline: inbox?.welcome_tagline,
                  widget_color: inbox?.widget_color,
                  reply_time: inbox?.reply_time,
                  avatar_url: inbox?.avatar_url,
                  web_widget_script: inbox?.web_widget_script,
                }}
                onUpdate={async data => {
                  if (data.avatar instanceof File) {
                    const { avatar, ...payload } = data;
                    await InboxesService.updateWithAvatar(inboxId, payload, avatar);
                  } else {
                    await InboxesService.update(inboxId, data);
                  }
                  await loadChannelData();
                }}
              />}
            </TabsContent>

            {/* Agent Bot Configuration Tab */}
            <TabsContent value="botConfiguration">
              {activeTab === 'botConfiguration' && <AgentBotConfigurationForm
                inboxId={inboxId}
                onUpdate={success => {
                  if (success) {
                    // Optionally refresh inbox data or show success feedback
                    console.log('Agent bot configuration updated successfully');
                  }
                }}
              />}
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="configuration">
              {activeTab === 'configuration' && <ConfigurationForm
                inboxId={inboxId}
                inbox={inbox}
                onUpdate={async data => {
                  try {
                    await InboxesService.update(inboxId, data);
                    toast.success(t('settings.success.configUpdateSuccess'));
                    await loadChannelData(); // Refresh data
                  } catch (error) {
                    console.error('Erro ao atualizar configuração:', error);
                    toast.error(t('settings.errors.configUpdateError'));
                  }
                }}
              />}
            </TabsContent>

            {/* Message Templates Tab */}
            <TabsContent value="messageTemplates">
              {activeTab === 'messageTemplates' && <MessageTemplateForm
                inboxId={inboxId}
                channelType={inbox?.channel_type || ''}
                onUpdate={async () => {
                  // Refresh inbox data after template changes
                  await loadChannelData();
                }}
              />}
            </TabsContent>

            {/* Moderation Tab */}
            <TabsContent value="moderation">
              {activeTab === 'moderation' && <ModerationDashboard />}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

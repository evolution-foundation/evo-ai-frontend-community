import { ChannelType } from '@/types/channels/providers';
import i18n from '@/i18n/config';

// Function to get channel types with translations
export const getChannelTypes = (): ChannelType[] => [
  {
    id: 'website',
    name: i18n.t('channels:newChannel.channelTypes.website.name'),
    description: i18n.t('channels:newChannel.channelTypes.website.description'),
    type: 'web_widget',
  },
  {
    id: 'whatsapp',
    name: i18n.t('channels:newChannel.channelTypes.whatsapp.name'),
    description: i18n.t('channels:newChannel.channelTypes.whatsapp.description'),
    type: 'whatsapp',
    providers: [
      {
        id: 'whatsapp_cloud',
        name: i18n.t('channels:newChannel.providers.whatsappCloud.name'),
        description: i18n.t('channels:newChannel.providers.whatsappCloud.description'),
        recommended: true,
      },
      {
        id: 'evolution',
        name: i18n.t('channels:newChannel.providers.evolution.name'),
        description: i18n.t('channels:newChannel.providers.evolution.description'),
        popular: false,
      },
      {
        id: 'evolution_go',
        name: i18n.t('channels:newChannel.providers.evolutionGo.name'),
        description: i18n.t('channels:newChannel.providers.evolutionGo.description'),
        popular: true,
      },
      {
        id: 'notificame',
        name: i18n.t('channels:newChannel.providers.notificame.name'),
        description: i18n.t('channels:newChannel.providers.notificame.description'),
      },
      {
        id: 'zapi',
        name: i18n.t('channels:newChannel.providers.zapi.name'),
        description: i18n.t('channels:newChannel.providers.zapi.description'),
      },
      {
        id: 'twilio',
        name: i18n.t('channels:newChannel.providers.twilio.name'),
        description: i18n.t('channels:newChannel.providers.twilio.description'),
      },
    ],
  },
  {
    id: 'instagram',
    name: i18n.t('channels:newChannel.channelTypes.instagram.name'),
    description: i18n.t('channels:newChannel.channelTypes.instagram.description'),
    type: 'instagram',
  },
  {
    id: 'facebook',
    name: i18n.t('channels:newChannel.channelTypes.facebook.name'),
    description: i18n.t('channels:newChannel.channelTypes.facebook.description'),
    type: 'facebook',
  },
  {
    id: 'telegram',
    name: i18n.t('channels:newChannel.channelTypes.telegram.name'),
    description: i18n.t('channels:newChannel.channelTypes.telegram.description'),
    type: 'telegram',
  },
  {
    id: 'sms',
    name: i18n.t('channels:newChannel.channelTypes.sms.name'),
    description: i18n.t('channels:newChannel.channelTypes.sms.description'),
    type: 'sms',
    providers: [
      {
        id: 'twilio',
        name: i18n.t('channels:newChannel.providers.twilioSms.name'),
        description: i18n.t('channels:newChannel.providers.twilioSms.description'),
        recommended: true,
      },
      {
        id: 'bandwidth',
        name: i18n.t('channels:newChannel.providers.bandwidth.name'),
        description: i18n.t('channels:newChannel.providers.bandwidth.description'),
        popular: false,
      },
    ],
  },
  {
    id: 'email',
    name: i18n.t('channels:newChannel.channelTypes.email.name'),
    description: i18n.t('channels:newChannel.channelTypes.email.description'),
    type: 'email',
    providers: [
      {
        id: 'google',
        name: i18n.t('channels:newChannel.providers.gmail.name'),
        description: i18n.t('channels:newChannel.providers.gmail.description'),
        recommended: true,
      },
      {
        id: 'microsoft',
        name: i18n.t('channels:newChannel.providers.outlook.name'),
        description: i18n.t('channels:newChannel.providers.outlook.description'),
        popular: true,
      },
      // {
      //   id: 'other_provider',
      //   name: i18n.t('channels:newChannel.providers.otherEmail.name'),
      //   description: i18n.t('channels:newChannel.providers.otherEmail.description'),
      //   popular: false,
      // },
    ],
  },
  {
    id: 'api',
    name: i18n.t('channels:newChannel.channelTypes.api.name'),
    description: i18n.t('channels:newChannel.channelTypes.api.description'),
    type: 'api',
  },
];

// Backward compatibility - export static array for components that need it
export const CHANNEL_TYPES = getChannelTypes();

import type { Inbox } from '@/types/channels/inbox';

/** The name the user gave the channel; `name` is stored as a slug of it. */
export const getInboxDisplayName = (inbox: Inbox): string => inbox.display_name || inbox.name;

/** What tells two channels of the same type apart: number, address or site. */
export const getInboxIdentifier = (inbox: Inbox): string | undefined => {
  switch (inbox.channel_type) {
    case 'Channel::Whatsapp':
    case 'Channel::Sms':
    case 'Channel::TwilioSms':
      return inbox.phone_number || undefined;
    case 'Channel::Email':
    case 'Channel::Sendgrid':
      return inbox.email || undefined;
    case 'Channel::WebWidget':
      return inbox.website_url || undefined;
    default:
      return undefined;
  }
};

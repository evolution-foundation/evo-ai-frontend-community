// Channel options mirroring CHANNEL_LABELS in
// evo-ai-crm-community/app/controllers/api/v1/evo_flow/contact_events_controller.rb
// (origin/develop). The backend is the source of truth for
// `enriched.channel_label`, so this list aligns with the backend rather than
// src/utils/channelUtils.ts (which renames facebook_page → "Messenger" and
// diverges).
//
// Labels are NOT stored here — render them via t(`events.channels.${value}`)
// so the i18n layer can localise per user locale. `includes` is documented
// here only so reviewers can trace why "facebook" sent to the backend covers
// `facebook_page` events too (and likewise for twitter).
export interface ContactEventChannelOption {
  value: string;
  i18nKey: string;
  includes: readonly string[];
}

const CHANNELS_RAW: readonly Omit<ContactEventChannelOption, 'i18nKey'>[] = [
  { value: 'api', includes: ['api'] },
  { value: 'email', includes: ['email'] },
  { value: 'facebook', includes: ['facebook', 'facebook_page'] },
  { value: 'instagram', includes: ['instagram'] },
  { value: 'line', includes: ['line'] },
  { value: 'sms', includes: ['sms'] },
  { value: 'telegram', includes: ['telegram'] },
  { value: 'twilio_sms', includes: ['twilio_sms'] },
  { value: 'twitter', includes: ['twitter', 'twitter_profile'] },
  { value: 'web_widget', includes: ['web_widget'] },
  { value: 'whatsapp', includes: ['whatsapp'] },
];

export const CONTACT_EVENT_CHANNEL_OPTIONS: ReadonlyArray<ContactEventChannelOption> =
  CHANNELS_RAW.map((opt) => ({ ...opt, i18nKey: `events.channels.${opt.value}` }));

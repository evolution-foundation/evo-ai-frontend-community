import { describe, it, expect } from 'vitest';
import { isPhoneBearingChannel } from './channelUtils';

describe('isPhoneBearingChannel', () => {
  it('returns true for canonical Channel:: phone channel types', () => {
    expect(isPhoneBearingChannel('Channel::Whatsapp')).toBe(true);
    expect(isPhoneBearingChannel('Channel::TwilioSms')).toBe(true);
    expect(isPhoneBearingChannel('Channel::Sms')).toBe(true);
    expect(isPhoneBearingChannel('Channel::Telegram')).toBe(true);
  });

  it('returns true for all WhatsApp variants (legacy, Cloud, 360Dialog)', () => {
    expect(isPhoneBearingChannel('Channel::WhatsappCloud')).toBe(true);
    expect(isPhoneBearingChannel('Channel::Whatsapp360Dialog')).toBe(true);
    expect(isPhoneBearingChannel('whatsapp_cloud')).toBe(true);
    expect(isPhoneBearingChannel('whatsappcloud')).toBe(true);
    expect(isPhoneBearingChannel('whatsapp_360dialog')).toBe(true);
    expect(isPhoneBearingChannel('whatsapp360dialog')).toBe(true);
  });

  it('returns true for lowercase channel type aliases the API can return', () => {
    expect(isPhoneBearingChannel('whatsapp')).toBe(true);
    expect(isPhoneBearingChannel('twiliosms')).toBe(true);
    expect(isPhoneBearingChannel('twilio_sms')).toBe(true);
    expect(isPhoneBearingChannel('sms')).toBe(true);
    expect(isPhoneBearingChannel('telegram')).toBe(true);
  });

  it('returns false for non-phone channels', () => {
    expect(isPhoneBearingChannel('Channel::WebWidget')).toBe(false);
    expect(isPhoneBearingChannel('Channel::Email')).toBe(false);
    expect(isPhoneBearingChannel('Channel::Api')).toBe(false);
    expect(isPhoneBearingChannel('Channel::FacebookPage')).toBe(false);
    expect(isPhoneBearingChannel('Channel::Instagram')).toBe(false);
    expect(isPhoneBearingChannel('Channel::Line')).toBe(false);
    expect(isPhoneBearingChannel('Channel::TwitterProfile')).toBe(false);
    expect(isPhoneBearingChannel('email')).toBe(false);
    expect(isPhoneBearingChannel('webwidget')).toBe(false);
  });

  it('returns false for empty or nullish input', () => {
    expect(isPhoneBearingChannel('')).toBe(false);
    expect(isPhoneBearingChannel(null)).toBe(false);
    expect(isPhoneBearingChannel(undefined)).toBe(false);
  });

  it('returns false for unknown channel types (defaults closed)', () => {
    expect(isPhoneBearingChannel('Channel::MysteryChannel')).toBe(false);
    expect(isPhoneBearingChannel('random_string')).toBe(false);
  });
});

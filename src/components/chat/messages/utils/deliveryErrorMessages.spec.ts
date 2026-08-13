import { describe, it, expect } from 'vitest';
import { getFriendlyDeliveryError } from './deliveryErrorMessages';

describe('getFriendlyDeliveryError', () => {
  it('translates a known WhatsApp Cloud error code', () => {
    expect(getFriendlyDeliveryError('131026: Message undeliverable')).toBe(
      'O número não tem WhatsApp ativo ou não pôde ser alcançado.',
    );
  });

  it('translates the 24h re-engagement window error', () => {
    expect(getFriendlyDeliveryError('131047: Re-engagement message')).toContain('janela de 24h');
  });

  it('matches a free-form provider message via pattern (Evolution Go/Z-API style)', () => {
    const raw = '[Evolution Go] HTTP 500: {"error":"number +554391835948@s.whatsapp.net is not registered on WhatsApp"}';
    expect(getFriendlyDeliveryError(raw)).toBe('O número não tem WhatsApp ativo ou não pôde ser alcançado.');
  });

  it('returns undefined for an unrecognized error so the caller can fall back to the raw text', () => {
    expect(getFriendlyDeliveryError('999999: Some brand-new error nobody has mapped yet')).toBeUndefined();
  });

  it('returns undefined for an empty/missing error', () => {
    expect(getFriendlyDeliveryError(undefined)).toBeUndefined();
    expect(getFriendlyDeliveryError('')).toBeUndefined();
  });

  it('does not false-positive on an unrelated number buried later in the string', () => {
    expect(getFriendlyDeliveryError('Falha ao processar pedido 131026 do cliente')).toBeUndefined();
  });
});

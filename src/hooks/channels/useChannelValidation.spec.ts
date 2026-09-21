import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { useChannelValidation } from './useChannelValidation';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('validateByChannelAndProvider — whatsapp without a provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toasts and fails validation instead of exiting silently', () => {
    const { validateByChannelAndProvider } = useChannelValidation();

    const result = validateByChannelAndProvider('whatsapp', undefined, {});

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Selecione um provedor');
  });
});

describe('validateWaha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validForm = {
    name: 'WhatsApp WAHA',
    base_url: 'https://waha.example.com',
    api_key: 'api-key',
    session_name: 'default',
    phone_number: '+5511999999999',
  };

  it('requires base_url', () => {
    const { validateWaha } = useChannelValidation();

    const result = validateWaha({ ...validForm, base_url: '' });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Base URL é obrigatório');
  });

  it('requires api_key', () => {
    const { validateWaha } = useChannelValidation();

    const result = validateWaha({ ...validForm, api_key: '' });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('API Key é obrigatório');
  });

  it('requires session_name', () => {
    const { validateWaha } = useChannelValidation();

    const result = validateWaha({ ...validForm, session_name: '' });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Session name é obrigatório');
  });

  it('requires phone_number', () => {
    const { validateWaha } = useChannelValidation();

    const result = validateWaha({ ...validForm, phone_number: '' });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Telefone é obrigatório');
  });

  it('rejects a phone number that is not in E.164 format', () => {
    const { validateWaha } = useChannelValidation();

    const result = validateWaha({ ...validForm, phone_number: '11999999999' });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      'Telefone deve estar no formato internacional (+5511999999999)',
    );
  });

  it('passes with no errors when every required field is present and valid', () => {
    const { validateWaha } = useChannelValidation();

    const result = validateWaha(validForm);

    expect(result).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('validateByChannelAndProvider — whatsapp/waha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes to validateWaha for the waha provider', () => {
    const { validateByChannelAndProvider } = useChannelValidation();

    const result = validateByChannelAndProvider('whatsapp', 'waha', { name: 'n' });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Base URL é obrigatório');
  });
});

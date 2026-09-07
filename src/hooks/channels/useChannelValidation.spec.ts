import { renderHook } from '@testing-library/react';
import i18n from '@/i18n/config';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { useChannelValidation } from './useChannelValidation';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('validateByChannelAndProvider — whatsapp without a provider', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pt-BR');
    vi.clearAllMocks();
  });

  it('toasts and fails validation instead of exiting silently', () => {
    const { result: hook } = renderHook(() => useChannelValidation());
    const { validateByChannelAndProvider } = hook.current;

    const result = validateByChannelAndProvider('whatsapp', undefined, {});

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Selecione um provedor');
  });
});

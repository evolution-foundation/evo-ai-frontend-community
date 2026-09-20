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

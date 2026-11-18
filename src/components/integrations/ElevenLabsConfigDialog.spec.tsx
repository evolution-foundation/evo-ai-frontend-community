import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ElevenLabsConfigDialog from './ElevenLabsConfigDialog';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const APPLY = 'edit.integrations.elevenlabs.applyConfig';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderDialog = () => {
  const onSave = vi.fn();
  render(<ElevenLabsConfigDialog open onOpenChange={vi.fn()} onSave={onSave} />);
  return onSave;
};

const typeKey = (key: string) => userEvent.type(screen.getByLabelText('edit.integrations.elevenlabs.apiKey'), key);

describe('ElevenLabsConfigDialog', () => {
  it('does not save a key the ElevenLabs API rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const onSave = renderDialog();

    await typeKey('sk_invalid_key_123');

    await waitFor(() =>
      expect(screen.getByText(/edit.integrations.elevenlabs.errorLoadingVoices/)).toBeTruthy()
    );
    const apply = screen.getByRole('button', { name: APPLY });
    expect(apply.hasAttribute('disabled')).toBe(true);
    await userEvent.click(apply);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save a key too short to be checked', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderDialog();

    await typeKey('abc');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: APPLY }).hasAttribute('disabled')).toBe(true);
  });

  it('does not let a late answer for the previous key validate the current one', async () => {
    const pending: Record<string, (response: unknown) => void> = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: { headers: Record<string, string> }) =>
          new Promise(resolve => {
            pending[init.headers['xi-api-key']] = resolve;
          })
      )
    );
    renderDialog();
    const input = screen.getByLabelText('edit.integrations.elevenlabs.apiKey');

    fireEvent.change(input, { target: { value: 'sk_previous_key_1' } });
    fireEvent.change(input, { target: { value: 'sk_current_key_22' } });
    await act(async () => {
      pending.sk_previous_key_1({
        ok: true,
        json: async () => ({ voices: [{ voice_id: 'voice-1', name: 'Rachel' }] }),
      });
    });

    expect(screen.getByRole('button', { name: APPLY }).hasAttribute('disabled')).toBe(true);

    await act(async () => {
      pending.sk_current_key_22({ ok: false, status: 401 });
    });

    expect(screen.getByRole('button', { name: APPLY }).hasAttribute('disabled')).toBe(true);
  });

  it('saves a valid key with the first voice selected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ voices: [{ voice_id: 'voice-1', name: 'Rachel' }] }),
      })
    );
    const onSave = renderDialog();

    await typeKey('sk_valid_key_1234');

    const apply = screen.getByRole('button', { name: APPLY });
    await waitFor(() => expect(apply.hasAttribute('disabled')).toBe(false));
    await userEvent.click(apply);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk_valid_key_1234', voice: 'voice-1' })
    );
  });
});

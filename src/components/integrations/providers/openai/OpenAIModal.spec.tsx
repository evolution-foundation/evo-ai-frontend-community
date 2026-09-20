import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OpenAIModal from './OpenAIModal';
import type { IntegrationHook } from '@/types/integrations';

// EVO-2250 story 1.6: this screen stopped registering the credential, but the
// hook update REPLACES the settings jsonb. Dropping api_key from the payload
// would erase a migrated key — and on an install whose only key lives here that
// silently switches AI off, defeating the Ai::MigrationState guard.
const navigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const HOOK_WITH_KEY = {
  id: 'hook-1',
  app_id: 'openai',
  settings: { api_key: 'sk-migrated-1111', enable_audio_transcription: true },
} as unknown as IntegrationHook;

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => vi.clearAllMocks());

describe('OpenAIModal — the credential moved out (1.6 AC2)', () => {
  it('offers no key input any more', () => {
    render(<OpenAIModal open hook={HOOK_WITH_KEY} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/apiKey/i)).not.toBeInTheDocument();
    expect(screen.getByText('openai.modal.credentialMoved')).toBeInTheDocument();
  });

  it('points at the AI Credentials screen', async () => {
    const user = userEvent.setup();
    render(<OpenAIModal open hook={HOOK_WITH_KEY} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    await user.click(screen.getByText('openai.modal.goToCredentials'));

    expect(navigate).toHaveBeenCalledWith('/settings/ai-credentials');
  });

  it('keeps the stored key in the payload when saving the toggles', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OpenAIModal open hook={HOOK_WITH_KEY} onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByText('openai.modal.actions.update'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    // Losing this is a data-loss path, not a cosmetic regression.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ api_key: 'sk-migrated-1111' });
  });

  it('still saves the toggle the user changed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OpenAIModal open hook={HOOK_WITH_KEY} onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByText('openai.modal.actions.update'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      api_key: 'sk-migrated-1111',
      enable_audio_transcription: false,
    });
  });

  it('saves without a key when the hook never had one', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<OpenAIModal open onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    await user.click(screen.getByText('openai.modal.actions.configure'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ api_key: '' });
  });
});

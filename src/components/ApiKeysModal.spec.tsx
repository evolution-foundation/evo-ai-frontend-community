import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeysModal, AI_CREDENTIALS_ROUTE } from './ApiKeysModal';

// EVO-2250 story 1.1 (AC6): the modal stopped owning a parallel CRUD and now
// points at the AI Credentials page. Selecting a credential still lives in the
// callers, and three of them (GeneralTab, LLMConfigForm, Step6_ApiKeyModel)
// reload their selectable list through onApiKeysChange — dropping that callback
// leaves the agent forms showing a stale list after a credential is created.
const navigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ApiKeysModal — points at the unified page (AC6)', () => {
  it('navigates to the AI Credentials route instead of editing inline', async () => {
    const user = userEvent.setup();
    render(<ApiKeysModal open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /title/i }));

    expect(navigate).toHaveBeenCalledWith(AI_CREDENTIALS_ROUTE);
  });

  it('notifies the caller so its credential list reloads', async () => {
    const user = userEvent.setup();
    const onApiKeysChange = vi.fn();
    render(<ApiKeysModal open onOpenChange={vi.fn()} onApiKeysChange={onApiKeysChange} />);

    await user.click(screen.getByRole('button', { name: /title/i }));

    expect(onApiKeysChange).toHaveBeenCalledTimes(1);
  });

  it('closes itself before navigating away', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ApiKeysModal open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: /title/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('works without the optional callback', async () => {
    const user = userEvent.setup();
    render(<ApiKeysModal open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /title/i }));

    expect(navigate).toHaveBeenCalledWith(AI_CREDENTIALS_ROUTE);
  });

  it('no longer renders a credential form (the CRUD moved out)', () => {
    render(<ApiKeysModal open onOpenChange={vi.fn()} />);

    expect(screen.queryByLabelText('form.labels.key')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('form.labels.provider')).not.toBeInTheDocument();
  });

  it('cancel closes without navigating', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ApiKeysModal open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'actions.cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

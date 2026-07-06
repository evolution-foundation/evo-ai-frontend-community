import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Setup from './Setup';
import { setupService } from '@/services/setup/setupService';
import {
  registerPlugin,
  type PluginSlotComponentProps,
  type SetupHostContextValue,
} from '@/plugin-host';
import { __resetPluginHostForTests } from '@/plugin-host/test-utils';

// t returns the key verbatim so tests can query by i18n key.
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    currentLanguage: 'pt-BR',
    changeLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

vi.mock('@/services/setup/setupService', () => ({
  setupService: {
    getStatus: vi.fn(),
    bootstrap: vi.fn(),
  },
}));

vi.mock('@/contexts/GlobalConfigContext', () => ({
  clearSetupCache: vi.fn(),
}));

vi.mock('@/components/AppLogo', () => ({
  AppLogo: () => <div data-testid="app-logo">Logo</div>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderSetup = () =>
  render(
    <MemoryRouter>
      <Setup />
    </MemoryRouter>,
  );

const fillAccount = () => {
  fireEvent.change(screen.getByLabelText('form.firstName.label'), { target: { value: 'Ada' } });
  fireEvent.change(screen.getByLabelText('form.lastName.label'), { target: { value: 'Lovelace' } });
  fireEvent.change(screen.getByLabelText('form.email.label'), { target: { value: 'ada@box.dev' } });
  fireEvent.change(screen.getByLabelText('form.password.label'), { target: { value: 'Abcd1234!' } });
  fireEvent.change(screen.getByLabelText('form.confirmPassword.label'), { target: { value: 'Abcd1234!' } });
};

const ACCOUNT = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@box.dev',
  password: 'Abcd1234!',
  password_confirmation: 'Abcd1234!',
};

describe('Setup wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setupService.bootstrap).mockResolvedValue({
      status: 'ok',
      message: 'ok',
      survey_token: null,
    });
  });

  afterEach(() => {
    // The registry is process-global; wipe it so contributed steps don't leak.
    __resetPluginHostForTests();
  });

  it('on a community-pure box bootstraps directly with no extension_payload and no extra step', async () => {
    vi.mocked(setupService.getStatus).mockResolvedValue({
      status: 'inactive',
      instance_id: null,
      extra_setup_steps: false,
    });

    renderSetup();
    await waitFor(() => expect(setupService.getStatus).toHaveBeenCalled());

    fillAccount();
    fireEvent.click(screen.getByRole('button', { name: 'form.submit.idle' }));

    await waitFor(() => expect(setupService.bootstrap).toHaveBeenCalledWith(ACCOUNT));
    // No extension_payload rode along on the community path.
    expect(setupService.bootstrap).toHaveBeenCalledTimes(1);
    expect(vi.mocked(setupService.bootstrap).mock.calls[0][0]).not.toHaveProperty('extension_payload');
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('advances to the contributed setup.steps slot when extra_setup_steps is true', async () => {
    vi.mocked(setupService.getStatus).mockResolvedValue({
      status: 'inactive',
      instance_id: null,
      extra_setup_steps: true,
    });

    registerPlugin({
      id: 'fake-setup-step',
      slots: {
        'setup.steps': [
          {
            id: 'fake-step',
            component: () => <div data-testid="fake-setup-step">extra step</div>,
          },
        ],
      },
    });

    renderSetup();
    await waitFor(() => expect(setupService.getStatus).toHaveBeenCalled());

    fillAccount();
    fireEvent.click(screen.getByRole('button', { name: 'form.submit.continue' }));

    await screen.findByTestId('fake-setup-step');
    // Advancing does not bootstrap — the contributed step finishes the install.
    expect(setupService.bootstrap).not.toHaveBeenCalled();
  });

  it('shows a recovery fallback with a back button when the flag is true but no plugin is registered', async () => {
    vi.mocked(setupService.getStatus).mockResolvedValue({
      status: 'inactive',
      instance_id: null,
      extra_setup_steps: true,
    });

    renderSetup();
    await waitFor(() => expect(setupService.getStatus).toHaveBeenCalled());

    fillAccount();
    fireEvent.click(screen.getByRole('button', { name: 'form.submit.continue' }));

    // No contribution → the host fallback keeps the operator unstranded.
    await screen.findByText('extension.unavailable');
    expect(setupService.bootstrap).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'extension.back' }));
    // Back returns to the account step.
    expect(screen.getByLabelText('form.email.label')).toBeInTheDocument();
  });

  it('forwards the opaque extension_payload and runs the post-bootstrap callback', async () => {
    vi.mocked(setupService.getStatus).mockResolvedValue({
      status: 'inactive',
      instance_id: null,
      extra_setup_steps: true,
    });

    const afterBootstrap = vi.fn().mockResolvedValue(undefined);
    let receivedHost: SetupHostContextValue | undefined;

    // The contributed step reads its host controls from the `setupHost` PROP,
    // not from a React context — a separately-bundled plugin ships its own
    // React instance, so a context read would land on a different provider.
    // Typed as a real contribution is: the host props plus the `setupHost`
    // the wizard spreads in via `componentProps`. This is assignable to the
    // slot's `ComponentType<PluginSlotComponentProps>`, unlike a shape that
    // makes `setupHost` a required prop.
    const FakeStep = ({
      setupHost,
    }: PluginSlotComponentProps & { setupHost?: SetupHostContextValue }) => {
      receivedHost = setupHost;
      return (
        <button type="button" onClick={() => setupHost!.submit({ probe: 1 }, afterBootstrap)}>
          finish
        </button>
      );
    };

    registerPlugin({
      id: 'fake-setup-step',
      slots: {
        'setup.steps': [{ id: 'fake-step', component: FakeStep }],
      },
    });

    renderSetup();
    await waitFor(() => expect(setupService.getStatus).toHaveBeenCalled());

    fillAccount();
    fireEvent.click(screen.getByRole('button', { name: 'form.submit.continue' }));

    fireEvent.click(await screen.findByRole('button', { name: 'finish' }));

    // The host controls arrived as a prop.
    expect(receivedHost).toBeDefined();
    expect(typeof receivedHost?.submit).toBe('function');

    await waitFor(() =>
      expect(setupService.bootstrap).toHaveBeenCalledWith({
        ...ACCOUNT,
        extension_payload: { probe: 1 },
      }),
    );
    await waitFor(() =>
      expect(afterBootstrap).toHaveBeenCalledWith({
        email: ACCOUNT.email,
        password: ACCOUNT.password,
      }),
    );
  });

  it('bootstraps immediately and never renders the slot when extra_setup_steps is false', async () => {
    vi.mocked(setupService.getStatus).mockResolvedValue({
      status: 'inactive',
      instance_id: null,
      extra_setup_steps: false,
    });

    registerPlugin({
      id: 'fake-setup-step',
      slots: {
        'setup.steps': [
          {
            id: 'fake-step',
            component: () => <div data-testid="fake-setup-step">extra step</div>,
          },
        ],
      },
    });

    renderSetup();
    await waitFor(() => expect(setupService.getStatus).toHaveBeenCalled());

    fillAccount();
    fireEvent.click(screen.getByRole('button', { name: 'form.submit.idle' }));

    await waitFor(() => expect(setupService.bootstrap).toHaveBeenCalledWith(ACCOUNT));
    expect(screen.queryByTestId('fake-setup-step')).not.toBeInTheDocument();
  });
});

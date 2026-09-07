import { act, cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GoogleCallback from './GoogleCallback';
import MicrosoftCallback from './MicrosoftCallback';
import oauthCallbackService from '@/services/channels/oauthCallbackService';
import en from '@/i18n/locales/en/email.json';
import pt from '@/i18n/locales/pt-BR/email.json';

vi.mock('@/components/AppLogo', () => ({ AppLogo: () => null }));
vi.mock('@/services/channels/oauthCallbackService', () => ({
  default: { handleGoogleCallback: vi.fn(), handleMicrosoftCallback: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const providers = [
  { Component: GoogleCallback, provider: 'Google', mailbox: 'Gmail', callback: oauthCallbackService.handleGoogleCallback },
  { Component: MicrosoftCallback, provider: 'Microsoft', mailbox: 'Outlook', callback: oauthCallbackService.handleMicrosoftCallback },
];

describe.each(providers)('$provider email callback translations', ({ Component, provider, mailbox, callback }) => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  async function show(query: string, language = 'en') {
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng: language, fallbackLng: 'en', defaultNS: 'email',
      resources: { en: { email: en }, 'pt-BR': { email: pt } },
      interpolation: { escapeValue: false },
    });
    await act(async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={[`/callback${query}`]}><Component /></MemoryRouter>
        </I18nextProvider>,
      );
    });
  }

  it('renders the processing state in English while authorization is pending', async () => {
    vi.mocked(callback).mockReturnValue(new Promise(() => {}));
    await show('?code=test-code&state=test-state');
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText(`Processing ${provider} authorization...`)).toBeInTheDocument();
    expect(callback).toHaveBeenCalledWith('test-code', 'test-state');
  });

  it('renders successful authorization and redirect feedback in English', async () => {
    vi.mocked(callback).mockResolvedValue({ success: true });
    await show('?code=test-code&state=test-state');
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText(`${mailbox} connected successfully!`)).toBeInTheDocument();
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
  });

  it('renders missing-parameter errors in English without calling the backend', async () => {
    await show('');
    expect(screen.getByText('Authorization code or state is missing')).toBeInTheDocument();
    expect(screen.getByText('You can close this window.')).toBeInTheDocument();
    expect(callback).not.toHaveBeenCalled();
  });

  it('translates a provider error when no description is supplied', async () => {
    await show('?error=access_denied');
    expect(screen.getByText('Authorization error: access_denied')).toBeInTheDocument();
  });

  it('preserves the provider error description', async () => {
    await show('?error=access_denied&error_description=Access+was+declined');
    expect(screen.getByText('Access was declined')).toBeInTheDocument();
  });

  it('uses the English fallback when connection fails without a server message', async () => {
    vi.mocked(callback).mockResolvedValue({ success: false });
    await show('?code=test-code&state=test-state');
    expect(screen.getByText(`Could not connect ${mailbox}`)).toBeInTheDocument();
  });

  it('preserves Portuguese for Portuguese users', async () => {
    await show('', 'pt-BR');
    expect(screen.getByText('Código de autorização ou state não encontrado')).toBeInTheDocument();
    expect(screen.getByText('Você pode fechar esta janela.')).toBeInTheDocument();
  });
});

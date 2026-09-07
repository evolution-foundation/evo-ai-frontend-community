import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EvolutionHubConfig from './EvolutionHubConfig';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { evolutionHubService } from '@/services/integrations';
import en from '@/i18n/locales/en/adminSettings.json';
import pt from '@/i18n/locales/pt-BR/adminSettings.json';

vi.mock('@/contexts/GlobalConfigContext', () => ({ useGlobalConfig: () => ({ refresh: vi.fn() }) }));
vi.mock('@/services/admin/adminConfigService', () => ({
  adminConfigService: { getConfig: vi.fn(), saveConfig: vi.fn(), testConfig: vi.fn() },
}));
vi.mock('@/services/integrations', () => ({
  evolutionHubService: { getPlan: vi.fn(), getMetaAppOptions: vi.fn(), listChannels: vi.fn() },
}));

describe('Evo Hub configuration translations', () => {
  beforeEach(() => {
    vi.mocked(adminConfigService.getConfig).mockResolvedValue({
      EVOLUTION_HUB_ENABLED: 'true', EVOLUTION_HUB_API_KEY: '••••',
    });
    vi.mocked(evolutionHubService.getPlan).mockResolvedValue({
      name: 'Community', slug: 'community', allow_shared_meta_app: true,
      allow_own_meta_app: false, max_channels_total: null,
    } as Awaited<ReturnType<typeof evolutionHubService.getPlan>>);
    vi.mocked(evolutionHubService.getMetaAppOptions).mockResolvedValue({ allowed_modes: [], byo_credentials: [] });
    vi.mocked(evolutionHubService.listChannels).mockResolvedValue([]);
  });
  afterEach(() => { cleanup(); vi.resetAllMocks(); });

  async function show(language = 'en') {
    const i18n = createInstance();
    await i18n.use(initReactI18next).init({
      lng: language, fallbackLng: 'en', defaultNS: 'adminSettings',
      resources: { en: { adminSettings: en }, 'pt-BR': { adminSettings: pt } },
      interpolation: { escapeValue: false },
    });
    render(<I18nextProvider i18n={i18n}><EvolutionHubConfig /></I18nextProvider>);
  }

  it('renders plan details and empty states in English', async () => {
    await show();
    expect(await screen.findByText('Configuration detected in Evo Hub')).toBeInTheDocument();
    expect(await screen.findByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Current plan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByText('yes')).toBeInTheDocument();
    expect(screen.getByText('no')).toBeInTheDocument();
    expect(screen.getByText('unlimited')).toBeInTheDocument();
    expect(screen.getByText('No Meta Apps available. Register one in Evo Hub to start creating channels.')).toBeInTheDocument();
    expect(screen.getByText('No channels created yet.')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('Total de canais');
    expect(document.body).not.toHaveTextContent('Meta App própria');
  });

  it('translates partial failures and interpolates the failed request count', async () => {
    vi.mocked(evolutionHubService.listChannels).mockRejectedValue(new Error('offline'));
    await show();
    expect(await screen.findByText('Some information could not be loaded (1 of 3). Check the API URL and token.')).toBeInTheDocument();
  });

  it('keeps Portuguese labels for Portuguese users', async () => {
    await show('pt-BR');
    expect(await screen.findByText('Configuração detectada no Evo Hub')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum canal criado ainda.')).toBeInTheDocument();
  });
});

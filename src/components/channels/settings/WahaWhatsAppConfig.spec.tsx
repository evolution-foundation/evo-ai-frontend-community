import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({
  getQRCode: vi.fn(),
  logout: vi.fn(),
  getById: vi.fn(),
}));

vi.mock('@/services/channels/wahaService', () => ({
  default: { getQRCode: h.getQRCode, logout: h.logout, verifyConnection: vi.fn() },
}));

vi.mock('@/services/channels/inboxesService', () => ({
  default: { getById: h.getById },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import WahaWhatsAppConfig from './WahaWhatsAppConfig';

const makeInbox = (overrides: Record<string, unknown> = {}) => ({
  id: 'inbox-1',
  name: 'WAHA channel',
  phone_number: '+5511999999999',
  provider: 'waha',
  provider_config: {
    base_url: 'https://waha.example.com',
    api_key: 'secret',
    session_name: 'default',
  },
  provider_connection: { connection: 'close' },
  ...overrides,
});

const inboxResponse = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  data: makeInbox(overrides),
  meta: {},
  message: '',
});

const renderConfig = () => render(<WahaWhatsAppConfig inbox={makeInbox()} onUpdate={vi.fn()} />);

const CONNECT_BUTTON = /settings\.configuration\.whatsapp\.instance\.connectDevice/;

beforeEach(() => {
  vi.clearAllMocks();
  h.getById.mockResolvedValue(inboxResponse());
});

describe('WahaWhatsAppConfig', () => {
  it('offers the connect action when the session is not connected and shows the QR it fetches', async () => {
    const user = userEvent.setup();
    h.getQRCode.mockResolvedValue({ qr_data_url: 'data:image/png;base64,AAA' });

    renderConfig();

    const connectButton = await screen.findByRole('button', { name: CONNECT_BUTTON });
    await user.click(connectButton);

    await waitFor(() => expect(h.getQRCode).toHaveBeenCalledWith('inbox-1'));
    const qr = await screen.findByAltText('QR Code');
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,AAA');
  });

  it('hides the connect action once the polled inbox reports an open session', async () => {
    h.getById.mockResolvedValue(inboxResponse({ provider_connection: { connection: 'open' } }));

    renderConfig();

    expect(
      await screen.findByText('settings.configuration.whatsapp.instance.statusConnected'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: CONNECT_BUTTON }),
    ).not.toBeInTheDocument();
  });

  it('disconnects the session through WahaService.logout after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    h.logout.mockResolvedValue({});

    renderConfig();

    const disconnect = await screen.findByRole('button', {
      name: /settings\.configuration\.whatsapp\.instance\.actions\.disconnect/,
    });
    await user.click(disconnect);

    await waitFor(() => expect(h.logout).toHaveBeenCalledWith('inbox-1'));
  });
});

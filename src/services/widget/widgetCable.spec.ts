import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const created = vi.hoisted(() => ({ urls: [] as string[], subscriptions: [] as unknown[] }));
vi.mock('@rails/actioncable', () => ({
  createConsumer: (url: string) => {
    created.urls.push(url);
    return {
      subscriptions: {
        create: (params: unknown) => {
          created.subscriptions.push(params);
          return { unsubscribe: vi.fn(), perform: vi.fn(), send: vi.fn() };
        },
      },
      disconnect: vi.fn(),
    };
  },
}));

import { WidgetCable, resolveCableUrl } from './widgetCable';

// Under an embedding host VITE_API_URL is a path ("/crm-api"), which `new URL(path)` rejects.
describe('resolveCableUrl', () => {
  it('turns a path-only API base into an absolute cable URL under the current origin', () => {
    expect(resolveCableUrl('/crm-api', 'https://crm.agencia.com')).toBe('https://crm.agencia.com/crm-api/cable');
    expect(resolveCableUrl('/crm-api/', 'https://crm.agencia.com')).toBe('https://crm.agencia.com/crm-api/cable');
  });

  it('keeps an absolute API base as is (standalone community)', () => {
    expect(resolveCableUrl('http://localhost:3000', 'http://localhost:5173')).toBe('http://localhost:3000/cable');
  });

  it('falls back to the origin when the env is empty', () => {
    expect(resolveCableUrl(undefined, 'https://crm.agencia.com')).toBe('https://crm.agencia.com/cable');
  });
});

describe('WidgetCable', () => {
  beforeEach(() => {
    created.urls.length = 0;
    created.subscriptions.length = 0;
    vi.stubEnv('VITE_API_URL', '/crm-api');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('connects to the resolved cable URL and subscribes with pubsub_token AND website_token', () => {
    new WidgetCable('pub-1', {}, { websiteToken: 'wt-abc123' });

    expect(created.urls).toEqual([`${window.location.origin}/crm-api/cable`]);
    expect(created.subscriptions).toEqual([
      { channel: 'RoomChannel', pubsub_token: 'pub-1', website_token: 'wt-abc123' },
    ]);
  });

  it('omits website_token when not given (community parity)', () => {
    new WidgetCable('pub-1');
    expect(created.subscriptions).toEqual([{ channel: 'RoomChannel', pubsub_token: 'pub-1' }]);
  });

  it('honours an explicit cableUrl', () => {
    new WidgetCable('pub-1', {}, { cableUrl: 'wss://x.example/cable' });
    expect(created.urls).toEqual(['wss://x.example/cable']);
  });
});

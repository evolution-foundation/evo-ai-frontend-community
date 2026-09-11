import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/i18n/config', () => ({ default: { t: (k: string) => k } }));

import {
  extractWebsiteToken,
  generateWidgetScript,
  generateWidgetIframeEmbed,
  widgetOrigin,
} from './widgetHelpers';

// The script the backend generates: BASE_URL is the platform's FRONTEND_URL.
const BACKEND_SCRIPT = `
<script>
  (function(d,t) {
    var BASE_URL="https://portal.example.com";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.onload=function(){
      window.evolutionSDK.run({
        websiteToken: 'wt-abc123',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
</script>`;

const CONFIG = { position: 'right', type: 'standard', launcherTitle: 'Fale conosco' };

// CRM-605: the embeds point at the origin the agency is on, never at the
// platform the backend script names. A whitelabel host must not leak the portal.
describe('widgetHelpers — one origin for SDK and widget', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', '/crm-api');
    vi.stubGlobal('location', { ...window.location, origin: 'https://crm.agencia.com' });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('reads the website token out of the backend script', () => {
    expect(extractWebsiteToken(BACKEND_SCRIPT)).toBe('wt-abc123');
    expect(extractWebsiteToken('')).toBe('');
  });

  it('script embed: SDK and widget share the current origin, the platform URL never appears', () => {
    const out = generateWidgetScript(BACKEND_SCRIPT, CONFIG);

    expect(out).toContain("var SDK_BASE = 'https://crm.agencia.com'");
    expect(out).toContain("var WIDGET_BASE = 'https://crm.agencia.com'");
    expect(out).toContain("SDK_BASE + '/widget-sdk/sdk.min.js'");
    expect(out).toContain("websiteToken: 'wt-abc123'");
    expect(out).not.toContain('portal.example.com');
    expect(out).not.toContain('/packs/js/sdk.js');
  });

  it('script embed: apiBase is the API base the host runs on', () => {
    const out = generateWidgetScript(BACKEND_SCRIPT, CONFIG);
    expect(out).toContain('"apiBase":"/crm-api"');
  });

  it('iframe embed: same origin, token and api_base in the query', () => {
    const out = generateWidgetIframeEmbed(BACKEND_SCRIPT);

    expect(out).toContain('src="https://crm.agencia.com/widget?website_token=wt-abc123&api_base=%2Fcrm-api"');
    expect(out).not.toContain('portal.example.com');
  });

  it('falls back to a placeholder token when the backend script has none', () => {
    expect(generateWidgetIframeEmbed('<script></script>')).toContain('website_token=REPLACE_WITH_WEBSITE_TOKEN');
    expect(generateWidgetScript('', CONFIG)).toContain("websiteToken: 'REPLACE_WITH_WEBSITE_TOKEN'");
  });

  it('widgetOrigin is the browser origin', () => {
    expect(widgetOrigin()).toBe('https://crm.agencia.com');
  });
});

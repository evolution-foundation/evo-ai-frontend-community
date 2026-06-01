import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebhookConfiguration } from './WebhookConfiguration';
import '@/i18n/config';

// WebhookConfiguration auto-generates its trigger URL from the REAL journey id.
// journeyId optional and removed the campaign sentinel, so this pins
// both paths: a journey present → URL generated; no journey → no auto-URL (campaigns
// must not get a bogus .../trigger/<sentinel> URL).
vi.mock('@/hooks/useJourneyVariables', () => ({
  useJourneyVariables: () => ({
    variables: [],
    loading: false,
    error: null,
    fetchVariables: vi.fn(),
    updateVariables: vi.fn(),
    addVariable: vi.fn(),
    updateVariable: vi.fn(),
    deleteVariable: vi.fn(),
  }),
}));

function renderWebhook(journeyId?: string) {
  const onWebhookUrlChange = vi.fn();
  render(
    <WebhookConfiguration
      webhookUrl=""
      expectedHeaders={[]}
      onWebhookUrlChange={onWebhookUrlChange}
      onExpectedHeadersChange={vi.fn()}
      journeyId={journeyId}
    />,
  );
  return { onWebhookUrlChange };
}

describe('WebhookConfiguration — trigger URL generation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('auto-generates the journey trigger URL when a real journeyId is present', async () => {
    const { onWebhookUrlChange } = renderWebhook('journey-uuid-123');

    await waitFor(() => expect(onWebhookUrlChange).toHaveBeenCalledTimes(1));
    expect(onWebhookUrlChange.mock.calls[0][0]).toMatch(
      /\/api\/v1\/journeys\/trigger\/journey-uuid-123$/,
    );
  });

  it('does NOT auto-generate a URL when there is no journeyId (campaign context)', async () => {
    const { onWebhookUrlChange } = renderWebhook(undefined);

    // Give the effect a tick; it must stay silent without a journey (no sentinel URL).
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(onWebhookUrlChange).not.toHaveBeenCalled();
  });
});

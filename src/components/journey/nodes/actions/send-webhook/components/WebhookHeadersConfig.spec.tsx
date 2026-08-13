import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebhookHeadersConfig } from './WebhookHeadersConfig';
import type { SendWebhookNodeData } from '../SendWebhookNode';
import i18n from '@/i18n/config';

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

const j = (key: string) => i18n.t(`journey:${key}`);

function renderHeaders(headers: SendWebhookNodeData['headers']) {
  return render(
    <WebhookHeadersConfig
      data={{ headers } as SendWebhookNodeData}
      onChange={vi.fn()}
      journeyId="journey-1"
    />,
  );
}

describe('WebhookHeadersConfig — grupo nomeado só quando há headers', () => {
  it('names the header list as a group and pairs each row', () => {
    renderHeaders([{ key: 'x-token', value: 'abc' }]);

    const group = screen.getByRole('group', { name: j('panels.sendWebhook.headers.httpHeaders') });
    expect(within(group).getByLabelText(j('panels.sendWebhook.headers.headerName'))).toBeTruthy();
  });

  it('does not expose an empty group when there is no header', () => {
    renderHeaders([]);

    expect(
      screen.queryByRole('group', { name: j('panels.sendWebhook.headers.httpHeaders') }),
    ).toBeNull();
    expect(screen.getByText(j('panels.sendWebhook.headers.noHeadersConfigured'))).toBeTruthy();
  });
});

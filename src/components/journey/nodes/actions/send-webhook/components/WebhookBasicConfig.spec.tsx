import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebhookBasicConfig } from './WebhookBasicConfig';
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

// CRM-141: os 4 campos deste subcomponente tinham <Label> sem htmlFor. Cada
// getByLabelText abaixo quebra se o pareamento for desfeito.
describe('WebhookBasicConfig — Label pareado com o controle', () => {
  it('pairs url, method, timeout and retry labels with their controls', () => {
    const data = {
      webhookUrl: 'https://example.test/hook',
      method: 'PUT',
      timeout: 42,
      retryAttempts: 3,
    } as SendWebhookNodeData;

    render(<WebhookBasicConfig data={data} onChange={vi.fn()} journeyId="journey-1" />);

    expect(
      (screen.getByLabelText(j('panels.sendWebhook.basic.endpointUrl')) as HTMLInputElement).value,
    ).toBe('https://example.test/hook');
    expect(
      (screen.getByLabelText(j('panels.sendWebhook.basic.timeout')) as HTMLInputElement).value,
    ).toBe('42');
    expect(
      (screen.getByLabelText(j('panels.sendWebhook.basic.retryAttempts')) as HTMLInputElement).value,
    ).toBe('3');

    const method = screen.getByLabelText(j('panels.sendWebhook.basic.httpMethod'));
    expect(method.getAttribute('role')).toBe('combobox');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JourneyModal from './JourneyModal';

vi.mock('@/services', () => ({
  journeyService: {
    createJourney: vi.fn().mockResolvedValue({}),
    updateJourney: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'pt-BR',
    changeLanguage: () => undefined,
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { journeyService } from '@/services';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

const existingJourney = {
  id: 'j1',
  name: 'My Journey',
  description: 'desc',
  isActive: true,
  flowData: {
    nodes: [
      { id: 'journey-trigger-node', type: 'journey-trigger-node' },
      { id: 'send-1', type: 'send-message-node' },
      { id: 'exit-1', type: 'exit-journey-node' },
    ],
    edges: [{ id: 't-s', source: 'journey-trigger-node', target: 'send-1' }],
    variables: [{ name: 'v1' }],
  },
} as never;

describe('JourneyModal — EVO-1745 (do not wipe the flow on metadata edit)', () => {
  it('updates an existing journey WITHOUT resending flowData/flowTriggers', async () => {
    render(
      <JourneyModal open journey={existingJourney} onClose={() => undefined} onSave={() => undefined} />,
    );

    fireEvent.click(screen.getByText('modal.edit.button'));

    await waitFor(() => {
      expect(journeyService.updateJourney).toHaveBeenCalledTimes(1);
    });
    const [id, payload] = vi.mocked(journeyService.updateJourney).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(id).toBe('j1');
    expect(payload).toMatchObject({ name: 'My Journey', isActive: true });
    expect(payload).not.toHaveProperty('flowData');
    expect(payload).not.toHaveProperty('flowTriggers');
    expect(journeyService.createJourney).not.toHaveBeenCalled();
  });

  it('creates a new journey WITH the default trigger-only flowData', async () => {
    render(
      <JourneyModal open journey={null} onClose={() => undefined} onSave={() => undefined} />,
    );

    fireEvent.change(screen.getByPlaceholderText('modal.fields.name.placeholder'), {
      target: { value: 'New Journey' },
    });
    fireEvent.click(screen.getByText('modal.create.button'));

    await waitFor(() => {
      expect(journeyService.createJourney).toHaveBeenCalledTimes(1);
    });
    const [payload] = vi.mocked(journeyService.createJourney).mock.calls[0] as [
      { name: string; flowData: { nodes: Array<{ type: string }> } },
    ];
    expect(payload).toMatchObject({ name: 'New Journey' });
    expect(payload.flowData.nodes[0].type).toBe('journey-trigger-node');
    expect(journeyService.updateJourney).not.toHaveBeenCalled();
  });
});

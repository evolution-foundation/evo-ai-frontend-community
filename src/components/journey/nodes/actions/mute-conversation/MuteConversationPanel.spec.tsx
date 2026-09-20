import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MuteConversationPanel } from './MuteConversationPanel';
import { MuteConversationNodeData } from './MuteConversationNode';
import i18n from '@/i18n/config';

vi.mock('@/services/automation/automationService', () => ({
  automationService: { getFormData: vi.fn() },
}));

import { automationService } from '@/services/automation/automationService';

const mockGetFormData = automationService.getFormData as unknown as ReturnType<typeof vi.fn>;

function makeData(overrides: Partial<MuteConversationNodeData> = {}): MuteConversationNodeData {
  return { label: 'Mute Conversation', ...overrides };
}

afterEach(() => {
  vi.clearAllMocks();
});

const j = (key: string) => i18n.t(`journey:${key}`);

describe('MuteConversationPanel — no auto-persist on load', () => {
  it('does not call onUpdate merely from loading form data', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: [{ id: 1 }], teams: [{ id: 2 }] });
    const onUpdate = vi.fn();

    render(
      <MuteConversationPanel nodeId="n1" data={makeData()} onUpdate={onUpdate} onClose={vi.fn()} />,
    );

    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('MuteConversationPanel — Save never enables', () => {
  it('keeps Save disabled after the form data finishes loading', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: [], teams: [] });

    render(
      <MuteConversationPanel nodeId="n1" data={makeData()} onUpdate={vi.fn()} onClose={vi.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: j('panels.actions.cancel') })).not.toBeDisabled(),
    );
    expect(screen.getByRole('button', { name: j('panels.actions.save') })).toBeDisabled();
  });
});

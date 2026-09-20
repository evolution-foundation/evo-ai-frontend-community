import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeferConversationPanel } from './DeferConversationPanel';
import { DeferConversationNodeData } from './DeferConversationNode';
import '@/i18n/config';

vi.mock('@/services/automation/automationService', () => ({
  automationService: { getFormData: vi.fn() },
}));

import { automationService } from '@/services/automation/automationService';

const mockGetFormData = automationService.getFormData as unknown as ReturnType<typeof vi.fn>;

function makeData(overrides: Partial<DeferConversationNodeData> = {}): DeferConversationNodeData {
  return { label: 'Defer Conversation', ...overrides };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('DeferConversationPanel — no auto-persist on load', () => {
  it('does not call onUpdate merely from loading form data', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: [{ id: 1 }], teams: [{ id: 2 }] });
    const onUpdate = vi.fn();

    render(
      <DeferConversationPanel
        nodeId="n1"
        data={makeData()}
        onUpdate={onUpdate}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

// getByLabelText only resolves if the <Label> is actually paired to its
// control (htmlFor/id, aria-labelledby, or wrapping) — these fail against the
// pre-fix markup even though the label text is visibly right next to the field.
describe('DeferConversationPanel — labels are paired to their controls', () => {
  it('exposes the deferment type select via its label', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: [], teams: [] });
    render(
      <DeferConversationPanel nodeId="n1" data={makeData()} onUpdate={vi.fn()} onClose={vi.fn()} />,
    );
    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());

    expect(screen.getByLabelText('Deferment type')).toBeTruthy();
  });

  it('exposes the duration input via its label', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: [], teams: [] });
    render(
      <DeferConversationPanel
        nodeId="n1"
        data={makeData({ snooze_type: 'duration' })}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());

    expect(screen.getByLabelText('Duration (hours)')).toBeTruthy();
  });

  it('exposes the until-date input via its label', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: [], teams: [] });
    render(
      <DeferConversationPanel
        nodeId="n1"
        data={makeData({ snooze_type: 'until_date' })}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());

    expect(screen.getByLabelText('Date and time')).toBeTruthy();
  });
});

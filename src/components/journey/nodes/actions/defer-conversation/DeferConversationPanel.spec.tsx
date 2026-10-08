import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
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

describe('DeferConversationPanel — until-date in local time', () => {
  const originalTZ = process.env.TZ;
  process.env.TZ = 'America/Sao_Paulo';

  afterAll(() => {
    process.env.TZ = originalTZ;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const snoozeUntil = '2099-03-10T11:40:00.000Z';

  it('runs in a timezone other than UTC', () => {
    expect(new Date(snoozeUntil).getTimezoneOffset()).toBe(180);
  });

  it('fills the field with the local time of snooze_until', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: [], teams: [] });
    render(
      <DeferConversationPanel
        nodeId="n1"
        data={makeData({ snooze_type: 'until_date', snooze_until: snoozeUntil })}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());

    expect(screen.getByLabelText('Date and time')).toHaveValue('2099-03-10T08:40');
  });

  it('saves the time typed by the user', async () => {
    mockGetFormData.mockResolvedValueOnce({ agents: [], teams: [] });
    const onUpdate = vi.fn();
    render(
      <DeferConversationPanel
        nodeId="n1"
        data={makeData({ snooze_type: 'until_date', snooze_until: snoozeUntil })}
        onUpdate={onUpdate}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Date and time'), { target: { value: '2099-03-10T09:15' } });
    fireEvent.click(await screen.findByRole('button', { name: /save/i }));

    expect(onUpdate).toHaveBeenCalledWith(
      'n1',
      expect.objectContaining({ snooze_until: '2099-03-10T12:15:00.000Z' }),
    );
  });

  it('defaults to one hour from now in local time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-06T13:00:00.000Z'));
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

    expect(screen.getByLabelText('Date and time')).toHaveValue('2026-10-06T11:00');
  });
});

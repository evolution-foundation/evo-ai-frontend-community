import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendTranscriptPanel } from './SendTranscriptPanel';
import { SendTranscriptNodeData } from './SendTranscriptNode';
import '@/i18n/config';

vi.mock('@/services/automation/automationService', () => ({
  automationService: { getFormData: vi.fn() },
}));

import { automationService } from '@/services/automation/automationService';

const mockGetFormData = automationService.getFormData as unknown as ReturnType<typeof vi.fn>;

function makeData(overrides: Partial<SendTranscriptNodeData> = {}): SendTranscriptNodeData {
  return { label: 'Send Transcript', ...overrides };
}

afterEach(() => {
  vi.clearAllMocks();
});

// The panel used to call onUpdate as soon as formDataOptions loaded — opening it
// without touching anything marked the node dirty. Same effect shape the AssignTeam/
// AssignAgent panels had removed for causing an infinite render loop (4714337).
describe('SendTranscriptPanel — no auto-persist on load', () => {
  it('does not call onUpdate merely from loading form data', async () => {
    mockGetFormData.mockResolvedValueOnce({ teams: [{ id: 1, name: 'T' }], agents: [] });
    const onUpdate = vi.fn();

    render(
      <SendTranscriptPanel nodeId="n1" data={makeData()} onUpdate={onUpdate} onClose={vi.fn()} />,
    );

    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

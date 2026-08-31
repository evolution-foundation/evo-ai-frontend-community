import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangePriorityPanel } from './ChangePriorityPanel';
import { ChangePriorityNodeData } from './ChangePriorityNode';
import '@/i18n/config';

vi.mock('@/services/automation/automationService', () => ({
  automationService: { getFormData: vi.fn() },
}));

import { automationService } from '@/services/automation/automationService';

const mockGetFormData = automationService.getFormData as unknown as ReturnType<typeof vi.fn>;

function makeData(overrides: Partial<ChangePriorityNodeData> = {}): ChangePriorityNodeData {
  return { label: 'Change Priority', ...overrides };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ChangePriorityPanel — no auto-persist on load', () => {
  it('does not call onUpdate merely from loading form data', async () => {
    mockGetFormData.mockResolvedValueOnce({});
    const onUpdate = vi.fn();

    render(
      <ChangePriorityPanel nodeId="n1" data={makeData()} onUpdate={onUpdate} onClose={vi.fn()} />,
    );

    await waitFor(() => expect(mockGetFormData).toHaveBeenCalled());
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EnvironmentManager } from './EnvironmentManager';
import '@/i18n/config';

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

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { toast } from 'sonner';

// window.alert blocks the whole tab and doesn't match the rest of the app's
// feedback surface — replaced with sonner's toast.error, same as every other
// validation message in this file.
describe('EnvironmentManager — validation uses toast, not window.alert', () => {
  it('shows a toast (not a native alert) when creating a variable without a name', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();

    render(<EnvironmentManager journeyId="journey-1" />);

    await user.click(screen.getByRole('button', { name: /ENV/ }));
    await user.click(await screen.findByRole('tab', { name: /Your Variables/ }));
    await user.click(await screen.findByRole('button', { name: 'New Variable' }));
    await user.click(screen.getByRole('button', { name: 'Create Variable' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Variable name is required'),
    );
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});

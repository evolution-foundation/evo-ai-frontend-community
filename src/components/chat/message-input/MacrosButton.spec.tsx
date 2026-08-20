import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    // Echo the key plus the interpolated ids so an assertion can tell the toasts apart.
    t: (key: string, vars?: Record<string, unknown>) =>
      vars?.ids ? `${key}:${String(vars.ids)}` : key,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/services/macros/macrosService', () => ({
  macrosService: { getMacros: vi.fn(), executeMacro: vi.fn() },
}));

import MacrosButton from './MacrosButton';
import { macrosService } from '@/services/macros/macrosService';
import { toast } from 'sonner';

const MACRO = { id: 'macro-1', name: 'Boas-vindas', actions: [{ action_name: 'add_label' }] };

// Walks the real flow: open the popover, pick the macro, confirm the dialog.
async function runMacro() {
  render(<MacrosButton conversationId="conv-1" />);

  fireEvent.click(screen.getByTitle('messageInput.macros.tooltip'));
  fireEvent.click(await screen.findByText(MACRO.name));
  fireEvent.click(await screen.findByText('contactSidebar.macros.dialog.execute'));

  await waitFor(() => expect(macrosService.executeMacro).toHaveBeenCalled());
}

describe('MacrosButton — CRM-152 execution feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(macrosService.getMacros).mockResolvedValue({ data: [MACRO] } as never);
  });

  // The bug: `executions.some(...)` over [] is false for both failure and pending, so
  // an empty list fell through to the success branch and painted the toast green.
  it('never shows the success toast when nothing executed', async () => {
    vi.mocked(macrosService.executeMacro).mockResolvedValue({
      data: { macro_id: 'macro-1', executions: [] },
    } as never);

    await runMacro();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  // The backend answers 404 for that case, which axios rejects — same outcome required.
  it('shows the error toast when the request rejects', async () => {
    vi.mocked(macrosService.executeMacro).mockRejectedValue(new Error('Request failed'));

    await runMacro();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('warns instead of celebrating when part of the conversations did not resolve', async () => {
    vi.mocked(macrosService.executeMacro).mockResolvedValue({
      data: {
        executions: [{ id: 'e1', conversation_id: 'conv-1', status: 'completed' }],
        unresolved_conversation_ids: ['404-a', '404-b'],
      },
    } as never);

    await runMacro();

    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        'contactSidebar.macros.executeUnresolved:404-a, 404-b',
      ),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  // A failure and an unresolved id are independent facts: an exclusive chain would
  // report one and swallow the other.
  it('reports the failure AND the unresolved ids together', async () => {
    vi.mocked(macrosService.executeMacro).mockResolvedValue({
      data: {
        executions: [{ id: 'e1', conversation_id: 'conv-1', status: 'failed', actions_result: [] }],
        unresolved_conversation_ids: ['404-a'],
      },
    } as never);

    await runMacro();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.warning).toHaveBeenCalledWith('contactSidebar.macros.executeUnresolved:404-a');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('still celebrates a clean run', async () => {
    vi.mocked(macrosService.executeMacro).mockResolvedValue({
      data: {
        executions: [{ id: 'e1', conversation_id: 'conv-1', status: 'completed' }],
        unresolved_conversation_ids: [],
      },
    } as never);

    await runMacro();

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });
});

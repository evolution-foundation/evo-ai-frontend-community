import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    // Echo the key plus the count so assertions can tell the toasts apart.
    t: (key: string, vars?: Record<string, unknown>) =>
      vars?.count === undefined ? key : `${key}:${String(vars.count)}`,
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

  it('never shows the success toast when nothing executed', async () => {
    vi.mocked(macrosService.executeMacro).mockResolvedValue({
      data: { macro_id: 'macro-1', executions: [] },
    } as never);

    await runMacro();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

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
        unresolved_conversation_count: 2,
      },
    } as never);

    await runMacro();

    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith('contactSidebar.macros.executeUnresolved:2'),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('reports the failure AND the unresolved count together', async () => {
    vi.mocked(macrosService.executeMacro).mockResolvedValue({
      data: {
        executions: [{ id: 'e1', conversation_id: 'conv-1', status: 'failed', actions_result: [] }],
        unresolved_conversation_count: 1,
      },
    } as never);

    await runMacro();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.warning).toHaveBeenCalledWith('contactSidebar.macros.executeUnresolved:1');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('warns about the unresolved count even when nothing executed', async () => {
    vi.mocked(macrosService.executeMacro).mockResolvedValue({
      data: { executions: [], unresolved_conversation_count: 3 },
    } as never);

    await runMacro();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.warning).toHaveBeenCalledWith('contactSidebar.macros.executeUnresolved:3');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('still celebrates a clean run', async () => {
    vi.mocked(macrosService.executeMacro).mockResolvedValue({
      data: {
        executions: [{ id: 'e1', conversation_id: 'conv-1', status: 'completed' }],
        unresolved_conversation_count: 0,
      },
    } as never);

    await runMacro();

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });
});

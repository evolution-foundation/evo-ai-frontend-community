import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pipelines from './Pipelines';
import { Pipeline } from '@/types/analytics';

// EVO-2122: deactivating a pipeline used to be a silent no-op. Now that it persists,
// the management screen is the only place a deactivated pipeline stays reachable —
// it must opt into include_inactive, and the toast must report what the API saved.
const inactivePipeline: Pipeline = {
  id: 'p-inactive',
  name: 'Retired funnel',
  description: null,
  pipeline_type: 'sales',
  visibility: 'public',
  is_active: false,
  is_default: false,
  custom_fields: { attributes: [] },
  item_count: 0,
  conversations_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  stages: [],
} as unknown as Pipeline;

const getPipelines = vi.fn();
const togglePipelineStatus = vi.fn();
const getDependents = vi.fn();
const success = vi.fn();
const error = vi.fn();
const deletePipeline = vi.fn();

vi.mock('@/services/pipelines', () => ({
  pipelinesService: {
    getPipelines: (...args: unknown[]) => getPipelines(...args),
    togglePipelineStatus: (...args: unknown[]) => togglePipelineStatus(...args),
    getDependents: (...args: unknown[]) => getDependents(...args),
    updatePipeline: vi.fn(),
    deletePipeline: (...args: unknown[]) => deletePipeline(...args),
    duplicatePipeline: vi.fn(),
    setAsDefault: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => success(...args),
    error: (...args: unknown[]) => error(...args),
  },
}));

// Mutable so the CRM-495 example can flip the verdict between two renders of the
// same instance, which is the whole point: no remount is allowed to be the fix.
let canRead = true;

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => canRead, isReady: true, loading: false }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/tours', () => ({
  PipelinesTour: () => null,
}));

// The row action menu is an unlabelled icon button; anchor on the ARIA contract
// (aria-haspopup="menu") instead of the design-system's internal markup.
async function clickActivate() {
  await screen.findByText('Retired funnel');

  const [trigger] = screen
    .getAllByRole('button')
    .filter(button => button.getAttribute('aria-haspopup') === 'menu');

  await userEvent.click(trigger);
  await userEvent.click(await screen.findByText('pipelinesTable.actions.activate'));
}

describe('Pipelines management screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canRead = true;
    getPipelines.mockResolvedValue({ data: [inactivePipeline], meta: {} });
    togglePipelineStatus.mockResolvedValue({ ...inactivePipeline, is_active: true });
  });

  // CRM-495: the screen used to read the permission once, on the first render where
  // it was ready, and a false answered before the grants landed stuck until remount.
  it('loads on its own when the read permission lands after the first render (CRM-495)', async () => {
    canRead = false;
    const { rerender } = render(<Pipelines />);

    await waitFor(() => expect(error).toHaveBeenCalledWith('messages.noPermissionRead'));
    expect(getPipelines).not.toHaveBeenCalled();

    canRead = true;
    rerender(<Pipelines />);

    await waitFor(() => expect(getPipelines).toHaveBeenCalledTimes(1));
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('asks the API for inactive pipelines too (AC2, AC3)', async () => {
    render(<Pipelines />);

    await waitFor(() => expect(getPipelines).toHaveBeenCalled());
    expect(getPipelines).toHaveBeenCalledWith(
      expect.objectContaining({ include_inactive: true }),
    );
  });

  it('lists a deactivated pipeline with the inactive badge (AC2)', async () => {
    render(<Pipelines />);

    expect(await screen.findByText('Retired funnel')).toBeInTheDocument();
    expect(screen.getByText('pipelinesTable.status.inactive')).toBeInTheDocument();
  });

  it('reports no success when the API did not persist the requested state (AC4)', async () => {
    // The API answers with is_active still false: the "Activate" click did not take effect.
    togglePipelineStatus.mockResolvedValue({ ...inactivePipeline, is_active: false });
    render(<Pipelines />);

    await clickActivate();

    await waitFor(() => expect(error).toHaveBeenCalledWith('messages.toggleError'));
    expect(success).not.toHaveBeenCalled();
  });

  it('reports success when the API persisted the requested state (AC3)', async () => {
    togglePipelineStatus.mockResolvedValue({ ...inactivePipeline, is_active: true });
    render(<Pipelines />);

    await clickActivate();

    await waitFor(() => expect(success).toHaveBeenCalledWith('messages.activateSuccess'));
    expect(error).not.toHaveBeenCalled();
  });

  // EVO-2205: the delete error used to be swallowed into a generic toast. The specific
  // "still has active items" reason must reach the user.
  describe('delete error handling', () => {
    async function clickDelete() {
      const [trigger] = screen
        .getAllByRole('button')
        .filter(button => button.getAttribute('aria-haspopup') === 'menu');
      await userEvent.click(trigger);
      await userEvent.click(await screen.findByText('pipelinesTable.actions.delete'));
      await userEvent.click(await screen.findByText('dialog.deletePipeline.delete'));
    }

    it('surfaces the active-items reason for the specific backend code', async () => {
      // The full envelope Api::V1::PipelinesController#destroy renders — `success: false`
      // included, since that is what marks the standard error format.
      deletePipeline.mockRejectedValue({
        response: {
          status: 422,
          data: {
            success: false,
            error: {
              code: 'CANNOT_DELETE_PIPELINE_WITH_CONVERSATIONS',
              message: 'Cannot delete pipeline with active items',
            },
          },
        },
      });
      render(<Pipelines />);
      await screen.findByText('Retired funnel');

      await clickDelete();

      await waitFor(() =>
        expect(error).toHaveBeenCalledWith('messages.deleteBlockedActiveItems'),
      );
      expect(success).not.toHaveBeenCalled();
    });

    it('falls back to the generic message for any other failure', async () => {
      deletePipeline.mockRejectedValue(new Error('network'));
      render(<Pipelines />);
      await screen.findByText('Retired funnel');

      await clickDelete();

      await waitFor(() => expect(error).toHaveBeenCalledWith('messages.deleteError'));
      expect(success).not.toHaveBeenCalled();
    });
  });

  // EVO-2200: deactivating hid the pipeline while its capture forms kept feeding it.
  describe('deactivation confirmation', () => {
    const activePipeline = { ...inactivePipeline, is_active: true, name: 'Live funnel' };

    async function clickDeactivate() {
      const [trigger] = screen
        .getAllByRole('button')
        .filter(button => button.getAttribute('aria-haspopup') === 'menu');

      await userEvent.click(trigger);
      await userEvent.click(await screen.findByText('pipelinesTable.actions.deactivate'));
    }

    beforeEach(() => {
      getPipelines.mockResolvedValue({ data: [activePipeline], meta: {} });
      togglePipelineStatus.mockResolvedValue({ ...activePipeline, is_active: false });
      getDependents.mockResolvedValue({
        inspected: ['crm_forms'],
        count: 0,
        published_count: 0,
        names_redacted: false,
        crm_forms: [],
      });
    });

    it('does not deactivate before the user confirms', async () => {
      render(<Pipelines />);
      await screen.findByText('Live funnel');

      await clickDeactivate();

      await screen.findByText('dialog.deactivatePipeline.title');
      expect(togglePipelineStatus).not.toHaveBeenCalled();
    });

    it('names the capture forms that still feed the pipeline', async () => {
      getDependents.mockResolvedValue({
        inspected: ['crm_forms'],
        count: 1,
        published_count: 1,
        names_redacted: false,
        crm_forms: [
          { id: 'f1', name: 'Landing page', title: null, published: true, via: 'default' },
        ],
      });
      render(<Pipelines />);
      await screen.findByText('Live funnel');

      await clickDeactivate();

      expect(await screen.findByText(/Landing page/)).toBeInTheDocument();
      // The dialog must not read as an all-clear for automations and journeys.
      expect(screen.getByText('dialog.deactivatePipeline.partialWarning')).toBeInTheDocument();
    });

    it('deactivates once confirmed', async () => {
      render(<Pipelines />);
      await screen.findByText('Live funnel');
      await clickDeactivate();

      await userEvent.click(await screen.findByText('dialog.deactivatePipeline.confirm'));

      await waitFor(() => expect(togglePipelineStatus).toHaveBeenCalledWith('p-inactive', false));
      await waitFor(() => expect(success).toHaveBeenCalledWith('messages.deactivateSuccess'));
    });

    // The confirmation is a courtesy: a failing lookup must not strand the user — but the
    // silence must not read as "nothing depends on this pipeline" either.
    it('says so when the dependency lookup fails, and still lets the user decide', async () => {
      getDependents.mockRejectedValue(new Error('boom'));
      render(<Pipelines />);
      await screen.findByText('Live funnel');

      await clickDeactivate();

      expect(
        await screen.findByText('dialog.deactivatePipeline.lookupFailed'),
      ).toBeInTheDocument();

      await userEvent.click(await screen.findByText('dialog.deactivatePipeline.confirm'));

      await waitFor(() => expect(togglePipelineStatus).toHaveBeenCalled());
    });

    it('counts only published forms in the heading', async () => {
      getDependents.mockResolvedValue({
        inspected: ['crm_forms'],
        count: 3,
        published_count: 1,
        names_redacted: false,
        crm_forms: [
          { id: 'f1', name: 'Live one', title: null, published: true, via: 'default' },
          { id: 'f2', name: 'Draft one', title: null, published: false, via: 'default' },
          { id: 'f3', name: 'Draft two', title: null, published: false, via: 'routing_rule' },
        ],
      });
      render(<Pipelines />);
      await screen.findByText('Live funnel');

      await clickDeactivate();

      // A draft form does not receive submissions, so it must not inflate the alarm.
      await waitFor(() =>
        expect(getDependents).toHaveBeenCalled(),
      );
      expect(await screen.findByText(/Draft one/)).toBeInTheDocument();
      expect(screen.getByText(/Draft two/).textContent).toMatch(/viaRoutingRule/);
    });

    it('falls back to the count when the caller cannot see form names', async () => {
      getDependents.mockResolvedValue({
        inspected: ['crm_forms'],
        count: 2,
        published_count: 2,
        names_redacted: true,
        crm_forms: [],
      });
      render(<Pipelines />);
      await screen.findByText('Live funnel');

      await clickDeactivate();

      expect(
        await screen.findByText('dialog.deactivatePipeline.namesRedacted'),
      ).toBeInTheDocument();
    });

    // The empty result is the case most likely to read as an all-clear, so the caveat
    // that automations and journeys were not inspected must show there too (EVO-2200).
    it('still states automations and journeys were not inspected when nothing feeds it', async () => {
      render(<Pipelines />);
      await screen.findByText('Live funnel');

      await clickDeactivate();

      expect(
        await screen.findByText('dialog.deactivatePipeline.noForms'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('dialog.deactivatePipeline.partialWarning'),
      ).toBeInTheDocument();
    });

    it('activating skips the confirmation entirely', async () => {
      getPipelines.mockResolvedValue({ data: [inactivePipeline], meta: {} });
      togglePipelineStatus.mockResolvedValue({ ...inactivePipeline, is_active: true });
      render(<Pipelines />);
      await screen.findByText('Retired funnel');

      await clickActivate();

      await waitFor(() => expect(togglePipelineStatus).toHaveBeenCalled());
      expect(getDependents).not.toHaveBeenCalled();
    });
  });
});

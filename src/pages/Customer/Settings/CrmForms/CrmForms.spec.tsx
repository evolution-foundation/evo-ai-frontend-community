import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import CrmForms from './CrmForms';
import type { CrmForm, FormLead } from '@/types/crmForms';
import type { Pipeline } from '@/types/analytics/pipelines';

// EVO-2200: a capture form whose destination pipeline was archived used to resolve to
// nothing and say nothing. The screen must flag it — the operator fixes the binding
// instead of discovering it through a lead that never showed up where expected.
const ACTIVE_PIPELINE = { id: 'pipe-active', name: 'Sales', is_active: true } as Pipeline;
const ARCHIVED_PIPELINE = { id: 'pipe-archived', name: 'Retired', is_active: false } as Pipeline;

function buildForm(overrides: Partial<CrmForm> = {}): CrmForm {
  return {
    id: 'form-1',
    name: 'Website Contact',
    title: 'Website Contact',
    slug: 'website-contact',
    published: true,
    default_pipeline_id: ACTIVE_PIPELINE.id,
    leads_count: 0,
    ...overrides,
  } as CrmForm;
}

const list = vi.fn();
const getPipelines = vi.fn();
const getLeads = vi.fn();

vi.mock('@/services/crmForms/crmFormsService', () => ({
  crmFormsService: {
    list: (...args: unknown[]) => list(...args),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getLeads: (...args: unknown[]) => getLeads(...args),
  },
}));

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: (...args: unknown[]) => getPipelines(...args),
  },
}));

vi.mock('@/services/customAttributes/customAttributesService', () => ({
  customAttributesService: {
    getCustomAttributes: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true, loading: false }),
}));

// Stable identity on purpose: loadForms is a useCallback that depends on `t`, so a fresh
// function per render would re-trigger the fetch effect forever and pin the screen on its
// loading state.
const LANGUAGE = { t: (key: string) => key, currentLanguage: 'en' };

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => LANGUAGE,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('Capture forms screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue({ data: [buildForm()], meta: { page: 1, page_size: 25, total: 1 } });
    getPipelines.mockResolvedValue({ data: [ACTIVE_PIPELINE, ARCHIVED_PIPELINE] });
  });

  // Without opting in, the archived destination is absent from the list the screen holds,
  // and the form silently resolves to nothing instead of being flagged.
  it('asks the API for archived pipelines too', async () => {
    render(<CrmForms />);

    await waitFor(() => expect(getPipelines).toHaveBeenCalled());
    expect(getPipelines).toHaveBeenCalledWith(expect.objectContaining({ include_inactive: true }));
  });

  it('flags a form whose destination pipeline is archived', async () => {
    list.mockResolvedValue({
      data: [buildForm({ default_pipeline_id: ARCHIVED_PIPELINE.id })],
      meta: { page: 1, page_size: 25, total: 1 },
    });

    render(<CrmForms />);

    expect(await screen.findByText('Website Contact')).toBeInTheDocument();
    expect(await screen.findByText('status.archivedPipeline')).toBeInTheDocument();
  });

  it('leaves a form pointing at an active pipeline unflagged', async () => {
    render(<CrmForms />);

    expect(await screen.findByText('Website Contact')).toBeInTheDocument();
    await waitFor(() => expect(getPipelines).toHaveBeenCalled());
    expect(screen.queryByText('status.archivedPipeline')).not.toBeInTheDocument();
  });

  it('keeps showing the published status alongside the warning', async () => {
    list.mockResolvedValue({
      data: [buildForm({ default_pipeline_id: ARCHIVED_PIPELINE.id, published: true })],
      meta: { page: 1, page_size: 25, total: 1 },
    });

    render(<CrmForms />);

    expect(await screen.findByText('status.archivedPipeline')).toBeInTheDocument();
    expect(screen.getByText('status.published')).toBeInTheDocument();
  });

  // A form can keep an active default but route some leads into an archived pipeline via a
  // rule — the same path the deactivation lookup covers, so the badge must catch it too.
  it('flags a form that routes to an archived pipeline through a rule', async () => {
    list.mockResolvedValue({
      data: [
        buildForm({
          default_pipeline_id: ACTIVE_PIPELINE.id,
          routing_rules: [
            { field: 'plan', op: 'equals', value: 'gold', pipeline_id: ARCHIVED_PIPELINE.id },
          ],
        }),
      ],
      meta: { page: 1, page_size: 25, total: 1 },
    });

    render(<CrmForms />);

    expect(await screen.findByText('Website Contact')).toBeInTheDocument();
    expect(await screen.findByText('status.archivedPipeline')).toBeInTheDocument();
  });

  // Negative control for the rule path: an active default plus a rule to another active
  // pipeline must stay unflagged, so the badge is not just always-on.
  it('leaves a form whose rule targets an active pipeline unflagged', async () => {
    list.mockResolvedValue({
      data: [
        buildForm({
          default_pipeline_id: ACTIVE_PIPELINE.id,
          routing_rules: [
            { field: 'plan', op: 'equals', value: 'gold', pipeline_id: ACTIVE_PIPELINE.id },
          ],
        }),
      ],
      meta: { page: 1, page_size: 25, total: 1 },
    });

    render(<CrmForms />);

    expect(await screen.findByText('Website Contact')).toBeInTheDocument();
    await waitFor(() => expect(getPipelines).toHaveBeenCalled());
    expect(screen.queryByText('status.archivedPipeline')).not.toBeInTheDocument();
  });

  // EVO-2207: a lead is the contact, and its deal is optional — deleting the kanban card
  // leaves pipeline_item_id/pipeline_id/pipeline_stage_id null. The row still has to
  // render the person; only the destination column degrades.
  describe('leads dialog', () => {
    const LIVE_LEAD: FormLead = {
      id: 'contact-live',
      contact_id: 'contact-live',
      pipeline_item_id: 'item-1',
      contact: { id: 'contact-live', name: 'Ana Lima', email: 'ana@example.com' },
      pipeline_id: ACTIVE_PIPELINE.id,
      pipeline_stage_id: 'stage-1',
      created_at: '2026-07-20T10:00:00Z',
    };

    const DELETED_CARD_LEAD: FormLead = {
      id: 'contact-orphan',
      contact_id: 'contact-orphan',
      pipeline_item_id: null,
      contact: { id: 'contact-orphan', name: 'Bruno Sá', email: 'bruno@example.com' },
      pipeline_id: null,
      pipeline_stage_id: null,
      created_at: '2026-07-21T10:00:00Z',
    };

    async function openLeadsDialog() {
      list.mockResolvedValue({
        data: [buildForm({ leads_count: 2 })],
        meta: { page: 1, page_size: 25, total: 1 },
      });

      render(<CrmForms />);

      const counter = await screen.findByRole('button', { name: '2' });
      // openLeads resolves the fetch after the click returns; act() flushes it so the
      // dialog state settles inside the test instead of warning about it.
      await act(async () => {
        fireEvent.click(counter);
      });
    }

    it('renders a lead whose card was deleted, with the destination degraded', async () => {
      getLeads.mockResolvedValue({ leads: [DELETED_CARD_LEAD, LIVE_LEAD], count: 2 });

      await openLeadsDialog();

      expect(await screen.findByText('Bruno Sá')).toBeInTheDocument();
      expect(screen.getByText('bruno@example.com')).toBeInTheDocument();
      // the live lead still resolves its pipeline, so '—' is degradation, not a blank screen
      expect(screen.getByText(ACTIVE_PIPELINE.name)).toBeInTheDocument();
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('does not fall back to the empty state when every card was deleted', async () => {
      getLeads.mockResolvedValue({ leads: [DELETED_CARD_LEAD], count: 1 });

      await openLeadsDialog();

      expect(await screen.findByText('Bruno Sá')).toBeInTheDocument();
      expect(screen.queryByText('leads.empty')).not.toBeInTheDocument();
    });
  });
});

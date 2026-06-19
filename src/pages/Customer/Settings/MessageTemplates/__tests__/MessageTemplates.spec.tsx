import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  inboxes: [{ id: 'inbox-1', name: 'Main' }] as Array<{ id: string; name: string }>,
  service: {
    getTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'en',
    changeLanguage: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    isReady: true,
  }),
}));

vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: (selector: (s: unknown) => unknown) =>
    selector({ inboxes: h.inboxes, fetchInboxes: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/services/messageTemplates/globalMessageTemplatesService', () => ({
  default: h.service,
  providerToChannelType: (p: string) => (p === 'email' ? 'Channel::Email' : 'Channel::Api'),
  inferTemplateProvider: () => 'generic',
}));

import MessageTemplates from '../MessageTemplates';

beforeEach(() => {
  vi.clearAllMocks();
  h.inboxes = [{ id: 'inbox-1', name: 'Main' }];
  h.service.getTemplates.mockResolvedValue({
    success: true,
    data: [{ id: 't1', name: 'welcome', language: 'en_US', category: 'MARKETING' }],
    meta: {},
    message: '',
  });
});

describe('MessageTemplates page', () => {
  it('lists global templates from the flat endpoint (no inbox arg)', async () => {
    render(<MessageTemplates />);
    expect(await screen.findByText('welcome')).toBeInTheDocument();
    expect(h.service.getTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ sort_by: 'name' }),
    );
  });

  it('fetches exactly once on mount (no infinite render/fetch loop)', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    // Flush any stray effect re-runs that an unstable dependency would trigger.
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(h.service.getTemplates).toHaveBeenCalledTimes(1);
  });

  it('opens the create modal when "New Template" is clicked', async () => {
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    fireEvent.click(screen.getByText('newTemplate'));
    expect(await screen.findByText('form.createTitle')).toBeInTheDocument();
  });

  it('paginates: shows controls and refetches the next page', async () => {
    h.service.getTemplates.mockResolvedValue({
      success: true,
      data: [{ id: 't1', name: 'welcome', language: 'en_US', category: 'MARKETING' }],
      meta: { pagination: { total_pages: 2, total: 40, page_size: 20 } },
      message: '',
    });
    render(<MessageTemplates />);
    await screen.findByText('welcome');
    // BasePagination renders page-number buttons (1, 2) — click page 2.
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() =>
      expect(h.service.getTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });
});

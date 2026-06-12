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
      meta: { pagination: { total_pages: 2 } },
      message: '',
    });
    render(<MessageTemplates />);
    fireEvent.click(await screen.findByText('pagination.next'));
    await waitFor(() =>
      expect(h.service.getTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });
});

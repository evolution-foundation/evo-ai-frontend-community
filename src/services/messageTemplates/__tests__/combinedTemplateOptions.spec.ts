import { describe, it, expect, vi, beforeEach } from 'vitest';

const globalTemplatesMock = vi.hoisted(() => ({ getTemplates: vi.fn() }));
const inboxesMock = vi.hoisted(() => ({ list: vi.fn() }));
const channelTemplatesMock = vi.hoisted(() => ({ getTemplates: vi.fn() }));

vi.mock('@/services/messageTemplates/globalMessageTemplatesService', () => ({
  default: globalTemplatesMock,
  inferTemplateProvider: (template: { settings?: { global_provider?: string; subject?: string } }) => {
    const marker = template.settings?.global_provider;
    if (marker === 'email' || marker === 'generic') return marker;
    return template.settings?.subject ? 'email' : 'generic';
  },
}));

vi.mock('@/services/channels/inboxesService', () => ({ default: inboxesMock }));

vi.mock('@/services/channels/messageTemplatesService', () => ({ default: channelTemplatesMock }));

import { fetchCombinedTemplateOptions } from '../combinedTemplateOptions';

beforeEach(() => vi.clearAllMocks());

describe('fetchCombinedTemplateOptions', () => {
  it('merges channel-less templates with WhatsApp Cloud inbox templates', async () => {
    globalTemplatesMock.getTemplates.mockResolvedValue({
      success: true,
      data: [{ id: 'g1', name: 'Welcome', language: 'en', status: 'ACTIVE', content: 'Hi {{1}}!', settings: {} }],
    });
    inboxesMock.list.mockResolvedValue({
      success: true,
      data: [
        // Real API shape: every WhatsApp inbox (Cloud or not) shares the same
        // STI channel_type — the provider field only tells them apart, it
        // doesn't gate which ones can have templates (Evolution/Z-API/etc.
        // inboxes have real per-channel templates too, same as Cloud).
        { id: 'ib1', name: 'Support Line', channel_type: 'Channel::Whatsapp', provider: 'whatsapp_cloud' },
        { id: 'ib2', name: 'Old Number', channel_type: 'Channel::Whatsapp', provider: 'evolution' },
        { id: 'ib3', name: 'Support Email', channel_type: 'Channel::Email' },
      ],
    });
    channelTemplatesMock.getTemplates.mockImplementation((inboxId: string) => {
      if (inboxId === 'ib1') {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 'w1',
              name: 'boas_vindas_crm',
              language: 'pt_BR',
              status: 'APPROVED',
              content: 'Olá, {{1}}! Sua assinatura foi confirmada. {{2}}',
              variables: [{ name: '1' }, { name: '2' }],
            },
          ],
        });
      }
      if (inboxId === 'ib2') {
        return Promise.resolve({
          success: true,
          data: [{ id: 'w2', name: 'lead_abertura', language: 'pt_BR', variables: [] }],
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    const options = await fetchCombinedTemplateOptions();

    expect(options).toEqual([
      {
        id: 'g1',
        name: 'Welcome',
        language: 'en',
        status: 'ACTIVE',
        source: 'generic',
        placeholders: [],
        content: 'Hi {{1}}!',
      },
      {
        id: 'w1',
        name: 'boas_vindas_crm',
        language: 'pt_BR',
        status: 'APPROVED',
        source: 'whatsapp',
        inboxId: 'ib1',
        inboxName: 'Support Line',
        placeholders: ['1', '2'],
        content: 'Olá, {{1}}! Sua assinatura foi confirmada. {{2}}',
      },
      {
        id: 'w2',
        name: 'lead_abertura',
        language: 'pt_BR',
        status: undefined,
        source: 'whatsapp',
        inboxId: 'ib2',
        inboxName: 'Old Number',
        placeholders: [],
        content: undefined,
      },
    ]);

    // Every WhatsApp inbox is queried for templates, Cloud or not — only a
    // non-WhatsApp inbox (e.g. Email) is out of scope for this feature.
    expect(channelTemplatesMock.getTemplates).toHaveBeenCalledTimes(2);
    expect(channelTemplatesMock.getTemplates).toHaveBeenCalledWith('ib1');
    expect(channelTemplatesMock.getTemplates).toHaveBeenCalledWith('ib2');
  });

  it('resolves to the generic list alone when there are no WhatsApp Cloud inboxes', async () => {
    globalTemplatesMock.getTemplates.mockResolvedValue({
      success: true,
      data: [{ id: 'g1', name: 'Welcome', language: 'en', settings: {} }],
    });
    inboxesMock.list.mockResolvedValue({ success: true, data: [] });

    const options = await fetchCombinedTemplateOptions();

    expect(options).toEqual([
      { id: 'g1', name: 'Welcome', language: 'en', status: undefined, source: 'generic', placeholders: [] },
    ]);
    expect(channelTemplatesMock.getTemplates).not.toHaveBeenCalled();
  });

  it('does not blow up when a fetch fails, returning what it could gather', async () => {
    globalTemplatesMock.getTemplates.mockRejectedValue(new Error('network'));
    inboxesMock.list.mockResolvedValue({ success: true, data: [] });

    const options = await fetchCombinedTemplateOptions();

    expect(options).toEqual([]);
  });

  // Bug: inboxesService.list() was called with no pagination params, so only
  // page 1 (~20 inboxes) was ever scanned. An account whose WhatsApp Cloud
  // inbox falls on page 2+ silently never got its templates fetched.
  it('paginates through every page of inboxes to find a WhatsApp Cloud one past page 1', async () => {
    globalTemplatesMock.getTemplates.mockResolvedValue({ success: true, data: [] });
    inboxesMock.list.mockImplementation(({ page }: { page?: number } = {}) => {
      if ((page ?? 1) === 1) {
        return Promise.resolve({
          success: true,
          data: [{ id: 'ib-email', name: 'Support Email', channel_type: 'Channel::Email' }],
          meta: { pagination: { page: 1, page_size: 1, total: 2, total_pages: 2 } },
        });
      }
      return Promise.resolve({
        success: true,
        data: [{ id: 'ib1', name: 'Support Line', channel_type: 'Channel::Whatsapp', provider: 'whatsapp_cloud' }],
        meta: { pagination: { page: 2, page_size: 1, total: 2, total_pages: 2 } },
      });
    });
    channelTemplatesMock.getTemplates.mockResolvedValue({
      success: true,
      data: [{ id: 'w1', name: 'boas_vindas_crm', language: 'pt_BR', variables: [] }],
    });

    const options = await fetchCombinedTemplateOptions();

    expect(inboxesMock.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    expect(inboxesMock.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    expect(channelTemplatesMock.getTemplates).toHaveBeenCalledWith('ib1');
    expect(options.some(opt => opt.id === 'w1')).toBe(true);
  });
});

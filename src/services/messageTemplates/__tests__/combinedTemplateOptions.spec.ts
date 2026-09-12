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
        // STI channel_type — the provider field is what tells them apart.
        { id: 'ib1', name: 'Support Line', channel_type: 'Channel::Whatsapp', provider: 'whatsapp_cloud' },
        { id: 'ib2', name: 'Old Number', channel_type: 'Channel::Whatsapp', provider: 'evolution' },
      ],
    });
    channelTemplatesMock.getTemplates.mockResolvedValue({
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
        source: 'whatsapp_cloud',
        inboxId: 'ib1',
        inboxName: 'Support Line',
        placeholders: ['1', '2'],
        content: 'Olá, {{1}}! Sua assinatura foi confirmada. {{2}}',
      },
    ]);

    // Only the WhatsApp Cloud inbox is queried for templates — a non-Cloud
    // (e.g. Evolution) WhatsApp provider is out of scope for this feature.
    expect(channelTemplatesMock.getTemplates).toHaveBeenCalledTimes(1);
    expect(channelTemplatesMock.getTemplates).toHaveBeenCalledWith('ib1');
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

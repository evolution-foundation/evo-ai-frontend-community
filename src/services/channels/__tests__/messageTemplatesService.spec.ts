import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/core/api', () => ({ default: apiMock }));

import MessageTemplateService from '../messageTemplatesService';

beforeEach(() => vi.clearAllMocks());

describe('channel MessageTemplateService — flat endpoint with inbox_id (EVO-1716)', () => {
  it('lists from /message_templates passing inbox_id so the backend resolves the channel', async () => {
    apiMock.get.mockResolvedValue({ data: { success: true, data: [], meta: {} } });
    await MessageTemplateService.getTemplates('inbox-1', { per_page: 20 });
    expect(apiMock.get).toHaveBeenCalledWith(
      '/message_templates',
      expect.objectContaining({
        params: expect.objectContaining({ inbox_id: 'inbox-1', per_page: 20 }),
      }),
    );
  });

  it('creates on /message_templates with inbox_id as a top-level sibling param', async () => {
    apiMock.post.mockResolvedValue({ data: { id: 't1' } });
    await MessageTemplateService.createTemplate(
      'inbox-1',
      { name: 'x', content: 'y' } as never,
      'Channel::Api',
    );
    expect(apiMock.post).toHaveBeenCalledWith(
      '/message_templates',
      expect.objectContaining({ inbox_id: 'inbox-1', message_template: expect.any(Object) }),
    );
  });

  it('updates on /message_templates/:id with inbox_id as a top-level sibling param', async () => {
    apiMock.put.mockResolvedValue({ data: { id: 't1' } });
    await MessageTemplateService.updateTemplate(
      'inbox-1',
      't1',
      { name: 'z', content: 'c' } as never,
      'Channel::Api',
    );
    expect(apiMock.put).toHaveBeenCalledWith(
      '/message_templates/t1',
      expect.objectContaining({ inbox_id: 'inbox-1', message_template: expect.any(Object) }),
    );
  });

  it('deletes on /message_templates/:id passing inbox_id', async () => {
    apiMock.delete.mockResolvedValue({ data: {} });
    await MessageTemplateService.deleteTemplate('inbox-1', 't1');
    expect(apiMock.delete).toHaveBeenCalledWith('/message_templates/t1', {
      params: { inbox_id: 'inbox-1' },
    });
  });

  it('keeps syncTemplates pointing at the inbox-scoped sync route (unchanged)', async () => {
    apiMock.post.mockResolvedValue({ data: [] });
    await MessageTemplateService.syncTemplates('inbox-1');
    expect(apiMock.post).toHaveBeenCalledWith('/inboxes/inbox-1/message_templates/sync');
  });
});

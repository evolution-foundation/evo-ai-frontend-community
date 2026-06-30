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

// EVO-1971: exercise the real transforms (no mocking of the conversion layer) so
// the structured WhatsApp edit round-trip and the variable metadata that the
// backend persists are actually covered.
describe('WhatsApp structured transforms round-trip', () => {
  const wa = 'Channel::Whatsapp';

  it('transformToBackendFormat skips the HEADER component when headerFormat is NONE', () => {
    const out = MessageTemplateService.transformToBackendFormat(
      {
        name: 'promo',
        content: '',
        language: 'pt_BR',
        category: 'MARKETING',
        template_type: 'interactive',
        headerFormat: 'NONE',
        headerText: '',
        bodyText: 'Oi {{nome}}',
        footerText: '',
        buttons: [],
      },
      wa,
    );
    const types = (out.components as Array<{ type: string }>).map(c => c.type);
    expect(types).toContain('BODY');
    expect(types).not.toContain('HEADER');
  });

  it('transformToBackendFormat keeps the declared example/source on the persisted variables', () => {
    const out = MessageTemplateService.transformToBackendFormat(
      {
        name: 'promo',
        content: '',
        language: 'pt_BR',
        category: 'MARKETING',
        template_type: 'interactive',
        headerFormat: 'NONE',
        bodyText: 'Oi {{nome}}',
        variables: [{ name: 'nome', label: 'Nome', example: 'Maria', source: 'contact.name' }],
      },
      wa,
    );
    const variable = out.variables?.find(v => v.name === 'nome');
    expect(variable).toMatchObject({ name: 'nome', example: 'Maria', source: 'contact.name' });
  });

  it('transformToFrontendFormat parses components back (TEXT header) and restores variable metadata', () => {
    const fe = MessageTemplateService.transformToFrontendFormat(
      {
        name: 'promo',
        content: 'Oi {{nome}}',
        language: 'pt_BR',
        category: 'MARKETING',
        template_type: 'interactive',
        components: [
          { type: 'HEADER', format: 'TEXT', text: 'Olá' },
          { type: 'BODY', text: 'Oi {{nome}}' },
          { type: 'FOOTER', text: 'tchau' },
        ],
        variables: [{ name: 'nome', example: 'Maria', source: 'contact.name' }],
        active: true,
      },
      wa,
    );
    expect(fe.headerFormat).toBe('TEXT');
    expect(fe.headerText).toBe('Olá');
    expect(fe.bodyText).toBe('Oi {{nome}}');
    expect(fe.footerText).toBe('tchau');
    expect(fe.variables?.find(v => v.name === 'nome')).toMatchObject({
      example: 'Maria',
      source: 'contact.name',
    });
  });

  it('transformToFrontendFormat defaults headerFormat to NONE when there is no HEADER component', () => {
    const fe = MessageTemplateService.transformToFrontendFormat(
      {
        name: 'promo',
        content: 'Oi {{nome}}',
        language: 'pt_BR',
        components: [{ type: 'BODY', text: 'Oi {{nome}}' }],
      },
      wa,
    );
    expect(fe.headerFormat).toBe('NONE');
  });
});

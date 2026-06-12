import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/core/api', () => ({ default: apiMock }));

vi.mock('@/services/channels/messageTemplatesService', () => ({
  default: {
    transformToBackendFormat: (form: { name: string; content: string }) => ({
      name: form.name,
      content: form.content,
    }),
    transformToFrontendFormat: (t: unknown) => t,
  },
}));

import GlobalMessageTemplateService, { inferTemplateProvider } from '../globalMessageTemplatesService';

beforeEach(() => vi.clearAllMocks());

describe('inferTemplateProvider', () => {
  it('prefers the persisted settings.global_provider marker', () => {
    expect(inferTemplateProvider({ settings: { global_provider: 'email' } } as never)).toBe('email');
    expect(inferTemplateProvider({ settings: { global_provider: 'generic' } } as never)).toBe(
      'generic',
    );
  });

  it('falls back to the subject heuristic for legacy templates without the marker', () => {
    expect(inferTemplateProvider({ settings: { subject: 'Hi' } } as never)).toBe('email');
    expect(inferTemplateProvider({ settings: {} } as never)).toBe('generic');
    expect(inferTemplateProvider({} as never)).toBe('generic');
  });
});

describe('globalMessageTemplatesService', () => {
  it('lists templates from the flat endpoint with no inbox/channel filter', async () => {
    apiMock.get.mockResolvedValue({ data: { success: true, data: [], meta: {} } });
    await GlobalMessageTemplateService.getTemplates({ per_page: 20 });
    expect(apiMock.get).toHaveBeenCalledWith(
      '/message_templates',
      expect.objectContaining({ params: expect.objectContaining({ per_page: 20 }) }),
    );
  });

  it('creates with provider nested inside message_template (read via params.dig backend-side)', async () => {
    apiMock.post.mockResolvedValue({ data: { data: { id: 't1' } } });
    await GlobalMessageTemplateService.createTemplate(
      { name: 'x', content: 'y' } as never,
      'email',
    );
    expect(apiMock.post).toHaveBeenCalledWith('/message_templates', {
      message_template: {
        name: 'x',
        content: 'y',
        provider: 'email',
        settings: { global_provider: 'email' },
      },
    });
  });

  it('unwraps the PUT response envelope (data.template)', async () => {
    apiMock.put.mockResolvedValue({ data: { data: { template: { id: 't1', name: 'z' } } } });
    const result = await GlobalMessageTemplateService.updateTemplate(
      't1',
      { name: 'z', content: 'c' } as never,
      'generic',
    );
    expect(result).toEqual({ id: 't1', name: 'z' });
    expect(apiMock.put).toHaveBeenCalledWith('/message_templates/t1', {
      message_template: {
        name: 'z',
        content: 'c',
        provider: 'generic',
        settings: { global_provider: 'generic' },
      },
    });
  });

  it('deletes from the flat endpoint', async () => {
    apiMock.delete.mockResolvedValue({ data: { success: true } });
    await GlobalMessageTemplateService.deleteTemplate('t1');
    expect(apiMock.delete).toHaveBeenCalledWith('/message_templates/t1');
  });
});

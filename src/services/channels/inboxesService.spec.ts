import { beforeEach, describe, expect, it, vi } from 'vitest';
import InboxesService from './inboxesService';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: {
    patch: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/utils/apiHelpers', () => ({
  extractData: vi.fn((response: { data: unknown }) => response.data),
  extractResponse: vi.fn(),
}));

describe('InboxesService.updateWithAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends multipart payload with avatar and nested channel fields', async () => {
    const patchMock = vi.mocked(api.patch);
    patchMock.mockResolvedValue({
      data: { success: true, data: { id: 'inbox-1' } },
    } as never);

    const avatar = new File(['avatar-binary'], 'avatar.png', { type: 'image/png' });
    const payload = {
      name: 'Website',
      display_name: 'Website Chat',
      channel: {
        widget_color: '#0ea5e9',
        selected_feature_flags: ['attachments', 'emoji_picker'],
      },
      business_name: null,
    };

    await InboxesService.updateWithAvatar('inbox-1', payload, avatar);

    expect(patchMock).toHaveBeenCalledTimes(1);

    const [url, body, config] = patchMock.mock.calls[0];
    expect(url).toBe('/inboxes/inbox-1');
    expect(body).toBeInstanceOf(FormData);
    expect(config).toBeUndefined();

    const formData = body as FormData;
    expect(formData.get('name')).toBe('Website');
    expect(formData.get('display_name')).toBe('Website Chat');
    expect(formData.get('channel[widget_color]')).toBe('#0ea5e9');
    expect(formData.getAll('channel[selected_feature_flags][]')).toEqual(['attachments', 'emoji_picker']);
    expect(formData.get('avatar')).toBe(avatar);
    expect(formData.has('business_name')).toBe(false);
  });
});

describe('InboxesService.reactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POSTs to /inboxes/:id/reactivate', async () => {
    const postMock = vi.mocked(api.post);
    postMock.mockResolvedValue({ data: { data: { id: 'i1', archived_at: null } } } as never);

    await InboxesService.reactivate('i1');

    expect(postMock).toHaveBeenCalledWith('/inboxes/i1/reactivate');
  });
});

describe('InboxesService.checkArchivedMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GETs /inboxes/archived_whatsapp_match with the phone number', async () => {
    const getMock = vi.mocked(api.get);
    getMock.mockResolvedValue({ data: { inbox_id: 'i1' } } as never);

    const result = await InboxesService.checkArchivedMatch('+5511999999999');

    expect(getMock).toHaveBeenCalledWith('/inboxes/archived_whatsapp_match', {
      params: { phone_number: '+5511999999999' },
    });
    expect(result).toEqual({ inbox_id: 'i1' });
  });
});


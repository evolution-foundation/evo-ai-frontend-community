import { beforeEach, describe, expect, it, vi } from 'vitest';
import InboxesService from './inboxesService';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: {
    patch: vi.fn(),
    delete: vi.fn(),
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
    // The api instance defaults to JSON, which would serialize the FormData and drop the file.
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });

    const formData = body as FormData;
    expect(formData.get('name')).toBe('Website');
    expect(formData.get('display_name')).toBe('Website Chat');
    expect(formData.get('channel[widget_color]')).toBe('#0ea5e9');
    expect(formData.getAll('channel[selected_feature_flags][]')).toEqual(['attachments', 'emoji_picker']);
    expect(formData.get('avatar')).toBe(avatar);
    expect(formData.has('business_name')).toBe(false);
  });
});

describe('InboxesService.deleteAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the stored avatar of the inbox', async () => {
    const deleteMock = vi.mocked(api.delete);
    deleteMock.mockResolvedValue({ data: {} } as never);

    await InboxesService.deleteAvatar('inbox-1');

    expect(deleteMock).toHaveBeenCalledWith('/inboxes/inbox-1/avatar');
  });
});

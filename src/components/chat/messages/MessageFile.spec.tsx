import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock dependencies before importing component
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'messages.messageFile.fileFallback': 'file',
        'messages.messageFile.downloadFallbackOpenedInNewTab': 'Opened in new tab',
        'messages.messageFile.downloadFallbackReason.serverError': `Server error: ${fallback?.status ?? ''}`,
        'messages.messageFile.downloadFallbackReason.network': 'Network error',
        'messages.messageFile.unknownSize': 'Unknown size',
        'messages.messageFile.download': 'Download',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/components/chat/messages/utils/openAttachmentInNewTab', () => ({
  openAttachmentInNewTab: vi.fn(),
}));

import MessageFile from './MessageFile';
import { openAttachmentInNewTab } from '@/components/chat/messages/utils/openAttachmentInNewTab';
import { toast } from 'sonner';

const mockAttachment = (overrides = {}) => ({
  id: '1',
  message_id: '1',
  file_type: 'file',
  data_url: 'https://example.com/file.pdf',
  fallback_title: 'test-file.pdf',
  extension: 'pdf',
  file_size: 1024,
  ...overrides,
});

describe('MessageFile', () => {
  let originalFetch: typeof globalThis.fetch;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy;
    URL.revokeObjectURL = revokeObjectURLSpy;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders attachment with filename and download button', () => {
    render(<MessageFile attachments={[mockAttachment()]} />);
    expect(screen.getByText('test-file.pdf')).toBeTruthy();
  });

  it('happy path: fetch 200 triggers blob download and revokes URL', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: clickSpy } as unknown as HTMLElement;
      }
      return originalCreateElement(tag);
    });

    render(<MessageFile attachments={[mockAttachment()]} />);
    const downloadBtn = screen.getAllByRole('button')[0];
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/file.pdf', { mode: 'cors' });
      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(clickSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    vi.restoreAllMocks();
  });

  it('non-ok response: falls back to openAttachmentInNewTab with toast warning', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      blob: () => Promise.resolve(new Blob()),
    });

    render(<MessageFile attachments={[mockAttachment()]} />);
    const downloadBtn = screen.getAllByRole('button')[0];
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalled();
      expect(openAttachmentInNewTab).toHaveBeenCalledWith({
        url: 'https://example.com/file.pdf',
        filename: 'test-file.pdf',
      });
    });
  });

  it('fetch rejects (CORS/network): falls back to openAttachmentInNewTab', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('CORS blocked'));

    render(<MessageFile attachments={[mockAttachment()]} />);
    const downloadBtn = screen.getAllByRole('button')[0];
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalled();
      expect(openAttachmentInNewTab).toHaveBeenCalledWith({
        url: 'https://example.com/file.pdf',
        filename: 'test-file.pdf',
      });
    });
  });

  it('empty data_url: download does not trigger fetch', async () => {
    globalThis.fetch = vi.fn();

    render(<MessageFile attachments={[mockAttachment({ data_url: '   ' })]} />);
    const buttons = screen.queryAllByRole('button');

    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
    }

    // Whether button exists or not, fetch should never be called for blank URL
    await waitFor(() => {
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(openAttachmentInNewTab).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddContentModal from './AddContentModal';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('AddContentModal', () => {
  const onClose = vi.fn();
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the three tabs (Manual, Upload, URL)', () => {
    render(<AddContentModal knowledgeBaseId="kb-1" onClose={onClose} onCreated={onCreated} />);

    expect(screen.getByRole('tab', { name: /manual/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /url/i })).toBeInTheDocument();
  });

  it('submits the manual tab to the documents endpoint', async () => {
    const user = userEvent.setup();
    render(<AddContentModal knowledgeBaseId="kb-1" onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByPlaceholderText(/fields\.title/i), 'My Doc');
    await user.type(screen.getByPlaceholderText(/fields\.content/i), 'Some content');
    await user.click(screen.getByRole('button', { name: /actions\.create/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/knowledge_bases/kb-1/documents',
        expect.objectContaining({
          knowledge_document: expect.objectContaining({ title: 'My Doc', content: 'Some content' }),
        }),
      );
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('submits the URL tab to the from_url endpoint', async () => {
    const user = userEvent.setup();
    render(<AddContentModal knowledgeBaseId="kb-1" onClose={onClose} onCreated={onCreated} />);

    await user.click(screen.getByRole('tab', { name: /url/i }));
    await user.type(screen.getByPlaceholderText(/https:\/\/example\.com/i), 'https://docs.example.com');
    await user.click(screen.getByRole('button', { name: /actions\.processUrl/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/knowledge_bases/kb-1/documents/from_url',
        expect.objectContaining({ url: 'https://docs.example.com' }),
      );
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<AddContentModal knowledgeBaseId="kb-1" onClose={onClose} onCreated={onCreated} />);

    await user.click(screen.getByRole('button', { name: /actions\.cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

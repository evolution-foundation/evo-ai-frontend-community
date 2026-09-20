import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactNotesCard from './ContactNotesCard';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true }),
}));

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/services/core/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// The envelope the Rails controller answers post-fix, matching
// spec/requests/api/v1/contacts/notes_spec.rb: `{ success, data, meta }`,
// same as every other contacts endpoint. Before the fix this was a bare
// array and getContactNotes' extractResponse(response.data.data) read
// undefined off it, so the list rendered empty no matter what was saved.
const backendIndexEnvelope = (data: unknown) => ({
  data: { success: true, data, meta: { timestamp: '2026-08-17T12:00:00.000Z' } },
});

const note = {
  id: 'note-1',
  content: 'nota existente',
  contact_id: 'contact-1',
  user_id: 'user-1',
  user: { id: 'user-1', name: 'Agente', email: 'agente@example.com' },
  created_at: '2026-08-17T12:00:00.000Z',
  updated_at: '2026-08-17T12:00:00.000Z',
};

describe('ContactNotesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the notes the backend returns', async () => {
    mockGet.mockResolvedValue(backendIndexEnvelope([note]));

    render(<ContactNotesCard contactId="contact-1" />);

    await waitFor(() => {
      expect(screen.getByText('nota existente')).toBeInTheDocument();
    });
  });

  it('shows the empty state when there really are no notes', async () => {
    mockGet.mockResolvedValue(backendIndexEnvelope([]));

    render(<ContactNotesCard contactId="contact-1" />);

    await waitFor(() => {
      expect(screen.getByText('notes.empty')).toBeInTheDocument();
    });
  });
});

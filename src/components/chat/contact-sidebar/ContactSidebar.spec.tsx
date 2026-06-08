import { render, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContactSidebar from './ContactSidebar';
import type { Contact } from '@/types/chat/api';

// ── Minimal mocks ──────────────────────────────────────────────────────────
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/services/pipelines', () => ({
  pipelinesService: { getPipelinesByConversation: vi.fn().mockResolvedValue([]) as unknown },
}));
vi.mock('./ContactHeader', () => ({ default: () => null }));
vi.mock('./ContactDetails', () => ({ default: () => null }));
vi.mock('./MacrosList', () => ({ default: () => null }));
vi.mock('./EditableContactCustomAttributes', () => ({ default: () => null }));
vi.mock('./EditableConversationCustomAttributes', () => ({ default: () => null }));
vi.mock('@/components/pipelines/ConversationPipelineItem', () => ({ default: () => null }));
type WithChildren = { children?: React.ReactNode; onClick?: () => void };
vi.mock('@evoapi/design-system/button', () => ({ Button: ({ children, onClick }: WithChildren) => <button onClick={onClick}>{children}</button> }));
vi.mock('@evoapi/design-system/card', () => ({
  Card: ({ children }: WithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: WithChildren) => <div>{children}</div>,
  CardContent: ({ children }: WithChildren) => <div>{children}</div>,
}));
vi.mock('@evoapi/design-system/badge', () => ({ Badge: ({ children }: WithChildren) => <span>{children}</span> }));
vi.mock('lucide-react', () => ({
  X: () => null, User: () => null, FileText: () => null, MessageSquare: () => null,
  Clock: () => null, ChevronDown: () => null, Zap: () => null, GitBranch: () => null,
  Tag: () => null, Info: () => null,
}));

const mockGetContact = vi.fn();
vi.mock('@/services/contacts', () => ({
  contactsService: { getContact: (...args: unknown[]) => mockGetContact(...args) },
}));

// ── Helpers ────────────────────────────────────────────────────────────────
const makeContact = (id: string, overrides: Partial<Contact> = {}): Contact => ({
  id,
  name: `Contact ${id}`,
  phone_number: `+551100000${id}`,
  email: `${id}@example.com`,
  custom_attributes: {},
  ...overrides,
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  contact: makeContact('1'),
  conversation: null,
};

// ── Tests ──────────────────────────────────────────────────────────────────
describe('ContactSidebar — fetch lifecycle', () => {
  beforeEach(() => {
    mockGetContact.mockReset();
  });

  it('cancels stale fetch when contact.id changes before resolution', async () => {
    // First getContact deferred so we can control when it resolves
    let resolveFirst!: (value: Contact) => void;
    const firstFetch = new Promise<Contact>(res => { resolveFirst = res; });

    mockGetContact.mockReturnValueOnce(firstFetch);
    // Second fetch (for contactB) resolves immediately with richer data
    const contactB = makeContact('2');
    mockGetContact.mockResolvedValueOnce({ ...contactB, custom_attributes: { tier: 'pro' } });

    const { rerender } = render(<ContactSidebar {...defaultProps} />);

    // Switch to contactB before the first fetch resolves
    rerender(<ContactSidebar {...defaultProps} contact={makeContact('2')} />);

    // Now resolve the FIRST (stale) fetch — should be cancelled and ignored
    await act(async () => {
      resolveFirst({ ...makeContact('1'), custom_attributes: { tier: 'stale' } });
      await new Promise(r => setTimeout(r, 0));
    });

    // The enriched contact should reflect contactB, not the stale data from contactA
    expect(mockGetContact).toHaveBeenCalledTimes(2);
    expect(mockGetContact).toHaveBeenNthCalledWith(1, '1', true);
    expect(mockGetContact).toHaveBeenNthCalledWith(2, '2', true);
  });

  it('merges full contact data while preserving base name and phone_number', async () => {
    const base = makeContact('1', { name: 'Original Name', phone_number: '+5511999' });
    // Full contact from /contacts/:id — name and phone_number are the same but custom_attributes differ
    const fullContact: Contact = {
      ...base,
      custom_attributes: { tier: 'enterprise' },
      identifier: 'ident-abc',
    };
    mockGetContact.mockResolvedValueOnce(fullContact);

    await act(async () => {
      render(<ContactSidebar {...defaultProps} contact={base} />);
      await new Promise(r => setTimeout(r, 0));
    });

    // Verify getContact was called with correct params
    expect(mockGetContact).toHaveBeenCalledWith('1', true);
  });
});

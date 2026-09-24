import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ContactsTable from './ContactsTable';
import type { Contact } from '@/types/contacts';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useContactPiiMasking', () => ({
  useContactPiiMasking: () => ({
    shouldMask: false,
    maskPhone: (v: string) => v,
    maskEmail: (v: string) => v,
  }),
}));

// Badges pull their own data and none of them gate the action under test. The
// status badge stays real: it is the reason shown for a disabled action.
vi.mock('./ContactTagsList', () => ({ default: () => null }));
vi.mock('./ContactTypeBadge', () => ({ default: () => null }));
vi.mock('./ContactPipelinesBadge', () => ({ default: () => null }));
vi.mock('@/components/chat/contact/ContactAvatar', () => ({ default: () => null }));

const contact = (blocked: boolean): Contact =>
  ({
    id: blocked ? 'c-blocked' : 'c-open',
    name: blocked ? 'Bloqueado' : 'Aberto',
    email: 'x@example.com',
    blocked,
  }) as Contact;

const renderTable = (contacts: Contact[]) => {
  const onStartConversation = vi.fn();
  render(
    <ContactsTable
      contacts={contacts}
      selectedContacts={[]}
      onSelectionChange={vi.fn()}
      onContactClick={vi.fn()}
      onStartConversation={onStartConversation}
      onEditContact={vi.fn()}
    />,
  );
  return { onStartConversation };
};

const startButtons = () =>
  screen.getAllByRole('button', { name: 'table.actions.startConversation' });

describe('ContactsTable — start conversation column', () => {
  it('renders the action for every contact, blocked or not', () => {
    renderTable([contact(false), contact(true)]);

    // Two rows, two buttons: the blocked one is present rather than missing.
    expect(startButtons()).toHaveLength(2);
  });

  it('disables the action for a blocked contact and swallows the click', async () => {
    const { onStartConversation } = renderTable([contact(true)]);

    const [button] = startButtons();
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onStartConversation).not.toHaveBeenCalled();
  });

  it('shows the blocked badge in the same row as the disabled action', () => {
    renderTable([contact(false), contact(true)]);

    const [open, blocked] = startButtons().map(b => within(b.closest('tr')!));
    expect(blocked.getByText('base.status.blocked')).toBeInTheDocument();
    expect(open.queryByText('base.status.blocked')).not.toBeInTheDocument();
    expect(open.getByText('base.status.active')).toBeInTheDocument();
  });

  it('keeps the action working for a contact that is not blocked', async () => {
    const { onStartConversation } = renderTable([contact(false)]);

    const [button] = startButtons();
    expect(button).toBeEnabled();

    await userEvent.click(button);
    expect(onStartConversation).toHaveBeenCalledTimes(1);
  });

  // Icon-only button: the explicit aria-label pins its name to the action,
  // whatever `title` says.
  it('names the action for a screen reader even when disabled', () => {
    renderTable([contact(true)]);

    expect(startButtons()[0]).toHaveAttribute(
      'aria-label',
      'table.actions.startConversation',
    );
  });
});

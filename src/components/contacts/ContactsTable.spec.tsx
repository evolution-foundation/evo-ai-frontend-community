import { render, screen } from '@testing-library/react';
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

// Badges pull their own data and none of them gate the action under test.
vi.mock('./ContactStatusBadge', () => ({ default: () => <span>status</span> }));
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

// CRM-661/662: this column is the half of the card that already shipped wrong
// once — the button used to be hidden for blocked contacts, leaving an empty
// cell with nothing saying why, and the first fix hung the reason on a `title`
// that a disabled button never shows.
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

  it('keeps the action working for a contact that is not blocked', async () => {
    const { onStartConversation } = renderTable([contact(false)]);

    const [button] = startButtons();
    expect(button).toBeEnabled();

    await userEvent.click(button);
    expect(onStartConversation).toHaveBeenCalledTimes(1);
  });

  // The accessible name has to stay the ACTION. An earlier version put the
  // blocked reason in `title`, which is what a screen reader reads for an
  // icon-only button — it announced the reason and stopped saying which
  // control it was.
  it('names the action for a screen reader even when disabled', () => {
    renderTable([contact(true)]);

    expect(startButtons()[0]).toHaveAttribute(
      'aria-label',
      'table.actions.startConversation',
    );
  });
});

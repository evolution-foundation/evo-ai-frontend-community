import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ContactDetailPage from './ContactDetailPage';
import type { Contact } from '@/types/contacts';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

// The detail page renders three heavy cards that pull their own data. None of
// them touch the blocked/start-conversation path under test.
vi.mock('./ContactDetailsCard', () => ({ default: () => null }));
vi.mock('./ContactNotesCard', () => ({ default: () => null }));
vi.mock('./ContactEventsTab', () => ({ default: () => null }));
vi.mock('./ContactEventsErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/pipelines/ContactPipelineItem', () => ({ default: () => null }));

const contact = (blocked: boolean): Contact =>
  ({ id: 'c-1', name: 'Ada Lovelace', blocked }) as Contact;

const renderPage = (blocked: boolean) => {
  const onStartConversation = vi.fn();
  render(
    <ContactDetailPage
      contact={contact(blocked)}
      loading={false}
      notFound={false}
      onClose={vi.fn()}
      onSave={vi.fn()}
      onStartConversation={onStartConversation}
    />,
  );
  return { onStartConversation };
};

const startButton = () =>
  screen.getByRole('button', { name: /details\.actions\.startConversation/ });

describe('ContactDetailPage — start conversation on a blocked contact', () => {
  it('keeps the action reachable and working when the contact is not blocked', async () => {
    const { onStartConversation } = renderPage(false);

    expect(startButton()).toBeEnabled();
    expect(
      screen.queryByText('form.fields.blocked.label.blocked'),
    ).not.toBeInTheDocument();

    await userEvent.click(startButton());
    expect(onStartConversation).toHaveBeenCalledTimes(1);
  });

  // `disabled` already swallowed the click silently; the reason has to be on screen.
  it('disables the action AND states why when the contact is blocked', async () => {
    const { onStartConversation } = renderPage(true);

    expect(startButton()).toBeDisabled();
    expect(
      screen.getByText('form.fields.blocked.label.blocked'),
    ).toBeInTheDocument();

    await userEvent.click(startButton());
    expect(onStartConversation).not.toHaveBeenCalled();
  });

  // The field description claims the contact cannot receive messages, which the
  // API does not enforce.
  it('does not claim the contact cannot receive messages', () => {
    renderPage(true);

    expect(
      screen.queryByText('form.fields.blocked.description.blocked'),
    ).not.toBeInTheDocument();
  });
});

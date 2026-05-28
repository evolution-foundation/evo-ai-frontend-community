import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactEventsErrorBoundary } from '../ContactEventsErrorBoundary';

// React renders ErrorBoundary children with a console.error trace by default.
// That noise breaks Vitest's pass-through console — silence it for these
// tests specifically.
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

function Bomb({ live }: { live: boolean }): React.ReactElement {
  if (live) throw new Error('boom');
  return <p>safe</p>;
}

describe('ContactEventsErrorBoundary (AC21)', () => {
  it('renders the children when nothing throws', () => {
    render(
      <ContactEventsErrorBoundary fallbackTitle="title" fallbackReload="reload">
        <Bomb live={false} />
      </ContactEventsErrorBoundary>,
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('renders the role=alert fallback when a child throws', () => {
    render(
      <ContactEventsErrorBoundary fallbackTitle="fallback title" fallbackReload="reload">
        <Bomb live />
      </ContactEventsErrorBoundary>,
    );
    const fallback = screen.getByRole('alert');
    expect(fallback).toHaveTextContent('fallback title');
    expect(screen.getByRole('button', { name: 'reload' })).toBeInTheDocument();
  });

  it('clicking Reload resets hasError and remounts children (key bump)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ContactEventsErrorBoundary fallbackTitle="t" fallbackReload="reload">
        <Bomb live />
      </ContactEventsErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Stop the upstream throw BEFORE clicking reload — otherwise the next
    // render cycle re-throws and the boundary captures the error again.
    rerender(
      <ContactEventsErrorBoundary fallbackTitle="t" fallbackReload="reload">
        <Bomb live={false} />
      </ContactEventsErrorBoundary>,
    );
    // Boundary still owns the error state at this point.
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'reload' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('safe')).toBeInTheDocument();
  });
});

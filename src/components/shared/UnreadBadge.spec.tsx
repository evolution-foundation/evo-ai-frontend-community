import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnreadBadge } from './UnreadBadge';

describe('UnreadBadge', () => {
  it('renders the exact count when between 1 and 99', () => {
    render(<UnreadBadge count={7} />);
    expect(screen.getByRole('status')).toHaveTextContent('7');
  });

  it('renders "99+" when count is 100 or more', () => {
    render(<UnreadBadge count={350} />);
    expect(screen.getByRole('status')).toHaveTextContent('99+');
  });

  it('renders nothing when count is 0', () => {
    const { container } = render(<UnreadBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when count is negative', () => {
    const { container } = render(<UnreadBadge count={-3} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('exposes the aria-label for assistive tech', () => {
    render(<UnreadBadge count={5} ariaLabel="5 unread messages" />);
    expect(screen.getByLabelText('5 unread messages')).toBeInTheDocument();
  });

  it('shows exactly 99 (not "99+") at the boundary', () => {
    render(<UnreadBadge count={99} />);
    expect(screen.getByRole('status')).toHaveTextContent('99');
  });
});

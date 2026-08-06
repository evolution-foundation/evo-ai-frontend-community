import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VariableInput } from './VariableInput';
import '@/i18n/config';

// The picker reads custom variables from this hook; a stub keeps the tests
// focused on the EVO-1872 validation behavior.
vi.mock('@/hooks/useJourneyVariables', () => ({
  useJourneyVariables: () => ({ variables: [], loading: false, error: null }),
}));

describe('VariableInput — expression validation (EVO-1872)', () => {
  it('flags an unbalanced value: aria-invalid true + inline error wired to the input', () => {
    render(<VariableInput journeyId="j1" validateExpression value="{{contact.name" readOnly />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    // The error <p> is associated to the field via aria-describedby.
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toBeInTheDocument();
  });

  it('treats a balanced value as valid: aria-invalid false, no inline error', () => {
    render(<VariableInput journeyId="j1" validateExpression value="{{contact.name}}" readOnly />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input.getAttribute('aria-describedby')).toBeFalsy();
  });

  it('does not validate when validateExpression is off (opt-in)', () => {
    render(<VariableInput journeyId="j1" value="{{contact.name" readOnly />);

    const input = screen.getByRole('textbox');
    // No expression guard → no aria-invalid asserted by the component.
    expect(input.getAttribute('aria-invalid')).toBeFalsy();
    expect(input.getAttribute('aria-describedby')).toBeFalsy();
  });

  // CR4: the PhoneInput branch (type=tel, no closing braces so it is not treated
  // as containing a variable) must still forward the expression aria to its input.
  it('forwards aria-invalid to the PhoneInput branch (CR4)', () => {
    render(
      <VariableInput
        journeyId="j1"
        validateExpression
        type="tel"
        value="{{contact.phone"
        readOnly
      />,
    );

    const phoneInput = screen.getByRole('textbox');
    expect(phoneInput).toHaveAttribute('aria-invalid', 'true');
    expect(phoneInput.getAttribute('aria-describedby')).toBeTruthy();
  });
});

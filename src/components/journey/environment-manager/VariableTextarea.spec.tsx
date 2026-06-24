import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VariableTextarea } from './VariableTextarea';
import '@/i18n/config';

// The picker reads custom variables from this hook; drive it per-test so the
// insertion path can exercise a real journey variable.
const hooked = vi.hoisted(() => ({
  variables: [] as Array<{ name: string; type: string; description?: string }>,
}));
vi.mock('@/hooks/useJourneyVariables', () => ({
  useJourneyVariables: () => ({
    variables: hooked.variables,
    loading: false,
    error: null,
  }),
}));

afterEach(() => {
  hooked.variables = [];
});

const INSERT_VARIABLE_NAME =
  /insert variable|inserir variável|insertar variable|insérer une variable|inserisci variabile/i;

describe('VariableTextarea — accessibility', () => {
  it('gives the variable picker button an accessible name (EVO-1855)', () => {
    render(<VariableTextarea journeyId="j1" />);
    expect(screen.getByRole('button', { name: INSERT_VARIABLE_NAME })).toBeInTheDocument();
  });

  it('honors an explicit variableButtonTooltip as the accessible name', () => {
    render(<VariableTextarea journeyId="j1" variableButtonTooltip="Pick a token" />);
    expect(screen.getByRole('button', { name: 'Pick a token' })).toBeInTheDocument();
  });

  // EVO-1855 item 5: the panels pass aria-invalid/aria-describedby to wire the
  // expression error to the field for screen readers; the picker must forward
  // them to the underlying textarea (it spreads {...props}).
  it('forwards aria-invalid and aria-describedby to the textarea (EVO-1855)', () => {
    render(
      <VariableTextarea
        journeyId="j1"
        aria-invalid
        aria-describedby="expr-error-1"
      />,
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-describedby', 'expr-error-1');
  });
});

describe('VariableTextarea — variable insertion (EVO-1855 item 4)', () => {
  // Capture synchronously inside the handler: the panels are controlled, so a
  // spy that doesn't write state back lets React reset the DOM value after the
  // event — but the value delivered to onChange at call time is what matters.
  it('inserts the picked variable token into the value and fires onChange', async () => {
    hooked.variables = [{ name: 'order_id', type: 'string' }];
    const user = userEvent.setup();
    let emitted = '';
    const onChange = vi.fn((e: { target: HTMLTextAreaElement }) => {
      emitted = e.target.value;
    });
    render(<VariableTextarea journeyId="j1" value="" onChange={onChange} />);

    // Open the picker and choose the journey's custom variable.
    await user.click(screen.getByRole('button', { name: INSERT_VARIABLE_NAME }));
    await user.click(screen.getByRole('button', { name: /order_id/i }));

    // The real insertion path (handleVariableSelect → props.onChange) ran, not a
    // mocked textarea: onChange receives the token written into the field value.
    expect(onChange).toHaveBeenCalled();
    expect(emitted).toContain('{{order_id}}');
  });

  it('inserts at the caret, preserving surrounding text', async () => {
    hooked.variables = [{ name: 'order_id', type: 'string' }];
    const user = userEvent.setup();
    let emitted = '';
    const onChange = vi.fn((e: { target: HTMLTextAreaElement }) => {
      emitted = e.target.value;
    });
    render(<VariableTextarea journeyId="j1" defaultValue="Hi  there" onChange={onChange} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    // Caret between the two spaces ("Hi |there" → index 3).
    textarea.setSelectionRange(3, 3);
    await user.click(screen.getByRole('button', { name: INSERT_VARIABLE_NAME }));
    await user.click(screen.getByRole('button', { name: /order_id/i }));

    expect(emitted).toBe('Hi {{order_id}} there');
  });
});

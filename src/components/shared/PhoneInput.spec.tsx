import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PhoneInput } from './PhoneInput';

// PhoneInput now delegates its country picker to CountrySelectCombobox
// (replacing react-phone-number-input's native <select>). This checks the
// two stay wired correctly: picking a country through the combobox still
// produces a correct E.164 value once digits are typed.

describe('PhoneInput', () => {
  it('emits an E.164 value for the newly selected country after picking it via the combobox', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function Harness() {
      return <PhoneInput value="" onChange={onChange} defaultCountry="BR" />;
    }

    render(<Harness />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('United States'));

    const numberInput = screen.getByRole('textbox');
    await user.type(numberInput, '2015550123');

    const lastCall = onChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('+12015550123');
  });
});

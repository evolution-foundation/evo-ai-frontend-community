import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KeyValueEditor from './KeyValueEditor';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('KeyValueEditor', () => {
  it('renders rows from initial object value', () => {
    render(
      <KeyValueEditor
        value={{ Authorization: 'Bearer abc', 'Content-Type': 'application/json' }}
        onChange={() => {}}
        label="Headers"
      />,
    );
    expect(screen.getByDisplayValue('Authorization')).toBeTruthy();
    expect(screen.getByDisplayValue('Bearer abc')).toBeTruthy();
    expect(screen.getByDisplayValue('Content-Type')).toBeTruthy();
  });

  it('adds a new empty row when "+ add" is clicked', () => {
    const onChange = vi.fn();
    render(<KeyValueEditor value={{}} onChange={onChange} label="Params" />);
    fireEvent.click(screen.getByText('keyValueEditor.addRow'));
    const keyInputs = screen.getAllByLabelText('Params key');
    expect(keyInputs.length).toBe(1);
  });

  it('removes a row when X is clicked and emits updated object', () => {
    const onChange = vi.fn();
    render(
      <KeyValueEditor value={{ a: '1', b: '2' }} onChange={onChange} label="Q" />,
    );
    const removeButtons = screen.getAllByLabelText('keyValueEditor.removeRow');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenLastCalledWith({ b: '2' });
  });

  it('emits onChange with reconstructed object when value edited', () => {
    const onChange = vi.fn();
    render(
      <KeyValueEditor value={{ name: 'old' }} onChange={onChange} label="X" />,
    );
    const valueInput = screen.getByDisplayValue('old');
    fireEvent.change(valueInput, { target: { value: 'new' } });
    expect(onChange).toHaveBeenLastCalledWith({ name: 'new' });
  });

  it('shows inline error for duplicate keys', () => {
    render(
      <KeyValueEditor value={{}} onChange={() => {}} label="H" />,
    );
    fireEvent.click(screen.getByText('keyValueEditor.addRow'));
    fireEvent.click(screen.getByText('keyValueEditor.addRow'));
    const keyInputs = screen.getAllByLabelText('H key');
    fireEvent.change(keyInputs[0], { target: { value: 'foo' } });
    fireEvent.change(keyInputs[1], { target: { value: 'foo' } });
    expect(screen.getByText('keyValueEditor.errors.duplicateKey')).toBeTruthy();
  });

  it('shows inline error for empty value when key filled', () => {
    render(<KeyValueEditor value={{}} onChange={() => {}} label="H" />);
    fireEvent.click(screen.getByText('keyValueEditor.addRow'));
    const keyInput = screen.getByLabelText('H key');
    fireEvent.change(keyInput, { target: { value: 'k' } });
    expect(screen.getByText('keyValueEditor.errors.emptyValue')).toBeTruthy();
  });

  it('renders nested object value as readonly JSON with complex badge', () => {
    render(
      <KeyValueEditor
        value={{ auth: { bearer: 'abc' } }}
        onChange={() => {}}
        label="Headers"
      />,
    );
    expect(screen.getByDisplayValue('auth')).toBeTruthy();
    expect(screen.getByText('{"bearer":"abc"}')).toBeTruthy();
    expect(screen.getAllByText('keyValueEditor.complexValueBadge').length).toBeGreaterThan(0);
  });

  it('preserves nested object value when row not edited', () => {
    const onChange = vi.fn();
    render(
      <KeyValueEditor
        value={{ auth: { bearer: 'abc' }, simple: 'x' }}
        onChange={onChange}
        label="H"
      />,
    );
    const simpleInput = screen.getByDisplayValue('x');
    fireEvent.change(simpleInput, { target: { value: 'y' } });
    expect(onChange).toHaveBeenLastCalledWith({
      auth: { bearer: 'abc' },
      simple: 'y',
    });
  });
});

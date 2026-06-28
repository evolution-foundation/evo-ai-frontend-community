import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TagInput from './TagInput';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('TagInput', () => {
  it('renders existing tags as chips with remove buttons', () => {
    render(<TagInput value={['api', 'http']} onChange={() => {}} label="Tags" />);
    expect(screen.getByText('api')).toBeTruthy();
    expect(screen.getByText('http')).toBeTruthy();
  });

  it('commits a tag on Enter', () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} label="Tags" />);
    const input = screen.getByLabelText('Tags');
    fireEvent.change(input, { target: { value: 'webhook' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['webhook']);
  });

  it('commits a tag on comma', () => {
    const onChange = vi.fn();
    render(<TagInput value={['api']} onChange={onChange} label="Tags" />);
    const input = screen.getByLabelText('Tags');
    fireEvent.change(input, { target: { value: 'http' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).toHaveBeenLastCalledWith(['api', 'http']);
  });

  it('ignores duplicate tags', () => {
    const onChange = vi.fn();
    render(<TagInput value={['api']} onChange={onChange} label="Tags" />);
    const input = screen.getByLabelText('Tags');
    fireEvent.change(input, { target: { value: 'api' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag when X is clicked', () => {
    const onChange = vi.fn();
    render(<TagInput value={['api', 'http']} onChange={onChange} label="Tags" />);
    const removeButtons = screen.getAllByRole('button');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenLastCalledWith(['http']);
  });

  it('removes last tag on Backspace with empty input', () => {
    const onChange = vi.fn();
    render(<TagInput value={['api', 'http']} onChange={onChange} label="Tags" />);
    const input = screen.getByLabelText('Tags');
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith(['api']);
  });

  it('shows suggestions matching the draft', () => {
    render(
      <TagInput
        value={[]}
        onChange={() => {}}
        label="Modes"
        suggestions={['text', 'image', 'audio']}
      />,
    );
    const input = screen.getByLabelText('Modes');
    fireEvent.change(input, { target: { value: 'i' } });
    expect(screen.getByText('+ image')).toBeTruthy();
    expect(screen.queryByText('+ text')).toBeNull();
  });

  it('clicking a suggestion commits it as a tag', () => {
    const onChange = vi.fn();
    render(
      <TagInput
        value={[]}
        onChange={onChange}
        label="Modes"
        suggestions={['text', 'image']}
      />,
    );
    const input = screen.getByLabelText('Modes');
    fireEvent.change(input, { target: { value: 't' } });
    fireEvent.click(screen.getByText('+ text'));
    expect(onChange).toHaveBeenLastCalledWith(['text']);
  });
});

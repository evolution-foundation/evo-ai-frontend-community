import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdvancedJsonEditor from './AdvancedJsonEditor';

// EVO-1738/1739: the advanced (raw JSON) escape hatch must parse on every edit and
// report validity so the wizard blocks submit on malformed JSON.
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('AdvancedJsonEditor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the value as pretty JSON', () => {
    render(<AdvancedJsonEditor value={{ name: 'srv', url: 'https://x' }} onChange={vi.fn()} />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.value).toContain('"name": "srv"');
    expect(ta.value).toContain('"url": "https://x"');
  });

  it('emits the parsed object and valid=true on a valid edit', () => {
    const onChange = vi.fn();
    const onValidityChange = vi.fn();
    render(<AdvancedJsonEditor value={{}} onChange={onChange} onValidityChange={onValidityChange} />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: '{"name":"api","timeout":30}' } });
    expect(onChange).toHaveBeenLastCalledWith({ name: 'api', timeout: 30 });
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('reports valid=false on malformed JSON and does not call onChange', () => {
    const onChange = vi.fn();
    const onValidityChange = vi.fn();
    render(<AdvancedJsonEditor value={{}} onChange={onChange} onValidityChange={onValidityChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{ not json' } });
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a top-level array/primitive as not an object', () => {
    const onValidityChange = vi.fn();
    render(<AdvancedJsonEditor value={{}} onChange={vi.fn()} onValidityChange={onValidityChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '[1,2,3]' } });
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AgentToggle from './AgentToggle';

const rail = () => screen.getByRole('switch').parentElement as HTMLElement;
const knob = () => rail().querySelector('[aria-hidden="true"]') as HTMLElement;

describe('AgentToggle', () => {
  it('renders a 42x24 pill rail that cannot shrink inside a flex row', () => {
    render(<AgentToggle checked={false} onCheckedChange={vi.fn()} />);
    const cls = rail().className;
    expect(cls).toContain('w-[42px]');
    expect(cls).toContain('h-[24px]');
    expect(cls).toContain('rounded-full');
    // `flex: 0 0 42px`, otherwise the toggle squashes next to long text.
    expect(cls).toContain('flex-[0_0_42px]');
  });

  // Raw px: Tailwind's scales compile to rem and the toggle would scale with typography.
  it('never sizes the rail in rem or em', () => {
    render(<AgentToggle checked={false} onCheckedChange={vi.fn()} />);
    expect(rail().className).not.toMatch(/\b[hw]-\d/);
  });

  it('parks the 18px knob 3px from the left when off', () => {
    render(<AgentToggle checked={false} onCheckedChange={vi.fn()} />);
    const cls = knob().className;
    expect(cls).toContain('h-[18px]');
    expect(cls).toContain('w-[18px]');
    expect(cls).toContain('left-[3px]');
    expect(cls).toContain('shadow-[0_1px_2px_rgba(0,0,0,0.2)]');
  });

  it('slides the knob to 21px (42 - 18 - 3) when on', () => {
    render(<AgentToggle checked onCheckedChange={vi.fn()} />);
    expect(knob().className).toContain('left-[21px]');
    expect(knob().className).not.toContain('left-[3px]');
  });

  // The knob moves by `left` only, never mixed with translateX.
  it('moves the knob by left only, never by transform', () => {
    render(<AgentToggle checked onCheckedChange={vi.fn()} />);
    expect(knob().className).not.toMatch(/translate/);
  });

  it('animates rail colour and knob position on the same .16s beat', () => {
    render(<AgentToggle checked={false} onCheckedChange={vi.fn()} />);
    expect(rail().className).toContain('duration-[160ms]');
    expect(knob().className).toContain('duration-[160ms]');
  });

  it('swaps the rail colour between off and on', () => {
    const { rerender } = render(<AgentToggle checked={false} onCheckedChange={vi.fn()} />);
    expect(rail().className).toContain('bg-muted-foreground/40');
    rerender(<AgentToggle checked onCheckedChange={vi.fn()} />);
    expect(rail().className).toContain('bg-primary');
  });

  it('toggles when the rail is clicked, not just the knob', async () => {
    const onCheckedChange = vi.fn();
    render(<AgentToggle checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(rail());
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('keeps the native input for form state and keyboard, but out of the way', () => {
    render(<AgentToggle id="my-toggle" checked onCheckedChange={vi.fn()} />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(true);
    expect(input.className).toContain('opacity-0');
    expect(input.className).toContain('pointer-events-none');
  });

  // The checkbox is invisible, so the focus ring has to come from the label.
  it('shows a focus ring on the rail when the hidden input takes focus', async () => {
    render(<AgentToggle checked={false} onCheckedChange={vi.fn()} />);
    expect(rail().className).toContain('focus-within:ring-[3px]');

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('switch'));
  });

  it('does not report changes while disabled', async () => {
    const onCheckedChange = vi.fn();
    render(<AgentToggle checked={false} disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(rail());
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

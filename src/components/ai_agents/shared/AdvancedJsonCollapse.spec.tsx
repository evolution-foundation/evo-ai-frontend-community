import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdvancedJsonCollapse from './AdvancedJsonCollapse';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('AdvancedJsonCollapse', () => {
  it('is closed by default and children are not visible', () => {
    render(
      <AdvancedJsonCollapse>
        <div data-testid="child">child-content</div>
      </AdvancedJsonCollapse>,
    );
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('opens by default when defaultOpen is true', () => {
    render(
      <AdvancedJsonCollapse defaultOpen>
        <div data-testid="child">child-content</div>
      </AdvancedJsonCollapse>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('toggles open/closed when the header is clicked', () => {
    render(
      <AdvancedJsonCollapse>
        <div data-testid="child">child-content</div>
      </AdvancedJsonCollapse>,
    );
    const trigger = screen.getByText('advancedConfig.title');
    fireEvent.click(trigger);
    expect(screen.getByTestId('child')).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('uses custom title when provided', () => {
    render(
      <AdvancedJsonCollapse title="Custom Title">
        <div>x</div>
      </AdvancedJsonCollapse>,
    );
    expect(screen.getByText('Custom Title')).toBeTruthy();
  });
});

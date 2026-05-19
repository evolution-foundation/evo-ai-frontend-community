import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlowCategoryBadge } from './FlowCategoryBadge';

describe('FlowCategoryBadge', () => {
  it.each(['trigger', 'action', 'condition', 'control', 'exit'] as const)(
    'renders variant %s with the matching token class set',
    (variant) => {
      render(
        <FlowCategoryBadge variant={variant} data-testid="badge">
          {variant}
        </FlowCategoryBadge>,
      );
      const badge = screen.getByTestId('badge');
      const expectedToken =
        variant === 'action' ? 'flow-node-action-message' : `flow-node-${variant}`;
      expect(badge.className).toContain(`${expectedToken}-bg`);
      expect(badge.className).toContain(`${expectedToken}-fg`);
      expect(badge.className).toContain(`${expectedToken}-border`);
    },
  );

  it('renders its children content', () => {
    render(<FlowCategoryBadge variant="trigger">Trigger</FlowCategoryBadge>);
    expect(screen.queryByText('Trigger')).not.toBeNull();
  });
});

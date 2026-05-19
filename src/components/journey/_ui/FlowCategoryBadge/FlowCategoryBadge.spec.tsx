import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlowCategoryBadge } from './FlowCategoryBadge';

describe('FlowCategoryBadge', () => {
  it.each(['trigger', 'condition', 'control', 'exit'] as const)(
    'renders variant %s with the matching token class set',
    (variant) => {
      render(
        <FlowCategoryBadge variant={variant} data-testid="badge">
          {variant}
        </FlowCategoryBadge>,
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain(`flow-node-${variant}-bg`);
      expect(badge.className).toContain(`flow-node-${variant}-fg`);
      expect(badge.className).toContain(`flow-node-${variant}-border`);
    },
  );

  it.each(['message', 'webhook', 'label', 'pipeline'] as const)(
    'renders action subtype %s with action-* token classes',
    (subtype) => {
      render(
        <FlowCategoryBadge variant="action" subtype={subtype} data-testid="badge">
          action · {subtype}
        </FlowCategoryBadge>,
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain(`flow-node-action-${subtype}-bg`);
      expect(badge.className).toContain(`flow-node-action-${subtype}-fg`);
      expect(badge.className).toContain(`flow-node-action-${subtype}-border`);
    },
  );

  it('renders its children content', () => {
    render(<FlowCategoryBadge variant="trigger">Trigger</FlowCategoryBadge>);
    expect(screen.queryByText('Trigger')).not.toBeNull();
  });
});

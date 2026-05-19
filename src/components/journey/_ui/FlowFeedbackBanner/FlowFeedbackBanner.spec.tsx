import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlowFeedbackBanner } from './FlowFeedbackBanner';

describe('FlowFeedbackBanner', () => {
  it.each(['info', 'warn', 'error', 'success'] as const)(
    'renders variant %s with the matching token class set',
    (variant) => {
      render(
        <FlowFeedbackBanner variant={variant} data-testid="banner">
          message
        </FlowFeedbackBanner>,
      );
      const banner = screen.getByTestId('banner');
      expect(banner.className).toContain(`flow-feedback-${variant}-bg`);
      expect(banner.className).toContain(`flow-feedback-${variant}-fg`);
      expect(banner.className).toContain(`flow-feedback-${variant}-border`);
    },
  );

  it.each([
    ['warn', 'alert'],
    ['error', 'alert'],
    ['info', 'status'],
    ['success', 'status'],
  ] as const)('uses role=%s → %s default mapping', (variant, expectedRole) => {
    render(
      <FlowFeedbackBanner variant={variant} data-testid="banner">
        {variant}
      </FlowFeedbackBanner>,
    );
    expect(screen.getByTestId('banner').getAttribute('role')).toBe(expectedRole);
  });

  it('honors a consumer-provided role over the default mapping', () => {
    render(
      <FlowFeedbackBanner variant="error" role="region" data-testid="banner">
        custom role
      </FlowFeedbackBanner>,
    );
    expect(screen.getByTestId('banner').getAttribute('role')).toBe('region');
  });
});

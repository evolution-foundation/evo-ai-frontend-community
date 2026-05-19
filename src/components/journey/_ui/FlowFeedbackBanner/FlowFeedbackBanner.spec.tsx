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

  it('uses role="alert" for warn and error, role="status" for info and success', () => {
    const { rerender } = render(
      <FlowFeedbackBanner variant="error">err</FlowFeedbackBanner>,
    );
    expect(screen.getByText('err').getAttribute('role')).toBe('alert');

    rerender(<FlowFeedbackBanner variant="info">info</FlowFeedbackBanner>);
    expect(screen.getByText('info').getAttribute('role')).toBe('status');
  });
});

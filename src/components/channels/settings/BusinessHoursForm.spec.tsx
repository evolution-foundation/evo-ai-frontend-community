import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BusinessHoursForm from './BusinessHoursForm';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('./BusinessDay', () => ({
  default: () => <div data-testid="business-day">Business Day</div>,
}));

vi.mock('./helpers/businessHours', async () => {
  const actual = await vi.importActual('./helpers/businessHours');
  return {
    ...actual,
    getDefaultTimezone: () => ({ value: 'America/Sao_Paulo', label: 'America/Sao_Paulo' }),
    getTimeZoneOptions: () => [{ value: 'America/Sao_Paulo', label: 'America/Sao_Paulo' }],
    getDayNames: () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    defaultTimeSlot: [
      { day: 0, from: null, to: null, valid: true },
      { day: 1, from: null, to: null, valid: true },
      { day: 2, from: null, to: null, valid: true },
      { day: 3, from: null, to: null, valid: true },
      { day: 4, from: null, to: null, valid: true },
      { day: 5, from: null, to: null, valid: true },
      { day: 6, from: null, to: null, valid: true },
    ],
    timeSlotParse: () => [
      { day: 0, from: null, to: null, valid: true },
      { day: 1, from: null, to: null, valid: true },
      { day: 2, from: null, to: null, valid: true },
      { day: 3, from: null, to: null, valid: true },
      { day: 4, from: null, to: null, valid: true },
      { day: 5, from: null, to: null, valid: true },
      { day: 6, from: null, to: null, valid: true },
    ],
    timeSlotTransform: () => [],
  };
});

vi.mock('@evoapi/design-system', async () => {
  const actual = await vi.importActual('@evoapi/design-system');
  return {
    ...actual,
    Switch: ({ checked }: { checked: boolean }) => (
      <div role="switch" aria-checked={checked} data-testid="switch">
        {checked ? 'ON' : 'OFF'}
      </div>
    ),
  };
});

vi.mock('./GlobalTemplateSelect', () => ({
  default: ({ value }: { value?: string | null }) => (
    <div data-testid="global-template-select">{value || 'none'}</div>
  ),
}));

describe('BusinessHoursForm', () => {
  const mockOnUpdate = vi.fn().mockResolvedValue(undefined);
  const defaultProps = {
    inboxId: 'test-inbox-id',
    onUpdate: mockOnUpdate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Button visibility', () => {
    it('should show Update button when business hours toggle is enabled', () => {
      render(<BusinessHoursForm {...defaultProps} workingHoursEnabled={true} />);
      
      const updateButton = screen.getByRole('button', { name: /settings\.businessHours\.buttons\.update/i });
      expect(updateButton).toBeInTheDocument();
    });

    it('should show Update button when business hours toggle is disabled', () => {
      render(<BusinessHoursForm {...defaultProps} workingHoursEnabled={false} />);
      
      const updateButton = screen.getByRole('button', { name: /settings\.businessHours\.buttons\.update/i });
      expect(updateButton).toBeInTheDocument();
    });
  });

  describe('Button disabled state', () => {
    it('should not disable button when business hours is disabled even if there are validation errors', () => {
      render(<BusinessHoursForm {...defaultProps} workingHoursEnabled={false} />);

      const updateButton = screen.getByRole('button', { name: /settings\.businessHours\.buttons\.update/i });
      expect(updateButton).not.toBeDisabled();
    });
  });

  describe('Out-of-office template', () => {
    it('starts in template mode when an out-of-office template id is set', () => {
      render(
        <BusinessHoursForm
          {...defaultProps}
          workingHoursEnabled={true}
          outOfOfficeMessageTemplateId="tpl-9"
        />,
      );
      expect(screen.getByTestId('global-template-select')).toHaveTextContent('tpl-9');
    });
  });
});

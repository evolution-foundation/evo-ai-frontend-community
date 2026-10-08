import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import Labels from './Labels';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/tours', () => ({ SettingsLabelsTour: () => null }));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true }),
}));

const mockCreateLabel = vi.fn();
vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: {
    getLabels: vi.fn().mockResolvedValue({ data: [], meta: {} }),
    createLabel: (...args: unknown[]) => mockCreateLabel(...args),
  },
}));

// Mirrors the 422 envelope of Api::BaseController#format_validation_errors.
function validationError(details: unknown[]) {
  return {
    response: {
      status: 422,
      data: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details } },
    },
  };
}

async function submitNewLabel(title: string) {
  const user = userEvent.setup();
  render(<Labels />);

  await user.click(await screen.findByRole('button', { name: 'header.newLabel' }));
  await user.type(screen.getByLabelText(/modal.labels.name/), title);
  await user.click(screen.getByRole('button', { name: 'modal.buttons.create' }));
  return user;
}

describe('Labels — a refused save points at the field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a taken name on the name field and keeps the modal open, without the generic toast', async () => {
    mockCreateLabel.mockRejectedValue(
      validationError([{ field: 'title', messages: ['já está em uso'], codes: ['taken'] }]),
    );

    const user = await submitNewLabel('vip');

    expect(await screen.findByText('modal.validation.nameTaken')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/modal.labels.name/), 's');
    expect(screen.queryByText('modal.validation.nameTaken')).not.toBeInTheDocument();
  });

  it('falls back to the generic toast when the API sends no codes', async () => {
    mockCreateLabel.mockRejectedValue(
      validationError([{ field: 'title', messages: ['has already been taken'] }]),
    );

    await submitNewLabel('vip');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.createError'));
    expect(screen.queryByText('modal.validation.nameTaken')).not.toBeInTheDocument();
  });

  it('still warns when a field it cannot explain failed alongside one it can', async () => {
    mockCreateLabel.mockRejectedValue(
      validationError([
        { field: 'title', codes: ['taken'] },
        { field: 'description', codes: ['too_long'] },
      ]),
    );

    await submitNewLabel('vip');

    expect(await screen.findByText('modal.validation.nameTaken')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('messages.createError');
  });

  it('shows a name the server finds too short on the name field', async () => {
    mockCreateLabel.mockRejectedValue(validationError([{ field: 'title', codes: ['too_short'] }]));

    await submitNewLabel('ab');

    expect(await screen.findByText('modal.validation.nameMinLength')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('accepts a three-digit hex color and sends it as six digits', async () => {
    mockCreateLabel.mockResolvedValue({ id: 'l1', title: 'vip', color: '#aabbcc' });
    const user = userEvent.setup();
    render(<Labels />);

    await user.click(await screen.findByRole('button', { name: 'header.newLabel' }));
    await user.type(screen.getByLabelText(/modal.labels.name/), 'vip');
    const color = screen.getByLabelText(/modal.labels.color/);
    await user.clear(color);
    await user.type(color, '#abc');
    await user.click(screen.getByRole('button', { name: 'modal.buttons.create' }));

    await waitFor(() => expect(mockCreateLabel).toHaveBeenCalledWith(expect.objectContaining({ color: '#aabbcc' })));
    expect(screen.queryByText('modal.validation.colorInvalid')).not.toBeInTheDocument();
  });

  it('does not send a name that is one character once trimmed', async () => {
    await submitNewLabel(' a');

    expect(await screen.findByText('modal.validation.nameMinLength')).toBeInTheDocument();
    expect(mockCreateLabel).not.toHaveBeenCalled();
  });
});

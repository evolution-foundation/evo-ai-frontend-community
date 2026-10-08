import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { cannedResponsesService } from '@/services/cannedResponses/cannedResponsesService';
import CannedResponses from './CannedResponses';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/tours', () => ({ SettingsCannedResponsesTour: () => null }));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true }),
}));

function validationError(details: unknown[]) {
  return {
    response: {
      status: 422,
      data: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details } },
    },
  };
}

async function submitNewResponse() {
  const user = userEvent.setup();
  render(<CannedResponses />);

  await user.click(await screen.findByRole('button', { name: /header.newResponse/ }));
  await user.type(screen.getByLabelText(/modal.fields.content.label/), 'Olá, tudo bem com você?');
  const shortCode = screen.getByLabelText(/modal.fields.shortCode.label/);
  await user.clear(shortCode);
  await user.type(shortCode, 'saudacao');
  await user.click(screen.getByRole('button', { name: 'actions.create' }));
  return user;
}

describe('CannedResponses — a refused save points at the field', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.error).mockClear();
    vi.spyOn(cannedResponsesService, 'getCannedResponses').mockResolvedValue({ data: [], meta: {} } as never);
  });

  it('shows a taken short code on its field, without the generic toast', async () => {
    vi.spyOn(cannedResponsesService, 'createCannedResponse').mockRejectedValue(
      validationError([{ field: 'short_code', codes: ['taken'] }]),
    );

    await submitNewResponse();

    expect(await screen.findByText('modal.validation.shortCodeTaken')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('falls back to the generic toast for a 422 without codes', async () => {
    vi.spyOn(cannedResponsesService, 'createCannedResponse').mockRejectedValue(
      validationError(['Short code has already been taken']),
    );

    await submitNewResponse();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('messages.createError'));
  });
});

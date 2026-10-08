import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import CustomAttributes from './CustomAttributes';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/tours', () => ({ SettingsCustomAttributesTour: () => null }));

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

async function submitNewAttribute() {
  const user = userEvent.setup();
  render(<CustomAttributes />);

  await user.click(await screen.findByRole('button', { name: /header.newAttribute/ }));
  await user.type(screen.getByLabelText(/modal.fields.displayName.label/), 'Plano');
  await user.type(screen.getByLabelText(/modal.fields.description.label/), 'Plano contratado');
  await user.click(screen.getByRole('button', { name: 'actions.create' }));
  return user;
}

describe('CustomAttributes — a refused save points at the field', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.error).mockClear();
    vi.spyOn(customAttributesService, 'getCustomAttributes').mockResolvedValue({ data: [], meta: {} } as never);
  });

  it('shows a taken key on its field, and clears it when the name regenerates the key', async () => {
    vi.spyOn(customAttributesService, 'createCustomAttribute').mockRejectedValue(
      validationError([{ field: 'attribute_key', codes: ['taken'] }]),
    );

    const user = await submitNewAttribute();

    expect(await screen.findByText('modal.fields.attributeKey.errors.taken')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/modal.fields.displayName.label/), ' pro');
    expect(screen.queryByText('modal.fields.attributeKey.errors.taken')).not.toBeInTheDocument();
  });

  // "Email" on the contacts tab generates the key `email`, a standard attribute.
  it('explains a reserved key on its field instead of the generic toast', async () => {
    vi.spyOn(customAttributesService, 'createCustomAttribute').mockRejectedValue(
      validationError([{ field: 'attribute_key', codes: ['key_conflict'] }]),
    );

    await submitNewAttribute();

    expect(await screen.findByText('modal.fields.attributeKey.errors.reserved')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  // Variable-length lookbehind compiles in the browser but not in Ruby, which is
  // what the pre-chat form runs it with — only the server can refuse it.
  it('shows a pattern only the server refuses on the regex field', async () => {
    const create = vi.spyOn(customAttributesService, 'createCustomAttribute').mockRejectedValue(
      validationError([{ field: 'regex_pattern', codes: ['invalid'] }]),
    );
    const user = userEvent.setup();
    render(<CustomAttributes />);

    await user.click(await screen.findByRole('button', { name: /header.newAttribute/ }));
    await user.type(screen.getByLabelText(/modal.fields.displayName.label/), 'CEP');
    await user.type(screen.getByLabelText(/modal.fields.description.label/), 'CEP do contato');
    await user.click(screen.getByRole('switch', { name: /modal.fields.regexEnabled.label/ }));
    await user.type(screen.getByLabelText(/modal.fields.regexPattern.label/), '(?<=a+)b');
    await user.click(screen.getByRole('button', { name: 'actions.create' }));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ regex_pattern: '(?<=a+)b' }));
    expect(await screen.findByText('modal.fields.regexPattern.errors.invalid')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

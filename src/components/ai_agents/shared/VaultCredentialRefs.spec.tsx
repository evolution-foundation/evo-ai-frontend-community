import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CredentialRefsEditor } from './VaultCredentialRefs';
import { useVaultCredentials } from './useVaultCredentials';
import type { IntegrationCredential } from '@/types/agents';

// EVO-2250 story 2.4: the vault pickers only ever offer static, active
// credentials, and references are a MAP (name -> credential id), never a
// scalar column.

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const listIntegrationCredentials = vi.fn();

vi.mock('@/services/agents', () => ({
  listIntegrationCredentials: (...args: unknown[]) => listIntegrationCredentials(...args),
}));

const STATIC_ACTIVE: IntegrationCredential = {
  id: 'cred-static',
  name: 'Dify producao',
  provider: 'dify',
  kind: 'static',
  scope: 'account',
  is_active: true,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

const STATIC_INACTIVE: IntegrationCredential = {
  ...STATIC_ACTIVE,
  id: 'cred-inactive',
  name: 'Desativada',
  is_active: false,
};

const OAUTH_ROW: IntegrationCredential = {
  ...STATIC_ACTIVE,
  id: 'cred-oauth',
  name: 'GitHub',
  provider: 'github',
  kind: 'oauth',
};

beforeEach(() => {
  vi.clearAllMocks();
  listIntegrationCredentials.mockResolvedValue([STATIC_ACTIVE, STATIC_INACTIVE, OAUTH_ROW]);
});

describe('useVaultCredentials — only static active credentials are selectable', () => {
  it('filters out oauth and inactive rows (negative proof)', async () => {
    const { result } = renderHook(() => useVaultCredentials());

    // An oauth row has no value in the vault: offering it as an injectable
    // secret would put an empty credential on the wire. This fails if the
    // filter ever drops.
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].id).toBe('cred-static');
  });

  it('leaves the list empty when the vault listing fails (advisory load)', async () => {
    listIntegrationCredentials.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useVaultCredentials());

    await waitFor(() => expect(listIntegrationCredentials).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  // A host that mounts closed (the Nexus dialog sits on every agent screen)
  // must not fire a vault listing: for a user without the read grant that was
  // one 403 per screen render.
  it('does not fetch while disabled, and fetches once enabled', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useVaultCredentials(enabled), {
      initialProps: { enabled: false },
    });

    expect(listIntegrationCredentials).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(result.current).toHaveLength(1));
  });
});

describe('CredentialRefsEditor — the reference is a map, never a scalar', () => {
  it('renders one row per entry: two auth headers mean two credentials (negative proof)', async () => {
    render(
      <CredentialRefsEditor
        id="refs"
        value={{ Authorization: 'cred-static', 'X-API-Key': 'cred-other' }}
        onChange={() => {}}
      />,
    );

    // A scalar credential_id column could not represent this state at all.
    const keyInputs = await screen.findAllByLabelText('refsEditor.keyLabel');
    expect(keyInputs).toHaveLength(2);
    expect(keyInputs[0]).toHaveValue('Authorization');
    expect(keyInputs[1]).toHaveValue('X-API-Key');
  });

  it('emits the full map minus the removed entry on remove', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CredentialRefsEditor
        id="refs"
        value={{ Authorization: 'cred-static', 'X-API-Key': 'cred-other' }}
        onChange={onChange}
      />,
    );

    await user.click((await screen.findAllByLabelText('refsEditor.remove'))[0]);

    expect(onChange).toHaveBeenCalledWith({ 'X-API-Key': 'cred-other' });
  });

  // Renaming a header goes through an EMPTY intermediate state (select-all +
  // type, or backspacing to the end). The row must survive it with its
  // credential intact: dropping the entry mid-keystroke loses the selection and
  // silently drops auth if the user saves without noticing.
  it('keeps the credential while a header name is being retyped', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CredentialRefsEditor
        id="refs"
        value={{ Authorization: 'cred-static' }}
        onChange={onChange}
      />,
    );

    const nameInput = (await screen.findAllByLabelText('refsEditor.keyLabel'))[0];
    await user.clear(nameInput);

    // Mid-rename the map may legitimately drop the half-typed entry...
    expect(onChange).toHaveBeenCalled();

    // ...but the row must still be on screen, holding its credential, so the
    // user can finish typing the new name.
    expect(screen.getAllByLabelText('refsEditor.keyLabel')).toHaveLength(1);

    await user.type(nameInput, 'X-Api-Key');

    expect(onChange).toHaveBeenLastCalledWith({ 'X-Api-Key': 'cred-static' });
  });

  it('never emits an entry that lacks name or credential (draft stays local)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CredentialRefsEditor id="refs" value={{}} onChange={onChange} />);

    await user.click(screen.getByText('refsEditor.add'));
    await user.type(screen.getByLabelText('refsEditor.keyLabel'), 'Authorization');

    // Name typed but no credential picked: nothing reaches the map, so an
    // half-filled row can never travel in a save payload.
    expect(onChange).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  isAuthHeaderName,
  mergeRetiredHeaders,
  splitAuthHeaders,
  useVaultMigrationState,
} from './vaultRetirement';

// EVO-2250 story 2.7: the retirement guard and the round-trip guarantee.

const getIntegrationVaultMigrationState = vi.fn();

vi.mock('@/services/agents', () => ({
  getIntegrationVaultMigrationState: (...args: unknown[]) =>
    getIntegrationVaultMigrationState(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useVaultMigrationState — guard fails closed towards keeping the inline fields', () => {
  it('reports retired consumers as the backend states them', async () => {
    getIntegrationVaultMigrationState.mockResolvedValue({ retired: { custom_tools: true } });
    const { result } = renderHook(() => useVaultMigrationState());

    await waitFor(() => expect(result.current.retired.custom_tools).toBe(true));
    expect(result.current.retired.custom_mcp_servers).toBeUndefined();
  });

  it('reads a guard failure as NOT retired (nothing is removed on a broken installation)', async () => {
    getIntegrationVaultMigrationState.mockRejectedValue(new Error('503'));
    const { result } = renderHook(() => useVaultMigrationState());

    await waitFor(() => expect(getIntegrationVaultMigrationState).toHaveBeenCalled());
    expect(result.current.retired).toEqual({});
  });

  it('does not consult the guard while disabled', () => {
    renderHook(() => useVaultMigrationState(false));
    expect(getIntegrationVaultMigrationState).not.toHaveBeenCalled();
  });
});

describe('splitAuthHeaders — classification mirrors the backend redaction', () => {
  it('treats recognizable auth headers as server-managed, in any casing', () => {
    const { auth, others } = splitAuthHeaders({
      Authorization: 'Bearer x',
      'X-API-KEY': 'k',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    expect(Object.keys(auth).sort()).toEqual(['Authorization', 'X-API-KEY']);
    expect(Object.keys(others).sort()).toEqual(['Accept', 'Content-Type']);
  });

  // This used to assert the opposite ("errs towards editable: an unknown name
  // is never locked"). That premise was wrong: the BACKEND redacts by a safe
  // allowlist, so an unknown name arrives blank. Rendering it as an editable
  // empty box misrepresented a configured secret as unset — and once an absent
  // key started meaning deletion, tidying the box away destroyed the secret.
  it('errs towards server-managed: an unknown name is redacted by the backend', () => {
    expect(isAuthHeaderName('X-Signature')).toBe(true);
    expect(isAuthHeaderName('X-Tenant-Auth')).toBe(true);
    expect(isAuthHeaderName('Authorization')).toBe(true);
    // Safe-listed names keep their value on the wire, so they stay editable.
    expect(isAuthHeaderName('Content-Type')).toBe(false);
    expect(isAuthHeaderName('Accept')).toBe(false);
  });
});

describe('mergeRetiredHeaders — the round-trip guarantee (the 1.6 modal bug)', () => {
  it('always carries the received auth entries into the merged map, byte-identical', () => {
    const stored = { Authorization: 'Bearer secret-123', 'Content-Type': 'application/json' };

    const merged = mergeRetiredHeaders(stored, { 'Content-Type': 'text/plain' });

    // Dropping Authorization here would erase the migrated secret through the
    // UI: the backend replaces the stored object wholesale on update.
    expect(merged.Authorization).toBe('Bearer secret-123');
    expect(merged['Content-Type']).toBe('text/plain');
  });

  it('drops a NEW auth-named entry typed into the editable half (registration is retired)', () => {
    const stored = { 'Content-Type': 'application/json' };

    const merged = mergeRetiredHeaders(stored, {
      'Content-Type': 'application/json',
      Authorization: 'Bearer typed-inline',
    });

    expect(merged).not.toHaveProperty('Authorization');
  });
});

// A header whose VALUE the backend redacted must never render as an unset
// editable field.
//
// The backend redacts by an allowlist of safe names (secretmerge.go): anything
// outside it is server-managed and comes back blank. The front used to classify
// by a 4-name auth list, so `X-Tenant-Auth` — the exact example named in the
// backend's own comment — landed in the editable half as an empty box. Once
// `KeepMissing` learned that an absent key means deletion, tidying away that
// empty-looking row genuinely destroyed the stored secret.
describe('server-managed header classification', () => {
  it('treats any non-safe header name as server-managed, not editable', () => {
    const { auth, others } = splitAuthHeaders({
      Authorization: '',
      'X-Tenant-Auth': '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    expect(Object.keys(auth).sort()).toEqual(['Authorization', 'X-Tenant-Auth']);
    expect(Object.keys(others).sort()).toEqual(['Accept', 'Content-Type']);
  });

  it('carries a server-managed header through a merge even when the editor never saw it', () => {
    const merged = mergeRetiredHeaders(
      { 'X-Tenant-Auth': 'tk-secreto', 'Content-Type': 'application/json' },
      { 'Content-Type': 'application/xml' },
    );

    expect(merged['X-Tenant-Auth']).toBe('tk-secreto');
    expect(merged['Content-Type']).toBe('application/xml');
  });
});

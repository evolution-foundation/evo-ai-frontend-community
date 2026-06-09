import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useContactPiiMasking } from './useContactPiiMasking';

const mockAccountState: { account: any } = { account: null };
const mockCurrentUser: { value: any } = { value: null };

vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: (selector: (state: any) => any) => selector(mockAccountState),
}));

vi.mock('@/utils/auth', () => ({
  useCurrentUser: () => mockCurrentUser.value,
}));

const setState = (flag: boolean | undefined, roleKey: string | null | undefined) => {
  mockAccountState.account =
    flag === undefined ? { settings: {} } : { settings: { mask_contact_pii: flag } };
  mockCurrentUser.value =
    roleKey === null ? null : roleKey === undefined ? { id: 1 } : { id: 1, role: { key: roleKey } };
};

describe('useContactPiiMasking', () => {
  beforeEach(() => {
    mockAccountState.account = null;
    mockCurrentUser.value = null;
  });

  it('shouldMask=true when flag ON and user is non-admin', () => {
    setState(true, 'agent');
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.shouldMask).toBe(true);
    expect(result.current.maskPhone('+55 11 99999-9999')).toBe('+55 11 ****-9999');
    expect(result.current.maskEmail('marcelo@gmail.com')).toBe('m***@gmail.com');
    expect(result.current.maskIdentifier('5511999999999@s.whatsapp.net')).toBe(
      '*********9999@s.whatsapp.net'
    );
  });

  it.each(['administrator', 'account_owner', 'super_admin'])(
    'shouldMask=false when flag ON but user role is admin-tier (%s)',
    role => {
      setState(true, role);
      const { result } = renderHook(() => useContactPiiMasking());
      expect(result.current.shouldMask).toBe(false);
      expect(result.current.maskPhone('5511999999999')).toBe('+55 11 99999-9999');
      expect(result.current.maskEmail('marcelo@gmail.com')).toBe('marcelo@gmail.com');
      expect(result.current.maskIdentifier('5511999999999@s.whatsapp.net')).toBe(
        '5511999999999@s.whatsapp.net'
      );
    }
  );

  it('shouldMask=false when flag OFF for non-admin', () => {
    setState(false, 'agent');
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.shouldMask).toBe(false);
    expect(result.current.maskPhone('5511999999999')).toBe('+55 11 99999-9999');
    expect(result.current.maskEmail('marcelo@gmail.com')).toBe('marcelo@gmail.com');
  });

  it('shouldMask=false when flag OFF for admin', () => {
    setState(false, 'administrator');
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.shouldMask).toBe(false);
  });

  it('masks supervisor/agent (non-admin tier) when flag ON', () => {
    setState(true, 'supervisor');
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.shouldMask).toBe(true);
  });

  it('shouldMask=false when flag undefined (account.settings missing the key)', () => {
    setState(undefined, 'agent');
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.shouldMask).toBe(false);
    expect(result.current.maskEmail('marcelo@gmail.com')).toBe('marcelo@gmail.com');
  });

  it('masks when flag ON and user has no role defined (defensive: not-admin)', () => {
    setState(true, undefined);
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.shouldMask).toBe(true);
    expect(result.current.maskEmail('marcelo@gmail.com')).toBe('m***@gmail.com');
  });

  it('masks when flag ON and currentUser is null (defensive)', () => {
    setState(true, null);
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.shouldMask).toBe(true);
  });

  it('does not crash when account is null', () => {
    mockAccountState.account = null;
    mockCurrentUser.value = { id: 1, role: { key: 'agent' } };
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.shouldMask).toBe(false);
    expect(result.current.maskEmail('marcelo@gmail.com')).toBe('marcelo@gmail.com');
  });

  it('returns null for null phone input even when masking', () => {
    setState(true, 'agent');
    const { result } = renderHook(() => useContactPiiMasking());
    expect(result.current.maskPhone(null)).toBeNull();
    expect(result.current.maskEmail(null)).toBeNull();
    expect(result.current.maskIdentifier(null)).toBeNull();
  });
});

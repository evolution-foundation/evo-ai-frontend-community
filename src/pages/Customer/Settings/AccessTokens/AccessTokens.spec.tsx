import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessToken } from '@/types/auth';
import { getAccessTokens, regenerateAccessToken } from '@/services/auth/accessTokensService';
import AccessTokens from './AccessTokens';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/tours', () => ({ SettingsAccessTokensTour: () => null }));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true }),
}));

vi.mock('@/hooks/rbac/usePermissionGatedLoad', async () => {
  const { useEffect } = await import('react');
  return {
    usePermissionGatedLoad: ({ load }: { load: () => void }) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(() => { load(); }, []);
    },
  };
});

vi.mock('@/services/auth/accessTokensService', () => ({
  getAccessTokens: vi.fn(),
  createAccessToken: vi.fn(),
  updateAccessToken: vi.fn(),
  deleteAccessToken: vi.fn(),
  regenerateAccessToken: vi.fn(),
}));

// The page wiring is under test, so the children only expose their callbacks.
vi.mock('@/components/AccessTokens', () => ({
  AccessTokensHeader: () => null,
  AccessTokensPagination: () => null,
  AccessTokenModal: () => null,
  AccessTokensTable: ({ tokens, onRegenerateToken }: {
    tokens: AccessToken[];
    onRegenerateToken: (token: AccessToken) => void;
  }) => (
    <>
      {tokens.map(token => (
        <button key={token.id} onClick={() => onRegenerateToken(token)}>regenerate {token.id}</button>
      ))}
    </>
  ),
  ViewTokenModal: ({ open, token, onOpenChange }: {
    open: boolean;
    token: AccessToken | null;
    onOpenChange: (open: boolean) => void;
  }) => (
    <>
      <output data-testid="view">{`${open}:${token?.token ?? 'none'}`}</output>
      <button onClick={() => onOpenChange(false)}>close view</button>
    </>
  ),
}));

const LISTED = { id: 'tok-1', name: 'Automations', scopes: '' } as unknown as AccessToken;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
};

describe('AccessTokens — one-time values', () => {
  beforeEach(() => {
    vi.mocked(regenerateAccessToken).mockReset();
    vi.mocked(getAccessTokens).mockResolvedValue({
      data: [ LISTED ],
      meta: { pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 } },
    } as never);
  });

  it('sends a single regenerate while one is in flight for the same token', async () => {
    const pending = deferred<AccessToken>();
    vi.mocked(regenerateAccessToken).mockReturnValue(pending.promise);
    render(<AccessTokens />);

    const regenerate = await screen.findByText('regenerate tok-1');
    fireEvent.click(regenerate);
    fireEvent.click(regenerate);
    await act(async () => pending.resolve({ ...LISTED, token: 'new-value' }));

    expect(regenerateAccessToken).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('view')).toHaveTextContent('true:new-value');
  });

  it('drops the shown value when the view modal closes', async () => {
    vi.mocked(regenerateAccessToken).mockResolvedValue({ ...LISTED, token: 'new-value' });
    render(<AccessTokens />);

    fireEvent.click(await screen.findByText('regenerate tok-1'));
    expect(await screen.findByText('true:new-value')).toBeInTheDocument();

    fireEvent.click(screen.getByText('close view'));

    expect(screen.getByTestId('view')).toHaveTextContent('false:none');
  });
});

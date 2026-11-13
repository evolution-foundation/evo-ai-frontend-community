import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ViewTokenModal from './ViewTokenModal';
import type { AccessToken } from '@/types/auth';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const TOKEN = {
  id: 'token-id',
  name: 'Automations',
  token: 'a'.repeat(64),
  scopes: '',
  owner_type: 'User',
  owner_id: 'owner-id',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
} as unknown as AccessToken;

const renderModal = () => {
  const onCopy = vi.fn();
  render(<ViewTokenModal open onOpenChange={vi.fn()} token={TOKEN} onCopy={onCopy} />);
  return onCopy;
};

const exampleValues = () =>
  ['viewModal.examples.curl', 'viewModal.examples.javascript'].map(label => {
    const block = screen.getByText(label).parentElement as HTMLElement;
    return (block.querySelector('input') as HTMLInputElement).value;
  });

afterEach(() => vi.unstubAllEnvs());

describe('ViewTokenModal usage examples', () => {
  it('resolves a relative API base against the current origin', () => {
    vi.stubEnv('VITE_API_URL', '/crm-api');
    renderModal();

    const [curl, javascript] = exampleValues();
    const url = `${window.location.origin}/crm-api/api/v1/contacts`;
    expect(curl).toBe(`curl -H "Api-Access-Token: ${TOKEN.token}" ${url}`);
    expect(javascript).toBe(`fetch('${url}', { headers: { 'Api-Access-Token': '${TOKEN.token}' } })`);
  });

  it('keeps an absolute API base as configured', () => {
    vi.stubEnv('VITE_API_URL', 'https://crm.acme.com');
    renderModal();

    exampleValues().forEach(value => expect(value).toContain('https://crm.acme.com/api/v1/contacts'));
  });

  it('drops a trailing slash from the API base instead of doubling it', () => {
    vi.stubEnv('VITE_API_URL', 'https://crm.acme.com/');
    renderModal();

    exampleValues().forEach(value => {
      expect(value).toContain('https://crm.acme.com/api/v1/contacts');
      expect(value).not.toContain('//api');
    });
  });

  it('teaches the same header everywhere, with no placeholder host or Bearer', () => {
    vi.stubEnv('VITE_API_URL', '/crm-api');
    renderModal();

    expect(screen.getByText(/^Api-Access-Token: a{20}\.\.\.$/)).toBeInTheDocument();
    exampleValues().forEach(value => {
      expect(value).toContain('Api-Access-Token');
      expect(value).not.toMatch(/Bearer|Authorization|api\.example\.com/);
    });
  });

  it('copies exactly what each example shows', () => {
    vi.stubEnv('VITE_API_URL', '/crm-api');
    const onCopy = renderModal();
    const [curl, javascript] = exampleValues();

    ['viewModal.examples.curl', 'viewModal.examples.javascript'].forEach(label => {
      const block = screen.getByText(label).parentElement as HTMLElement;
      fireEvent.click(block.querySelector('button') as HTMLButtonElement);
    });

    expect(onCopy).toHaveBeenNthCalledWith(1, curl, 'viewModal.examples.curl');
    expect(onCopy).toHaveBeenNthCalledWith(2, javascript, 'viewModal.examples.javascript');
  });
});

describe('ViewTokenModal token value', () => {
  it('shows the value it was given, masked until revealed, and warns that it is shown only once', () => {
    renderModal();

    const valueInput = screen.getByDisplayValue('•'.repeat(40));
    fireEvent.click(valueInput.parentElement!.querySelector('button')!);
    expect(screen.getByDisplayValue(TOKEN.token!)).toBeInTheDocument();
    expect(screen.getByText('viewModal.descriptions.shownOnce')).toBeInTheDocument();
    expect(screen.queryByText('viewModal.descriptions.valueNotStored')).toBeNull();
  });

  // A token read back from the list has no value: the auth stores a digest.
  it('explains how to get a value and keeps the examples on a placeholder without one', () => {
    vi.stubEnv('VITE_API_URL', '/crm-api');
    const stored = { ...TOKEN, token: undefined };
    const onCopy = vi.fn();
    render(<ViewTokenModal open onOpenChange={vi.fn()} token={stored} onCopy={onCopy} />);

    expect(screen.getByText('viewModal.descriptions.valueNotStored')).toBeInTheDocument();
    expect(screen.queryByText('viewModal.descriptions.shownOnce')).toBeNull();
    exampleValues().forEach(value => {
      expect(value).toContain('Api-Access-Token');
      expect(value).toContain('YOUR_ACCESS_TOKEN');
      expect(value).not.toContain('undefined');
    });
  });

  it('masks the value again when another token is shown', () => {
    const { rerender } = render(<ViewTokenModal open onOpenChange={vi.fn()} token={TOKEN} onCopy={vi.fn()} />);
    const valueInput = screen.getByDisplayValue('•'.repeat(40));
    fireEvent.click(valueInput.parentElement!.querySelector('button')!);
    expect(screen.getByDisplayValue(TOKEN.token!)).toBeInTheDocument();

    const next = { ...TOKEN, id: 'other-id', token: 'b'.repeat(64) };
    rerender(<ViewTokenModal open onOpenChange={vi.fn()} token={next} onCopy={vi.fn()} />);

    expect(screen.queryByDisplayValue(next.token)).toBeNull();
    expect(screen.getByDisplayValue('•'.repeat(40))).toBeInTheDocument();
  });
});

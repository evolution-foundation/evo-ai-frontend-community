/** @vitest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

import ProductsImport from './ProductsImport';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}|${JSON.stringify(opts)}` : key) }),
}));

const canMock = vi.fn();
vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({ can: canMock }),
}));

const bulkProductsMock = vi.fn();
vi.mock('@/services/products/productsService', () => ({
  productsService: {
    bulkProducts: (...args: unknown[]) => bulkProductsMock(...args),
  },
}));

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...a: unknown[]) => toastErrorMock(...a), success: (...a: unknown[]) => toastSuccessMock(...a) },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ProductsImport />
    </MemoryRouter>,
  );
}

function makeCsvFile(content: string, name = 'p.csv'): File {
  const file = new File([content], name, { type: 'text/csv' });
  // JSDOM's Blob#text exists but does not reliably resolve in test envs; force
  // a deterministic implementation that returns the literal content.
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
    configurable: true,
  });
  return file;
}

beforeEach(() => {
  vi.clearAllMocks();
  canMock.mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProductsImport (EVO-1734)', () => {
  it('shows forbidden state when user lacks products.create', () => {
    canMock.mockReturnValue(false);
    renderPage();
    expect(screen.getByText('import.forbidden')).toBeInTheDocument();
  });

  it('renders upload stage by default with a select-file action', () => {
    renderPage();
    expect(screen.getByText('import.upload.selectFile')).toBeInTheDocument();
  });

  it('rejects CSV with duplicated headers and surfaces them in the toast', async () => {
    renderPage();
    const input = screen.getByTestId('csv-file-input') as HTMLInputElement;
    const file = makeCsvFile('name,name\nfoo,bar\n');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    const args = toastErrorMock.mock.calls.at(-1)?.[0] as string;
    expect(args).toContain('import.errors.duplicateHeaders');
    expect(args).toContain('name');
  });

  it('happy path — uploads CSV, advances to mapping with auto-mapped headers', async () => {
    renderPage();
    const input = screen.getByTestId('csv-file-input') as HTMLInputElement;
    const file = makeCsvFile('name,sku\nFoo,SKU-1\nBar,SKU-2\n');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText('import.mapping.csvHeader')).toBeInTheDocument();
    });
    expect(screen.getByText('import.mapping.field')).toBeInTheDocument();
  });

  it('rejects > 500 rows client-side without firing any POST', async () => {
    renderPage();
    const input = screen.getByTestId('csv-file-input') as HTMLInputElement;
    const rows = Array.from({ length: 501 }, (_, i) => `Foo ${i},SKU-${i}`).join('\n');
    const file = makeCsvFile(`name,sku\n${rows}\n`);
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    const args = toastErrorMock.mock.calls.at(-1)?.[0] as string;
    expect(args).toContain('import.errors.tooManyRows');
    expect(bulkProductsMock).not.toHaveBeenCalled();
  });

  it('rejects CSV with empty header cells before the duplicate check', async () => {
    renderPage();
    const input = screen.getByTestId('csv-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(',,sku\n1,2,3\n')] } });
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    const args = toastErrorMock.mock.calls.at(-1)?.[0] as string;
    expect(args).toContain('import.errors.emptyHeader');
    expect(bulkProductsMock).not.toHaveBeenCalled();
  });

  it('submit 422 renders per-row server errors and disables Import until next dry-run', async () => {
    bulkProductsMock
      // dry-run: clean, button enables
      .mockResolvedValueOnce({
        success: true,
        data: { dry_run: true, would_create: [{ index: 0, sku: 'SKU-1', name: 'Foo' }], would_update: [], would_skip: [], errors: [] },
        meta: { created: 1, updated: 0, skipped: 0, errors: 0 },
      })
      // real submit: race condition surfaces unique-violation
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Bulk import failed; no products were created',
              details: [{ index: 0, sku: 'SKU-1', errors: { sku: ['has already been taken'] } }],
            },
          },
        },
      });
    // Spy on `axios.isAxiosError` so the recogniser accepts our plain object as
    // an axios error. Using vi.spyOn (not direct assignment) means
    // restoreAllMocks() in afterEach puts the real function back — no cross-
    // test leakage.
    vi.spyOn(axios, 'isAxiosError').mockImplementation((err: unknown): err is import('axios').AxiosError =>
      typeof err === 'object' && err !== null && (err as { isAxiosError?: boolean }).isAxiosError === true,
    );

    const user = userEvent.setup();
    renderPage();
    fireEvent.change(screen.getByTestId('csv-file-input') as HTMLInputElement, {
      target: { files: [makeCsvFile('name,sku\nFoo,SKU-1\n')] },
    });
    await waitFor(() => screen.getByText('import.mapping.next'));
    await user.click(screen.getByText('import.mapping.next'));
    await waitFor(() => screen.getByText('import.preview.runDryRun'));
    await user.click(screen.getByText('import.preview.runDryRun'));
    await waitFor(() => expect(bulkProductsMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByText('import.preview.import'));
    await waitFor(() => expect(bulkProductsMock).toHaveBeenCalledTimes(2));

    // Server's per-row error must appear in the visible table.
    await waitFor(() => expect(screen.getByText(/has already been taken/i)).toBeInTheDocument());

    // Submit must be disabled now (conflicts > 0) until user re-runs dry-run.
    const importBtn = screen.getByText('import.preview.import').closest('button');
    expect(importBtn).toBeDisabled();
  });

  it('dry-run with errors[] keeps Submit disabled even when the call resolves successfully', async () => {
    bulkProductsMock.mockResolvedValueOnce({
      success: true,
      data: {
        dry_run: true,
        would_create: [],
        would_update: [],
        would_skip: [],
        errors: [{ index: 0, sku: 'SKU-1', errors: { sku: ['has already been taken'] } }],
      },
      meta: { created: 0, updated: 0, skipped: 0, errors: 1 },
    });

    const user = userEvent.setup();
    renderPage();
    fireEvent.change(screen.getByTestId('csv-file-input') as HTMLInputElement, {
      target: { files: [makeCsvFile('name,sku\nFoo,SKU-1\n')] },
    });
    await waitFor(() => screen.getByText('import.mapping.next'));
    await user.click(screen.getByText('import.mapping.next'));
    await waitFor(() => screen.getByText('import.preview.runDryRun'));
    await user.click(screen.getByText('import.preview.runDryRun'));
    await waitFor(() => expect(bulkProductsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/has already been taken/i)).toBeInTheDocument());

    const importBtn = screen.getByText('import.preview.import').closest('button');
    expect(importBtn).toBeDisabled();
  });

  it('happy dry-run + submit path calls bulkProducts twice with expected payloads', async () => {
    bulkProductsMock
      .mockResolvedValueOnce({
        success: true,
        data: { dry_run: true, would_create: [{ index: 0, sku: 'SKU-1', name: 'Foo' }], would_update: [], would_skip: [], errors: [] },
        meta: { created: 1, updated: 0, skipped: 0, errors: 0 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: [{ id: '1' }],
        meta: { created: 1, updated: 0, skipped: 0 },
        message: 'ok',
      });

    const user = userEvent.setup();
    renderPage();
    const input = screen.getByTestId('csv-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile('name,sku\nFoo,SKU-1\n')] } });
    await waitFor(() => screen.getByText('import.mapping.next'));
    await user.click(screen.getByText('import.mapping.next'));

    await waitFor(() => screen.getByText('import.preview.runDryRun'));
    await user.click(screen.getByText('import.preview.runDryRun'));

    await waitFor(() => {
      expect(bulkProductsMock).toHaveBeenCalledWith({
        products: [{ name: 'Foo', sku: 'SKU-1' }],
        dry_run: true,
      });
    });

    const importBtn = screen.getByText('import.preview.import');
    await user.click(importBtn);
    await waitFor(() => {
      expect(bulkProductsMock).toHaveBeenCalledTimes(2);
    });
    expect(bulkProductsMock).toHaveBeenLastCalledWith({ products: [{ name: 'Foo', sku: 'SKU-1' }] });
    expect(toastSuccessMock).toHaveBeenCalled();
  });
});

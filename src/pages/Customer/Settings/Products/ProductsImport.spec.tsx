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
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: canMock }),
}));

const bulkProductsMock = vi.fn();
const importFetchMock = vi.fn();
vi.mock('@/services/products/productsService', () => ({
  productsService: {
    bulkProducts: (...args: unknown[]) => bulkProductsMock(...args),
    importFetch: (...args: unknown[]) => importFetchMock(...args),
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

/** The import now starts on a source-selection step; jump straight to CSV upload. */
async function gotoCsvUpload() {
  fireEvent.click(screen.getByTestId('source-csv'));
  fireEvent.click(screen.getByTestId('source-continue'));
  await screen.findByTestId('csv-file-input');
}

/** Recognise our plain axios-shaped rejection objects as axios errors. */
function stubAxiosErrorDetection() {
  vi.spyOn(axios, 'isAxiosError').mockImplementation((err: unknown): err is import('axios').AxiosError =>
    typeof err === 'object' && err !== null && (err as { isAxiosError?: boolean }).isAxiosError === true,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  canMock.mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProductsImport — source step (EVO-1785)', () => {
  it('shows forbidden state when user lacks products.create', () => {
    canMock.mockReturnValue(false);
    renderPage();
    expect(screen.getByText('import.forbidden')).toBeInTheDocument();
  });

  it('renders the source step by default with the three sources', () => {
    renderPage();
    expect(screen.getByTestId('source-csv')).toBeInTheDocument();
    expect(screen.getByTestId('source-woocommerce')).toBeInTheDocument();
    expect(screen.getByTestId('source-shopify')).toBeInTheDocument();
  });

  it('picking CSV advances to the upload stage', async () => {
    renderPage();
    await gotoCsvUpload();
    expect(screen.getByText('import.upload.selectFile')).toBeInTheDocument();
  });
});

describe('ProductsImport CSV flow (EVO-1734)', () => {
  it('rejects CSV with duplicated headers and surfaces them in the toast', async () => {
    renderPage();
    await gotoCsvUpload();
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
    await gotoCsvUpload();
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
    await gotoCsvUpload();
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
    await gotoCsvUpload();
    const input = screen.getByTestId('csv-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeCsvFile(',,sku\n1,2,3\n')] } });
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    const args = toastErrorMock.mock.calls.at(-1)?.[0] as string;
    expect(args).toContain('import.errors.emptyHeader');
    expect(bulkProductsMock).not.toHaveBeenCalled();
  });

  it('submit 422 renders per-row server errors and disables Import until next dry-run', async () => {
    bulkProductsMock
      .mockResolvedValueOnce({
        success: true,
        data: { dry_run: true, would_create: [{ index: 0, sku: 'SKU-1', name: 'Foo' }], would_update: [], would_skip: [], errors: [] },
        meta: { created: 1, updated: 0, skipped: 0, errors: 0 },
      })
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
    stubAxiosErrorDetection();

    const user = userEvent.setup();
    renderPage();
    await gotoCsvUpload();
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
    await gotoCsvUpload();
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

describe('ProductsImport connector flow (EVO-1785 Phase 2)', () => {
  async function gotoWooCredentials() {
    const user = userEvent.setup();
    renderPage();
    fireEvent.click(screen.getByTestId('source-woocommerce'));
    await user.click(screen.getByTestId('source-continue'));
    await screen.findByTestId('cred-store_url');
    return user;
  }

  it('blocks the fetch (no API call) when credentials are blank', async () => {
    const user = await gotoWooCredentials();
    await user.click(screen.getByTestId('fetch-products'));
    expect(importFetchMock).not.toHaveBeenCalled();
    const args = toastErrorMock.mock.calls.at(-1)?.[0] as string;
    expect(args).toContain('import.credentials.missing');
  });

  it('shows the "how to get keys" help dialog', async () => {
    const user = await gotoWooCredentials();
    await user.click(screen.getByTestId('help-trigger'));
    await waitFor(() => expect(screen.getByText('import.help.woocommerce.title')).toBeInTheDocument());
    expect(screen.getByText('import.help.woocommerce.step1')).toBeInTheDocument();
  });

  it('WooCommerce: fetches, normalizes string price, dry-runs and submits', async () => {
    importFetchMock.mockResolvedValueOnce({
      data: {
        items: [{
          name: 'Widget', sku: 'W-1', default_price: '19.90', status: 'active', kind: 'physical',
          image_urls: ['https://cdn.example.com/w.png'],
        }],
      },
      meta: { source: 'woocommerce', count: 1 },
    });
    bulkProductsMock
      .mockResolvedValueOnce({
        success: true,
        data: { dry_run: true, would_create: [{ index: 0, sku: 'W-1', name: 'Widget' }], would_update: [], would_skip: [], errors: [] },
        meta: { created: 1, updated: 0, skipped: 0, errors: 0 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: [{ id: '1' }],
        meta: { created: 1, updated: 0, skipped: 0 },
        message: 'ok',
      });

    const user = await gotoWooCredentials();
    fireEvent.change(screen.getByTestId('cred-store_url'), { target: { value: 'https://shop.example.com' } });
    fireEvent.change(screen.getByTestId('cred-consumer_key'), { target: { value: 'ck_1' } });
    fireEvent.change(screen.getByTestId('cred-consumer_secret'), { target: { value: 'cs_1' } });
    await user.click(screen.getByTestId('fetch-products'));

    await waitFor(() =>
      expect(importFetchMock).toHaveBeenCalledWith('woocommerce', {
        store_url: 'https://shop.example.com',
        consumer_key: 'ck_1',
        consumer_secret: 'cs_1',
      }),
    );

    await screen.findByText('import.preview.runDryRun');
    await user.click(screen.getByText('import.preview.runDryRun'));
    // String "19.90" must be normalized to the number 19.9 before hitting the bulk API,
    // and image_urls must pass through to the connector import (EVO-2226).
    await waitFor(() =>
      expect(bulkProductsMock).toHaveBeenCalledWith({
        products: [{
          name: 'Widget', sku: 'W-1', default_price: 19.9, status: 'active', kind: 'physical',
          image_urls: ['https://cdn.example.com/w.png'],
        }],
        dry_run: true,
      }),
    );

    await user.click(screen.getByText('import.preview.import'));
    await waitFor(() => expect(bulkProductsMock).toHaveBeenCalledTimes(2));
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it('surfaces a connector error (422) verbatim in the toast, no preview', async () => {
    importFetchMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 422, data: { error: { message: 'WooCommerce responded 401' } } },
    });
    stubAxiosErrorDetection();

    const user = await gotoWooCredentials();
    fireEvent.change(screen.getByTestId('cred-store_url'), { target: { value: 'https://shop.example.com' } });
    fireEvent.change(screen.getByTestId('cred-consumer_key'), { target: { value: 'ck_1' } });
    fireEvent.change(screen.getByTestId('cred-consumer_secret'), { target: { value: 'cs_1' } });
    await user.click(screen.getByTestId('fetch-products'));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    const args = toastErrorMock.mock.calls.at(-1)?.[0] as string;
    expect(args).toContain('import.credentials.fetchFailed');
    expect(args).toContain('WooCommerce responded 401');
    // stayed on credentials — dry-run button never rendered
    expect(screen.queryByText('import.preview.runDryRun')).not.toBeInTheDocument();
  });

  it('shows a toast when the store returns an empty catalog', async () => {
    importFetchMock.mockResolvedValueOnce({ data: { items: [] }, meta: { source: 'woocommerce', count: 0 } });

    const user = await gotoWooCredentials();
    fireEvent.change(screen.getByTestId('cred-store_url'), { target: { value: 'https://shop.example.com' } });
    fireEvent.change(screen.getByTestId('cred-consumer_key'), { target: { value: 'ck_1' } });
    fireEvent.change(screen.getByTestId('cred-consumer_secret'), { target: { value: 'cs_1' } });
    await user.click(screen.getByTestId('fetch-products'));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    const args = toastErrorMock.mock.calls.at(-1)?.[0] as string;
    expect(args).toContain('import.credentials.noProducts');
  });
});

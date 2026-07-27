import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductModal from './ProductModal';
import type { Product } from '@/types/products';

class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);
const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
if (!proto.scrollIntoView) proto.scrollIntoView = () => {};
// jsdom lacks object-URL support used by the Media tab image previews (EVO-2226).
globalThis.URL.createObjectURL = globalThis.URL.createObjectURL ?? (() => 'blob:mock');
globalThis.URL.revokeObjectURL = globalThis.URL.revokeObjectURL ?? (() => {});

const baseProduct = (overrides: Partial<Product>): Product => ({
  id: 'p1',
  name: 'Prod',
  kind: 'physical',
  default_price: 10,
  currency: 'BRL',
  status: 'active',
  variants: [],
  images: [],
  ...overrides,
});

const noop = () => {};
const onSubmit = vi.fn(async () => {});

describe('ProductModal (EVO-1783 Phase 1)', () => {
  it('hides the stock field for digital products (AC4)', () => {
    render(
      <ProductModal open product={baseProduct({ kind: 'digital' })} loading={false} onOpenChange={noop} onSubmit={onSubmit} />,
    );
    expect(document.getElementById('p-stock')).toBeNull();
  });

  it('shows the stock field for physical products (AC4)', () => {
    render(
      <ProductModal open product={baseProduct({ kind: 'physical' })} loading={false} onOpenChange={noop} onSubmit={onSubmit} />,
    );
    expect(document.getElementById('p-stock')).not.toBeNull();
  });

  it('keeps submit clickable and reveals validation instead of a silent disabled button', () => {
    const submitSpy = vi.fn(async () => {});
    render(<ProductModal open product={null} loading={false} onOpenChange={noop} onSubmit={submitSpy} />);
    const button = screen.getByText('actions.create').closest('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(submitSpy).not.toHaveBeenCalled();
    expect(screen.getByText('validation.nameRequired')).toBeTruthy();
    expect(screen.getByText('validation.fixErrors')).toBeTruthy();
  });

  it('EVO-2226 — Media tab picks an image and submits it as a file', async () => {
    const user = userEvent.setup();
    const submitSpy = vi.fn(async () => {});
    render(
      <ProductModal open product={baseProduct({})} loading={false} onOpenChange={noop} onSubmit={submitSpy} />,
    );
    await user.click(screen.getByText('modal.tabs.media'));

    const input = (await screen.findByTestId('product-image-input')) as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('media.pending')).toBeTruthy();

    await user.click(screen.getByText('actions.update').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(submitSpy).toHaveBeenCalled());
    const call = submitSpy.mock.calls.at(-1) as unknown as [unknown, File[] | undefined];
    expect(call[1]).toHaveLength(1);
    expect(call[1]![0].name).toBe('photo.png');
  });

  it('EVO-2226 — non-image files are ignored by the picker', async () => {
    const user = userEvent.setup();
    render(<ProductModal open product={baseProduct({})} loading={false} onOpenChange={noop} onSubmit={onSubmit} />);
    await user.click(screen.getByText('modal.tabs.media'));
    const input = (await screen.findByTestId('product-image-input')) as HTMLInputElement;
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [pdf] } });
    expect(screen.queryByText('media.pending')).toBeNull();
  });

  // EVO-2226 review (M4): the hint told users to drag files onto the zone, but
  // nothing handled the drop — only the button worked.
  it('EVO-2226 — accepts an image dropped on the zone', async () => {
    const user = userEvent.setup();
    render(<ProductModal open product={baseProduct({})} loading={false} onOpenChange={noop} onSubmit={onSubmit} />);
    await user.click(screen.getByText('modal.tabs.media'));

    const zone = await screen.findByTestId('product-image-dropzone');
    const file = new File([new Uint8Array([1, 2, 3])], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(await screen.findByText('media.pending')).toBeTruthy();
  });

  // EVO-2226 review (M2): a refused file used to disappear without a word — the
  // product saved and the image simply was not there.
  it('EVO-2226 — explains why a non-image file was refused', async () => {
    const user = userEvent.setup();
    render(<ProductModal open product={baseProduct({})} loading={false} onOpenChange={noop} onSubmit={onSubmit} />);
    await user.click(screen.getByText('modal.tabs.media'));

    const input = (await screen.findByTestId('product-image-input')) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] } });

    expect(await screen.findByTestId('product-image-rejections')).toBeTruthy();
    expect(screen.getByText('media.rejected.invalidType')).toBeTruthy();
    expect(screen.queryByText('media.pending')).toBeNull();
  });

  it('EVO-2226 — refuses a file over the size cap', async () => {
    const user = userEvent.setup();
    render(<ProductModal open product={baseProduct({})} loading={false} onOpenChange={noop} onSubmit={onSubmit} />);
    await user.click(screen.getByText('modal.tabs.media'));

    const input = (await screen.findByTestId('product-image-input')) as HTMLInputElement;
    const huge = new File([new Uint8Array(1)], 'huge.png', { type: 'image/png' });
    Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [huge] } });

    expect(await screen.findByText('media.rejected.tooLarge')).toBeTruthy();
    expect(screen.queryByText('media.pending')).toBeNull();
  });

  // EVO-2226 review (M1): the manual path had no quantity cap at all.
  it('EVO-2226 — stops at the per-product image ceiling', async () => {
    const user = userEvent.setup();
    render(<ProductModal open product={baseProduct({})} loading={false} onOpenChange={noop} onSubmit={onSubmit} />);
    await user.click(screen.getByText('modal.tabs.media'));

    const input = (await screen.findByTestId('product-image-input')) as HTMLInputElement;
    const files = Array.from(
      { length: 12 },
      (_, i) => new File([new Uint8Array([1])], `p${i}.png`, { type: 'image/png' }),
    );
    fireEvent.change(input, { target: { files } });

    // 12 picked, 10 fit — the surplus is named, not swallowed.
    expect(await screen.findAllByText('media.rejected.tooMany')).toHaveLength(2);
    expect(screen.getAllByRole('img').length).toBe(10);
  });

  it('renders a server field error inline (AC4 — SKU uniqueness)', () => {
    render(
      <ProductModal
        open
        product={baseProduct({})}
        loading={false}
        errors={{ sku: 'has already been taken' }}
        onOpenChange={noop}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText('has already been taken')).toBeTruthy();
  });

  it('keeps an empty price as null (not 0) and blocks submit (AC3)', () => {
    const submitSpy = vi.fn(async () => {});
    render(<ProductModal open product={null} loading={false} onOpenChange={noop} onSubmit={submitSpy} />);
    fireEvent.change(document.getElementById('p-name') as HTMLInputElement, { target: { value: 'X' } });
    const priceInput = document.getElementById('p-price') as HTMLInputElement;
    expect(priceInput.value).toBe('');
    fireEvent.click(screen.getByText('actions.create').closest('button') as HTMLButtonElement);
    expect(submitSpy).not.toHaveBeenCalled();
    expect(screen.getByText('validation.priceRequired')).toBeTruthy();
  });
});

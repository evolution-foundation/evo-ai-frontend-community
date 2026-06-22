import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('disables submit when required fields are empty on create', () => {
    render(<ProductModal open product={null} loading={false} onOpenChange={noop} onSubmit={onSubmit} />);
    const button = screen.getByText('actions.create').closest('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
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
});

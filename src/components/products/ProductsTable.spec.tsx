import { describe, it, expect } from 'vitest';
import { stockInfo } from './productStock';
import type { Product, ProductVariant } from '@/types/products';

const product = (o: Partial<Product>): Product => ({
  id: '1',
  name: 'n',
  kind: 'physical',
  default_price: 0,
  currency: 'BRL',
  status: 'active',
  variants: [],
  images: [],
  ...o,
});

const variant = (stock: number | null): ProductVariant => ({
  id: `v-${stock}`,
  product_id: '1',
  name: 'V',
  stock_quantity: stock,
  position: 0,
});

describe('stockInfo (EVO-1783 stock column)', () => {
  it('digital products have no stock concept (null)', () => {
    expect(stockInfo(product({ kind: 'digital', stock_quantity: 5 }))).toBeNull();
  });

  it('physical simple product returns its stock_quantity', () => {
    expect(stockInfo(product({ stock_quantity: 7 }))).toBe(7);
  });

  it('physical with untracked stock is null (not zero)', () => {
    expect(stockInfo(product({ stock_quantity: null }))).toBeNull();
  });

  it('physical zero stock returns 0 (out of stock)', () => {
    expect(stockInfo(product({ stock_quantity: 0 }))).toBe(0);
  });

  it('physical with variants sums the per-variant stock', () => {
    expect(stockInfo(product({ stock_quantity: null, variants: [variant(3), variant(4)] }))).toBe(7);
  });

  it('physical with variants but none tracked is null', () => {
    expect(stockInfo(product({ variants: [variant(null)] }))).toBeNull();
  });
});

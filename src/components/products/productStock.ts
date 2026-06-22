import type { Product } from '@/types/products';

// Catalog-row stock: null = not applicable (digital) or untracked (no value set);
// a number (0 = out of stock) otherwise. Physical products with variants sum the
// per-variant stock, since product-level stock is usually unset in that case.
export function stockInfo(product: Product): number | null {
  if (product.kind !== 'physical') return null;
  const variants = product.variants ?? [];
  if (variants.length > 0) {
    const tracked = variants.filter((v) => v.stock_quantity != null);
    if (tracked.length === 0) return null;
    return tracked.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0);
  }
  return product.stock_quantity ?? null;
}
